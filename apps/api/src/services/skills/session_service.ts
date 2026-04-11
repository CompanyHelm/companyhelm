import { and, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import { agentSessionActiveSkills, agentSessions, skills } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import type { SkillRecord } from "./service.ts";

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
    values(value: Record<string, unknown>): Promise<unknown>;
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
  skillId: string;
};

/**
 * Owns the session-scoped active skill set that PI Mono tools can mutate without changing the
 * broader company skill catalog or the agent-level default skill attachments.
 */
@injectable()
export class SessionSkillService {
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
      const skill = await this.requireSkillByName(selectableDatabase, input.companyId, skillName);
      const [existingActivation] = await selectableDatabase
        .select({
          skillId: agentSessionActiveSkills.skillId,
        })
        .from(agentSessionActiveSkills)
        .where(and(
          eq(agentSessionActiveSkills.companyId, input.companyId),
          eq(agentSessionActiveSkills.sessionId, input.sessionId),
          eq(agentSessionActiveSkills.skillId, skill.id),
        )) as SkillIdRecord[];
      if (!existingActivation) {
        await insertableDatabase
          .insert(agentSessionActiveSkills)
          .values({
            activatedAt: new Date(),
            companyId: input.companyId,
            sessionId: input.sessionId,
            skillId: skill.id,
          });
      }

      return {
        inserted: !existingActivation,
        skill,
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
        })
        .from(agentSessionActiveSkills)
        .where(and(
          eq(agentSessionActiveSkills.companyId, companyId),
          eq(agentSessionActiveSkills.sessionId, sessionId),
        )) as SkillIdRecord[];
      if (activeSkillIds.length === 0) {
        return [];
      }

      const activeSkills = await selectableDatabase
        .select(this.skillSelection())
        .from(skills)
        .where(and(
          eq(skills.companyId, companyId),
          inArray(skills.id, activeSkillIds.map((activeSkill) => activeSkill.skillId)),
        )) as SkillRecord[];

      return [...activeSkills].sort((left, right) => left.name.localeCompare(right.name));
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

  private async requireSkillByName(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    skillName: string,
  ): Promise<SkillRecord> {
    const [skill] = await selectableDatabase
      .select(this.skillSelection())
      .from(skills)
      .where(and(
        eq(skills.companyId, companyId),
        eq(skills.name, skillName),
      )) as SkillRecord[];
    if (!skill) {
      throw new Error(`Skill ${skillName} not found.`);
    }

    return skill;
  }

  private skillSelection() {
    return {
      companyId: skills.companyId,
      description: skills.description,
      fileList: skills.fileList,
      githubBranchName: skills.githubBranchName,
      githubTrackedCommitSha: skills.githubTrackedCommitSha,
      id: skills.id,
      instructions: skills.instructions,
      name: skills.name,
      repository: skills.repository,
      skillDirectory: skills.skillDirectory,
      skillGroupId: skills.skillGroupId,
    };
  }
}
