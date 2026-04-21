import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { injectable } from "inversify";
import { agentSkillGroups, agentSkills, agents, githubRepositories, skill_groups, skills } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import type { SystemCommandDefinition } from "./system_command_catalog.ts";
import { SystemSkillRegistry } from "./system_registry.ts";

export type SkillType = "custom" | "system";
export type SkillSourceType = "manual" | "public_git" | "github_installation";

export type SkillRecord = {
  companyId: string;
  description: string;
  fileList: string[];
  branchName: string | null;
  trackedCommitSha: string | null;
  githubRepositoryId: string | null;
  githubRepositoryInstallationId?: number | null;
  id: string;
  instructions: string;
  name: string;
  repository: string | null;
  skillDirectory: string | null;
  skillGroupId: string | null;
  sourceType: SkillSourceType;
  skillType?: SkillType;
  systemCommands?: SystemCommandDefinition[];
  systemKey?: string | null;
};

export type SkillGroupRecord = {
  companyId: string;
  id: string;
  name: string;
};

type AgentRecord = {
  id: string;
};

type AgentSkillAttachmentRecord = {
  skillId: string | null;
  systemSkillKey: string | null;
};

type AgentSkillGroupAttachmentRecord = {
  skillGroupId: string | null;
  systemSkillGroupKey: string | null;
};

