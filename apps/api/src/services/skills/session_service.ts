import { and, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import { agentSessionActiveSkills, agentSessions, skills } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import type { SkillRecord } from "./service.ts";
import { SystemSkillRegistry } from "./system_registry.ts";

export type SessionSkillActivationRecord = {
  inserted: boolean;
  skill: SkillRecord;
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown>;
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      onConflictDoNothing(): Promise<unknown>;
    };
  };
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type SessionRecord = {
  id: string;
};

type SkillIdRecord = {
  skillId: string | null;
  systemSkillKey: string | null;
};

/**
 * Owns the session-scoped active skill set that PI Mono tools can mutate without changing the
 * broader company skill catalog or the agent-level default skill attachments.
 */
@injectable()
export class SessionSkillService {
  private readonly systemSkillRegistry: SystemSkillRegistry;

  constructor(systemSkillRegistry: SystemSkillRegistry = new SystemSkillRegistry()) {
    this.systemSkillRegistry = systemSkillRegistry;
  }

  async activateSkill(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      sessionId: string;
      skillName: string;
    },
  ): Promise<SessionSkillActivationRecord> {
    const skillName = this.requireNonEmptyValue(input.skillName, "Skill name");

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      await this.requireSession(selectableDatabase, input.companyId, input.sessionId);
      const customSkill = await this.findSkillByName(selectableDatabase, input.companyId, skillName);
      if (!customSkill) {
        return this.activateSystemSkill(selectableDatabase, insertableDatabase, input.companyId, input.sessionId, skillName);
      }

      const [existingActivation] = await selectableDatabase
        .select({
          skillId: agentSessionActiveSkills.skillId,
          systemSkillKey: agentSessionActiveSkills.systemSkillKey,
        })
        .from(agentSessionActiveSkills)
        .where(and(
          eq(agentSessionActiveSkills.companyId, input.companyId),
          eq(agentSessionActiveSkills.sessionId, input.sessionId),
          eq(agentSessionActiveSkills.skillId, customSkill.id),
        )) as SkillIdRecord[];
      if (!existingActivation) {
        await insertableDatabase
          .insert(agentSessionActiveSkills)
          .values({
            activatedAt: new Date(),
            companyId: input.companyId,
            sessionId: input.sessionId,
            skillId: customSkill.id,
            systemSkillKey: null,
          })
          .onConflictDoNothing();
      }

      return {
        inserted: !existingActivation,
        skill: customSkill,
      };
    });
  }

  async deactivateSkill(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      sessionId: string;
      skillId: string;
    },
  ): Promise<void> {
    await transactionProvider.transaction(async (tx) => {
      const deletableDatabase = tx as DeletableDatabase;
      if (this.systemSkillRegistry.isSystemSkillId(input.skillId)) {
        const systemSkillKey = this.systemSkillRegistry.parseSystemSkillId(input.skillId);
        await deletableDatabase
          .delete(agentSessionActiveSkills)
          .where(and(
            eq(agentSessionActiveSkills.companyId, input.companyId),
            eq(agentSessionActiveSkills.sessionId, input.sessionId),
            eq(agentSessionActiveSkills.systemSkillKey, systemSkillKey),
          ));
        return;
      }

      await deletableDatabase
        .delete(agentSessionActiveSkills)
        .where(and(
          eq(agentSessionActiveSkills.companyId, input.companyId),
          eq(agentSessionActiveSkills.sessionId, input.sessionId),
          eq(agentSessionActiveSkills.skillId, input.skillId),
        ));
    });
  }

  async listActiveSkills(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<SkillRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      await this.requireSession(selectableDatabase, companyId, sessionId);
      const activeSkillIds = await selectableDatabase
        .select({
          skillId: agentSessionActiveSkills.skillId,
          systemSkillKey: agentSessionActiveSkills.systemSkillKey,
        })
        .from(agentSessionActiveSkills)
        .where(and(
          eq(agentSessionActiveSkills.companyId, companyId),
          eq(agentSessionActiveSkills.sessionId, sessionId),
        )) as SkillIdRecord[];
      if (activeSkillIds.length === 0) {
        return [];
      }

      const customSkillIds = activeSkillIds.flatMap((activeSkill) => activeSkill.skillId ? [activeSkill.skillId] : []);
      const systemSkillKeys = activeSkillIds.flatMap((activeSkill) => activeSkill.systemSkillKey ? [activeSkill.systemSkillKey] : []);
      const systemSkills = this.systemSkillRegistry.listSkillsByKeys(companyId, systemSkillKeys);
      if (customSkillIds.length === 0) {
        return systemSkills;
      }

      const activeSkills = await selectableDatabase
        .select(this.skillSelection())
        .from(skills)
        .where(and(
          eq(skills.companyId, companyId),
          inArray(skills.id, customSkillIds),
        )) as SkillRecord[];

      return [...systemSkills, ...activeSkills.map((skill) => this.toCustomSkillRecord(skill))]
        .sort((left, right) => left.name.localeCompare(right.name));
    });
  }

  async isSystemSkillActive(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      sessionId: string;
      systemSkillKey: string;
    },
  ): Promise<boolean> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      await this.requireSession(selectableDatabase, input.companyId, input.sessionId);
      const [activeSkill] = await selectableDatabase
        .select({
          systemSkillKey: agentSessionActiveSkills.systemSkillKey,
        })
        .from(agentSessionActiveSkills)
        .where(and(
          eq(agentSessionActiveSkills.companyId, input.companyId),
          eq(agentSessionActiveSkills.sessionId, input.sessionId),
          eq(agentSessionActiveSkills.systemSkillKey, input.systemSkillKey),
        )) as Array<{ systemSkillKey: string }>;

      return Boolean(activeSkill);
    });
  }

  private requireNonEmptyValue(value: string | null, label: string): string {
    const normalizedValue = value?.trim() ?? "";
    if (normalizedValue.length === 0) {
      throw new Error(`${label} is required.`);
    }

    return normalizedValue;
  }

  private async requireSession(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    sessionId: string,
  ): Promise<SessionRecord> {
    const [session] = await selectableDatabase
      .select({
        id: agentSessions.id,
      })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.companyId, companyId),
        eq(agentSessions.id, sessionId),
      )) as SessionRecord[];
    if (!session) {
      throw new Error("Session not found.");
    }

    return session;
  }

  private async findSkillByName(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    skillName: string,
  ): Promise<SkillRecord | null> {
    const [skill] = await selectableDatabase
      .select(this.skillSelection())
      .from(skills)
      .where(and(
        eq(skills.companyId, companyId),
        eq(skills.name, skillName),
      )) as SkillRecord[];
    return skill ? this.toCustomSkillRecord(skill) : null;
  }

  private async activateSystemSkill(
    selectableDatabase: SelectableDatabase,
    insertableDatabase: InsertableDatabase,
    companyId: string,
    sessionId: string,
    skillName: string,
  ): Promise<SessionSkillActivationRecord> {
    const systemSkill = this.systemSkillRegistry.findSkillByName(companyId, skillName);
    if (!systemSkill || !systemSkill.systemKey) {
      throw new Error(`Skill ${skillName} not found.`);
    }

    const [existingActivation] = await selectableDatabase
      .select({
        skillId: agentSessionActiveSkills.skillId,
        systemSkillKey: agentSessionActiveSkills.systemSkillKey,
      })
      .from(agentSessionActiveSkills)
      .where(and(
        eq(agentSessionActiveSkills.companyId, companyId),
        eq(agentSessionActiveSkills.sessionId, sessionId),
        eq(agentSessionActiveSkills.systemSkillKey, systemSkill.systemKey),
      )) as SkillIdRecord[];
    if (!existingActivation) {
      await insertableDatabase
        .insert(agentSessionActiveSkills)
        .values({
          activatedAt: new Date(),
          companyId,
          sessionId,
          skillId: null,
          systemSkillKey: systemSkill.systemKey,
        })
        .onConflictDoNothing();
    }

    return {
      inserted: !existingActivation,
      skill: systemSkill,
    };
  }

  private toCustomSkillRecord(skill: SkillRecord): SkillRecord {
    return {
      ...skill,
      skillType: "custom",
      systemCommands: [],
      systemKey: null,
    };
  }

  private skillSelection() {
    return {
      companyId: skills.companyId,
      description: skills.description,
      fileList: skills.fileList,
      branchName: skills.branchName,
      trackedCommitSha: skills.trackedCommitSha,
      id: skills.id,
      instructions: skills.instructions,
      name: skills.name,
      repository: skills.repository,
      skillDirectory: skills.skillDirectory,
      skillGroupId: skills.skillGroupId,
    };
  }
}