type GithubRepositoryRecord = {
  fullName: string;
  id: string;
  installationId: number;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): {
        returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
      };
    };
  };
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): {
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Owns the company skill catalog plus agent-level skill and skill-group attachments so GraphQL
 * can stay thin and only coordinate transport concerns.
 */
@injectable()
export class SkillService {
  private readonly systemSkillRegistry: SystemSkillRegistry;

  constructor(systemSkillRegistry: SystemSkillRegistry = new SystemSkillRegistry()) {
    this.systemSkillRegistry = systemSkillRegistry;
  }

  async createSkillGroup(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      name: string;
    },
  ): Promise<SkillGroupRecord> {
    const name = this.requireNonEmptyValue(input.name, "Skill group name");

    return transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const [createdGroup] = await insertableDatabase
        .insert(skill_groups)
        .values({
          companyId: input.companyId,
          name,
        })
        .returning?.(this.skillGroupSelection()) as SkillGroupRecord[];

      if (!createdGroup) {
        throw new Error("Failed to create skill group.");
      }

      return createdGroup;
    });
  }

  async updateSkillGroup(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      name?: string | null;
      skillGroupId: string;
    },
  ): Promise<SkillGroupRecord> {
    if (this.systemSkillRegistry.isSystemSkillGroupId(input.skillGroupId)) {
      throw new Error("System skill group cannot be edited.");
    }

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const existingGroup = await this.requireSkillGroup(selectableDatabase, input.companyId, input.skillGroupId);
      const [updatedGroup] = await updatableDatabase
        .update(skill_groups)
        .set({
          name: input.name === undefined
            ? existingGroup.name
            : this.requireNonEmptyValue(input.name, "Skill group name"),
        })
        .where(and(
          eq(skill_groups.companyId, input.companyId),
          eq(skill_groups.id, input.skillGroupId),
        ))
        .returning?.(this.skillGroupSelection()) as SkillGroupRecord[];

      if (!updatedGroup) {
        throw new Error("Failed to update skill group.");
      }

      return updatedGroup;
    });
  }

  async createSkill(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      description: string;
      instructions: string;
      name: string;
      skillGroupId?: string | null;
    },
  ): Promise<SkillRecord> {
    const name = this.requireNonEmptyValue(input.name, "Skill name");
    const description = this.requireNonEmptyValue(input.description, "Skill description");
    const instructions = this.requireNonEmptyValue(input.instructions, "Skill instructions");

    return transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const selectableDatabase = tx as SelectableDatabase;
      const skillGroupId = input.skillGroupId === undefined
        ? null
        : await this.requireSkillGroupId(selectableDatabase, input.companyId, input.skillGroupId);
      const [createdSkill] = await insertableDatabase
        .insert(skills)
        .values({
          companyId: input.companyId,
          description,
          fileList: [],
          branchName: null,
          githubRepositoryId: null,
          trackedCommitSha: null,
          instructions,
          name,
          repository: null,
          skillDirectory: null,
          skillGroupId,
          sourceType: "manual",
        })
        .returning?.(this.skillSelection()) as SkillRecord[];

      if (!createdSkill) {
        throw new Error("Failed to create skill.");
      }

      return this.toCustomSkillRecord(createdSkill);
    });
  }

  async createGithubSkill(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      description: string;
      fileList: string[];
      branchName?: string | null;
      trackedCommitSha?: string | null;
      instructions: string;
      name: string;
      repository: string;
      skillDirectory: string;
      skillGroupId?: string | null;
    },
  ): Promise<SkillRecord> {
    const name = this.requireNonEmptyValue(input.name, "Skill name");
    const description = this.requireNonEmptyValue(input.description, "Skill description");
    const instructions = this.requireNonEmptyValue(input.instructions, "Skill instructions");
    const repository = this.requireNonEmptyValue(input.repository, "Git repository");
    const skillDirectory = this.requireNonEmptyValue(input.skillDirectory, "Git skill directory");
    const branchName = input.branchName === undefined || input.branchName === null
      ? null
      : this.requireNonEmptyValue(input.branchName, "Git branch name");
    const trackedCommitSha = this.resolveTrackedCommitSha(input.fileList, input.trackedCommitSha);

    return transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const selectableDatabase = tx as SelectableDatabase;
      const skillGroupId = input.skillGroupId === undefined
        ? null
        : await this.requireSkillGroupId(selectableDatabase, input.companyId, input.skillGroupId);
      const [createdSkill] = await insertableDatabase
        .insert(skills)
        .values({
          companyId: input.companyId,
          description,
          fileList: [...input.fileList],
          branchName,
          githubRepositoryId: null,
          trackedCommitSha,
          instructions,
          name,
          repository,
          skillDirectory,
          skillGroupId,
          sourceType: "public_git",
        })
        .returning?.(this.skillSelection()) as SkillRecord[];

      if (!createdSkill) {
        throw new Error("Failed to import Git skill.");
      }

      return this.toCustomSkillRecord(createdSkill);
    });
  }

  async getSkill(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    skillId: string,
  ): Promise<SkillRecord> {
    if (this.systemSkillRegistry.isSystemSkillId(skillId)) {
      return this.systemSkillRegistry.requireSkillById(companyId, skillId);
    }

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return this.requireSkill(selectableDatabase, companyId, skillId);
    });
  }

  async listSkillGroups(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<SkillGroupRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const records = await selectableDatabase
        .select(this.skillGroupSelection())
        .from(skill_groups)
        .where(eq(skill_groups.companyId, companyId)) as SkillGroupRecord[];

      return [
        ...[...records].sort((left, right) => left.name.localeCompare(right.name)),
        this.systemSkillRegistry.getSystemSkillGroup(companyId),
      ];
    });
  }

  async listSkills(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<SkillRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const records = await selectableDatabase
        .select(this.skillSelection())
        .from(skills)
        .where(eq(skills.companyId, companyId)) as SkillRecord[];

      const customSkills = records
        .map((record) => this.toCustomSkillRecord(record))
        .sort((left, right) => left.name.localeCompare(right.name));
      const hydratedCustomSkills = await this.hydrateSkillRepositories(selectableDatabase, customSkills);

      return [
        ...hydratedCustomSkills,
        ...this.systemSkillRegistry
          .listSkills(companyId)
          .sort((left, right) => left.name.localeCompare(right.name)),
      ];
    });
  }

  async listAgentSkillGroups(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
  ): Promise<SkillGroupRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      await this.requireAgent(selectableDatabase, companyId, agentId);
      const attachments = await selectableDatabase
        .select({
          skillGroupId: agentSkillGroups.skillGroupId,
          systemSkillGroupKey: agentSkillGroups.systemSkillGroupKey,
        })
        .from(agentSkillGroups)
        .where(and(
          eq(agentSkillGroups.companyId, companyId),
          eq(agentSkillGroups.agentId, agentId),
        )) as AgentSkillGroupAttachmentRecord[];

      const customGroups = await this.listSkillGroupsByIds(
        selectableDatabase,
        companyId,
        attachments.flatMap((attachment) => attachment.skillGroupId ? [attachment.skillGroupId] : []),
      );
      const systemGroups = attachments.some((attachment) => {
        return attachment.systemSkillGroupKey
          && this.systemSkillRegistry.isSystemSkillGroupId(attachment.systemSkillGroupKey);
      })
        ? [this.systemSkillRegistry.getSystemSkillGroup(companyId)]
        : [];

      return [...customGroups, ...systemGroups];
    });
  }

  async listAgentSkills(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
  ): Promise<SkillRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      await this.requireAgent(selectableDatabase, companyId, agentId);
      const attachments = await selectableDatabase
        .select({
          skillId: agentSkills.skillId,
          systemSkillKey: agentSkills.systemSkillKey,
        })
        .from(agentSkills)
        .where(and(
          eq(agentSkills.companyId, companyId),
          eq(agentSkills.agentId, agentId),
        )) as AgentSkillAttachmentRecord[];

      const customSkills = await this.listSkillsByIds(
        selectableDatabase,
        companyId,
        attachments.flatMap((attachment) => attachment.skillId ? [attachment.skillId] : []),
      );
      const systemSkills = this.systemSkillRegistry.listSkillsByKeys(
        companyId,
        attachments.flatMap((attachment) => attachment.systemSkillKey ? [attachment.systemSkillKey] : []),
      );

      return [...systemSkills, ...customSkills].sort((left, right) => left.name.localeCompare(right.name));
    });
  }

  async listAgentAvailableSkills(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
  ): Promise<SkillRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      await this.requireAgent(selectableDatabase, companyId, agentId);
      const skillAttachments = await selectableDatabase
        .select({
          skillId: agentSkills.skillId,
          systemSkillKey: agentSkills.systemSkillKey,
        })
        .from(agentSkills)
        .where(and(
          eq(agentSkills.companyId, companyId),
          eq(agentSkills.agentId, agentId),
        )) as AgentSkillAttachmentRecord[];
      const groupAttachments = await selectableDatabase
        .select({
          skillGroupId: agentSkillGroups.skillGroupId,
        })
        .from(agentSkillGroups)
        .where(and(
          eq(agentSkillGroups.companyId, companyId),
          eq(agentSkillGroups.agentId, agentId),
        )) as Array<{ skillGroupId: string }>;

      const customSkills = await this.listAgentAvailableCustomSkills(
        selectableDatabase,
        companyId,
        skillAttachments.flatMap((attachment) => attachment.skillId ? [attachment.skillId] : []),
        groupAttachments.map((attachment) => attachment.skillGroupId),
      );
      const systemSkills = this.systemSkillRegistry.listSkillsByKeys(
        companyId,
        skillAttachments.flatMap((attachment) => attachment.systemSkillKey ? [attachment.systemSkillKey] : []),
      );

      return [...systemSkills, ...customSkills].sort((left, right) => left.name.localeCompare(right.name));
    });
  }

  async deleteSkillGroup(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      skillGroupId: string;
    },
  ): Promise<SkillGroupRecord> {
    if (this.systemSkillRegistry.isSystemSkillGroupId(input.skillGroupId)) {
      throw new Error("System skill group cannot be deleted.");
    }

    return transactionProvider.transaction(async (tx) => {
      const deletableDatabase = tx as DeletableDatabase;
      const [deletedGroup] = await deletableDatabase
        .delete(skill_groups)
        .where(and(
          eq(skill_groups.companyId, input.companyId),
          eq(skill_groups.id, input.skillGroupId),
        ))
        .returning?.(this.skillGroupSelection()) as SkillGroupRecord[];

      if (!deletedGroup) {
        throw new Error("Skill group not found.");
      }

      return deletedGroup;
    });
  }

  async deleteSkill(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      skillId: string;
    },
  ): Promise<SkillRecord> {
    if (this.systemSkillRegistry.isSystemSkillId(input.skillId)) {
      throw new Error("System skills cannot be deleted.");
    }

    return transactionProvider.transaction(async (tx) => {
      const deletableDatabase = tx as DeletableDatabase;
      const [deletedSkill] = await deletableDatabase
        .delete(skills)
        .where(and(
          eq(skills.companyId, input.companyId),
          eq(skills.id, input.skillId),
        ))
        .returning?.(this.skillSelection()) as SkillRecord[];

      if (!deletedSkill) {
        throw new Error("Skill not found.");
      }

      return this.toCustomSkillRecord(deletedSkill);
    });
  }

  async attachSkillGroupToAgent(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      skillGroupId: string;
      userId: string | null;
    },
  ): Promise<SkillGroupRecord> {
    if (this.systemSkillRegistry.isSystemSkillGroupId(input.skillGroupId)) {
      return this.attachSystemSkillGroupToAgent(transactionProvider, input);
    }

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      await this.requireAgent(selectableDatabase, input.companyId, input.agentId);
      const group = await this.requireSkillGroup(selectableDatabase, input.companyId, input.skillGroupId);
      const existingAttachment = await selectableDatabase
        .select({
          skillGroupId: agentSkillGroups.skillGroupId,
        })
        .from(agentSkillGroups)
        .where(and(
          eq(agentSkillGroups.companyId, input.companyId),
          eq(agentSkillGroups.agentId, input.agentId),
          eq(agentSkillGroups.skillGroupId, input.skillGroupId),
        )) as Array<{ skillGroupId: string }>;

      if (existingAttachment.length === 0) {
        await insertableDatabase
          .insert(agentSkillGroups)
          .values({
            agentId: input.agentId,
            companyId: input.companyId,
            createdAt: new Date(),
            createdByUserId: input.userId,
            skillGroupId: input.skillGroupId,
            systemSkillGroupKey: null,
          });
      }

      return group;
    });
  }

  async attachSkillToAgent(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      skillId: string;
      userId: string | null;
    },
  ): Promise<SkillRecord> {
    if (this.systemSkillRegistry.isSystemSkillId(input.skillId)) {
      return this.attachSystemSkillToAgent(transactionProvider, input);
    }

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      await this.requireAgent(selectableDatabase, input.companyId, input.agentId);
      const skill = await this.requireSkill(selectableDatabase, input.companyId, input.skillId);
      const existingAttachment = await selectableDatabase
        .select({
          skillId: agentSkills.skillId,
        })
        .from(agentSkills)
        .where(and(
          eq(agentSkills.companyId, input.companyId),
          eq(agentSkills.agentId, input.agentId),
          eq(agentSkills.skillId, input.skillId),
        )) as Array<{ skillId: string }>;

      if (existingAttachment.length === 0) {
        await insertableDatabase
          .insert(agentSkills)
          .values({
            agentId: input.agentId,
            companyId: input.companyId,
            createdAt: new Date(),
            createdByUserId: input.userId,
            skillId: input.skillId,
            systemSkillKey: null,
          });
      }

      return skill;
    });
  }

  async updateSkill(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      description?: string | null;
      instructions?: string | null;
      name?: string | null;
      skillGroupId?: string | null;
      skillId: string;
    },
  ): Promise<SkillRecord> {
    if (this.systemSkillRegistry.isSystemSkillId(input.skillId)) {
      throw new Error("System skills cannot be edited.");
    }

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const existingSkill = await this.requireSkill(selectableDatabase, input.companyId, input.skillId);
      const nextSkillGroupId = input.skillGroupId === undefined
        ? existingSkill.skillGroupId
        : await this.requireSkillGroupId(selectableDatabase, input.companyId, input.skillGroupId);
      const [updatedSkill] = await updatableDatabase
        .update(skills)
        .set({
          description: input.description === undefined
            ? existingSkill.description
            : this.requireNonEmptyValue(input.description, "Skill description"),
          instructions: input.instructions === undefined
            ? existingSkill.instructions
            : this.requireNonEmptyValue(input.instructions, "Skill instructions"),
          name: input.name === undefined
            ? existingSkill.name
            : this.requireNonEmptyValue(input.name, "Skill name"),
          skillGroupId: nextSkillGroupId,
        })
        .where(and(
          eq(skills.companyId, input.companyId),
          eq(skills.id, input.skillId),
        ))
        .returning?.(this.skillSelection()) as SkillRecord[];

      if (!updatedSkill) {
        throw new Error("Failed to update skill.");
      }

      return this.toCustomSkillRecord(updatedSkill);
    });
  }

  async detachSkillGroupFromAgent(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    skillGroupId: string,
  ): Promise<SkillGroupRecord> {
    if (this.systemSkillRegistry.isSystemSkillGroupId(skillGroupId)) {
      return this.detachSystemSkillGroupFromAgent(transactionProvider, companyId, agentId, skillGroupId);
    }

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      await this.requireAgent(selectableDatabase, companyId, agentId);
      const group = await this.requireSkillGroup(selectableDatabase, companyId, skillGroupId);
      const [deletedAttachment] = await deletableDatabase
        .delete(agentSkillGroups)
        .where(and(
          eq(agentSkillGroups.companyId, companyId),
          eq(agentSkillGroups.agentId, agentId),
          eq(agentSkillGroups.skillGroupId, skillGroupId),
        ))
        .returning?.({
          skillGroupId: agentSkillGroups.skillGroupId,
        }) as Array<{ skillGroupId: string }>;

      if (!deletedAttachment) {
        throw new Error("Skill group is not attached to the agent.");
      }

      return group;
    });
  }

  async detachSkillFromAgent(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    skillId: string,
  ): Promise<SkillRecord> {
    if (this.systemSkillRegistry.isSystemSkillId(skillId)) {
      return this.detachSystemSkillFromAgent(transactionProvider, companyId, agentId, skillId);
    }

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      await this.requireAgent(selectableDatabase, companyId, agentId);
      const skill = await this.requireSkill(selectableDatabase, companyId, skillId);
      const [deletedAttachment] = await deletableDatabase
        .delete(agentSkills)
        .where(and(
          eq(agentSkills.companyId, companyId),
          eq(agentSkills.agentId, agentId),
          eq(agentSkills.skillId, skillId),
          isNull(agentSkills.systemSkillKey),
        ))
        .returning?.({
          skillId: agentSkills.skillId,
        }) as Array<{ skillId: string }>;

      if (!deletedAttachment) {
        throw new Error("Skill is not attached to the agent.");
      }

      return skill;
    });
  }

  private requireNonEmptyValue(value: string | null, label: string): string {
    const normalizedValue = value?.trim() ?? "";
    if (normalizedValue.length === 0) {
      throw new Error(`${label} is required.`);
    }

    return normalizedValue;
  }

  private resolveTrackedCommitSha(
    fileList: string[],
    trackedCommitSha?: string | null,
  ): string | null {
    if (fileList.length === 0) {
      if (trackedCommitSha === undefined || trackedCommitSha === null) {
        return null;
      }

      return this.requireNonEmptyValue(trackedCommitSha, "Git tracked commit sha");
    }

    return this.requireNonEmptyValue(trackedCommitSha ?? null, "Git tracked commit sha");
  }

  private async requireAgent(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    agentId: string,
  ): Promise<AgentRecord> {
    const [agent] = await selectableDatabase
      .select({
        id: agents.id,
      })
      .from(agents)
      .where(and(
        eq(agents.companyId, companyId),
        eq(agents.id, agentId),
      )) as AgentRecord[];

    if (!agent) {
      throw new Error("Agent not found.");
    }

    return agent;
  }

  private async requireSkill(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    skillId: string,
  ): Promise<SkillRecord> {
    const [skill] = await selectableDatabase
      .select(this.skillSelection())
      .from(skills)
      .where(and(
        eq(skills.companyId, companyId),
        eq(skills.id, skillId),
      )) as SkillRecord[];

    if (!skill) {
      throw new Error("Skill not found.");
    }

    return (await this.hydrateSkillRepositories(selectableDatabase, [this.toCustomSkillRecord(skill)]))[0] as SkillRecord;
  }

  private async requireSkillGroup(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    skillGroupId: string,
  ): Promise<SkillGroupRecord> {
    const [group] = await selectableDatabase
      .select(this.skillGroupSelection())
      .from(skill_groups)
      .where(and(
        eq(skill_groups.companyId, companyId),
        eq(skill_groups.id, skillGroupId),
      )) as SkillGroupRecord[];

    if (!group) {
      throw new Error("Skill group not found.");
    }

    return group;
  }

  private async requireSkillGroupId(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    skillGroupId: string | null,
  ): Promise<string | null> {
    if (skillGroupId === null) {
      return null;
    }
    if (this.systemSkillRegistry.isSystemSkillGroupId(skillGroupId)) {
      throw new Error("System skill group cannot contain custom skills.");
    }

    const group = await this.requireSkillGroup(selectableDatabase, companyId, skillGroupId);
    return group.id;
  }

  private async listSkillGroupsByIds(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    skillGroupIds: string[],
  ): Promise<SkillGroupRecord[]> {
    if (skillGroupIds.length === 0) {
      return [];
    }

    const groups = await selectableDatabase
      .select(this.skillGroupSelection())
      .from(skill_groups)
      .where(and(
        eq(skill_groups.companyId, companyId),
        inArray(skill_groups.id, skillGroupIds),
      )) as SkillGroupRecord[];

    return [...groups].sort((left, right) => left.name.localeCompare(right.name));
  }

  private async listSkillsByIds(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    skillIds: string[],
  ): Promise<SkillRecord[]> {
    if (skillIds.length === 0) {
      return [];
    }

    const records = await selectableDatabase
      .select(this.skillSelection())
      .from(skills)
      .where(and(
        eq(skills.companyId, companyId),
        inArray(skills.id, skillIds),
      )) as SkillRecord[];

    return this.hydrateSkillRepositories(
      selectableDatabase,
      [...records].map((record) => this.toCustomSkillRecord(record))
        .sort((left, right) => left.name.localeCompare(right.name)),
    );
  }

  private async listAgentAvailableCustomSkills(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    skillIds: string[],
    skillGroupIds: string[],
  ): Promise<SkillRecord[]> {
    const availabilityConditions = [
      ...(skillIds.length > 0 ? [inArray(skills.id, skillIds)] : []),
      ...(skillGroupIds.length > 0 ? [inArray(skills.skillGroupId, skillGroupIds)] : []),
    ];
    if (availabilityConditions.length === 0) {
      return [];
    }

    const records = await selectableDatabase
      .select(this.skillSelection())
      .from(skills)
      .where(and(
        eq(skills.companyId, companyId),
        availabilityConditions.length === 1 ? availabilityConditions[0] : or(...availabilityConditions),
      )) as SkillRecord[];

    return this.hydrateSkillRepositories(
      selectableDatabase,
      [...records].map((record) => this.toCustomSkillRecord(record))
        .sort((left, right) => left.name.localeCompare(right.name)),
    );
  }

  private skillGroupSelection() {
    return {
      companyId: skill_groups.companyId,
      id: skill_groups.id,
      name: skill_groups.name,
    };
  }

  private skillSelection() {
    return {
      companyId: skills.companyId,
      description: skills.description,
      fileList: skills.fileList,
      branchName: skills.branchName,
      trackedCommitSha: skills.trackedCommitSha,
      githubRepositoryId: skills.githubRepositoryId,
      id: skills.id,
      instructions: skills.instructions,
      name: skills.name,
      repository: skills.repository,
      skillDirectory: skills.skillDirectory,
      skillGroupId: skills.skillGroupId,
      sourceType: skills.sourceType,
    };
  }

  private toCustomSkillRecord(record: SkillRecord): SkillRecord {
    return {
      ...record,
      githubRepositoryId: record.githubRepositoryId ?? null,
      githubRepositoryInstallationId: record.githubRepositoryInstallationId ?? null,
      sourceType: record.sourceType ?? "manual",
      skillType: "custom",
      systemCommands: [],
      systemKey: null,
    };
  }

  private async hydrateSkillRepositories(
    selectableDatabase: SelectableDatabase,
    records: SkillRecord[],
  ): Promise<SkillRecord[]> {
    const githubRepositoryIds = [...new Set(records.flatMap((record) =>
      record.sourceType === "github_installation" && record.githubRepositoryId
        ? [record.githubRepositoryId]
        : []
    ))];
    if (githubRepositoryIds.length === 0) {
      return records;
    }

    const repositories = await selectableDatabase
      .select({
        fullName: githubRepositories.fullName,
        id: githubRepositories.id,
        installationId: githubRepositories.installationId,
      })
      .from(githubRepositories)
      .where(inArray(githubRepositories.id, githubRepositoryIds)) as GithubRepositoryRecord[];
    const repositoryById = new Map(repositories.map((repository) => [repository.id, repository]));

    return records.map((record) => {
      if (record.sourceType !== "github_installation" || !record.githubRepositoryId) {
        return record;
      }

      const repository = repositoryById.get(record.githubRepositoryId);
      return {
        ...record,
        repository: repository?.fullName ?? record.repository,
        githubRepositoryInstallationId: repository?.installationId ?? record.githubRepositoryInstallationId ?? null,
      };
    });
  }

  private async attachSystemSkillToAgent(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      skillId: string;
      userId: string | null;
    },
  ): Promise<SkillRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      await this.requireAgent(selectableDatabase, input.companyId, input.agentId);
      const skill = this.systemSkillRegistry.requireSkillById(input.companyId, input.skillId);
      const existingAttachments = await selectableDatabase
        .select({
          systemSkillKey: agentSkills.systemSkillKey,
        })
        .from(agentSkills)
        .where(and(
          eq(agentSkills.companyId, input.companyId),
          eq(agentSkills.agentId, input.agentId),
          eq(agentSkills.systemSkillKey, skill.systemKey ?? ""),
        )) as Array<{ systemSkillKey: string }>;

      if (!existingAttachments[0]) {
        await insertableDatabase
          .insert(agentSkills)
          .values({
            agentId: input.agentId,
            companyId: input.companyId,
            createdAt: new Date(),
            createdByUserId: input.userId,
            skillId: null,
            systemSkillKey: skill.systemKey,
          });
      }

      return skill;
    });
  }

  private async attachSystemSkillGroupToAgent(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      skillGroupId: string;
      userId: string | null;
    },
  ): Promise<SkillGroupRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      await this.requireAgent(selectableDatabase, input.companyId, input.agentId);
      const group = this.systemSkillRegistry.getSystemSkillGroup(input.companyId);
      const existingAttachment = await selectableDatabase
        .select({
          systemSkillGroupKey: agentSkillGroups.systemSkillGroupKey,
        })
        .from(agentSkillGroups)
        .where(and(
          eq(agentSkillGroups.companyId, input.companyId),
          eq(agentSkillGroups.agentId, input.agentId),
          eq(agentSkillGroups.systemSkillGroupKey, input.skillGroupId),
        )) as Array<{ systemSkillGroupKey: string | null }>;

      if (existingAttachment.length === 0) {
        await insertableDatabase
          .insert(agentSkillGroups)
          .values({
            agentId: input.agentId,
            companyId: input.companyId,
            createdAt: new Date(),
            createdByUserId: input.userId,
            skillGroupId: null,
            systemSkillGroupKey: input.skillGroupId,
          });
      }

      return group;
    });
  }

  private async detachSystemSkillFromAgent(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    skillId: string,
  ): Promise<SkillRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      await this.requireAgent(selectableDatabase, companyId, agentId);
      const skill = this.systemSkillRegistry.requireSkillById(companyId, skillId);
      const [deletedAttachment] = await deletableDatabase
        .delete(agentSkills)
        .where(and(
          eq(agentSkills.companyId, companyId),
          eq(agentSkills.agentId, agentId),
          eq(agentSkills.systemSkillKey, skill.systemKey ?? ""),
        ))
        .returning?.({
          systemSkillKey: agentSkills.systemSkillKey,
        }) as Array<{ systemSkillKey: string }>;

      if (!deletedAttachment) {
        throw new Error("Skill is not attached to the agent.");
      }

      return skill;
    });
  }

  private async detachSystemSkillGroupFromAgent(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    skillGroupId: string,
  ): Promise<SkillGroupRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      await this.requireAgent(selectableDatabase, companyId, agentId);
      const group = this.systemSkillRegistry.getSystemSkillGroup(companyId);
      const [deletedAttachment] = await deletableDatabase
        .delete(agentSkillGroups)
        .where(and(
          eq(agentSkillGroups.companyId, companyId),
          eq(agentSkillGroups.agentId, agentId),
          eq(agentSkillGroups.systemSkillGroupKey, skillGroupId),
        ))
        .returning?.({
          systemSkillGroupKey: agentSkillGroups.systemSkillGroupKey,
        }) as Array<{ systemSkillGroupKey: string | null }>;

      if (!deletedAttachment) {
        throw new Error("Skill group is not attached to the agent.");
      }

      return group;
    });
  }
}
