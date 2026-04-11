import { and, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import { agentSkillGroups, agentSkills, agents, skill_groups, skills } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";

export type SkillRecord = {
  companyId: string;
  description: string;
  fileList: string[];
  id: string;
  instructions: string;
  name: string;
  repository: string | null;
  skillDirectory: string | null;
  skillGroupId: string | null;
};

export type SkillGroupRecord = {
  companyId: string;
  id: string;
  name: string;
};

type AgentRecord = {
  id: string;
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
          instructions,
          name,
          skillGroupId,
        })
        .returning?.(this.skillSelection()) as SkillRecord[];

      if (!createdSkill) {
        throw new Error("Failed to create skill.");
      }

      return createdSkill;
    });
  }

  async createGithubSkill(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      description: string;
      fileList: string[];
      githubBranchName?: string | null;
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
    const repository = this.requireNonEmptyValue(input.repository, "GitHub repository");
    const skillDirectory = this.requireNonEmptyValue(input.skillDirectory, "GitHub skill directory");
    const githubBranchName = input.githubBranchName === undefined || input.githubBranchName === null
      ? null
      : this.requireNonEmptyValue(input.githubBranchName, "GitHub branch name");

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
          githubBranchName,
          instructions,
          name,
          repository,
          skillDirectory,
          skillGroupId,
        })
        .returning?.(this.skillSelection()) as SkillRecord[];

      if (!createdSkill) {
        throw new Error("Failed to import GitHub skill.");
      }

      return createdSkill;
    });
  }

  async getSkill(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    skillId: string,
  ): Promise<SkillRecord> {
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

      return [...records].sort((left, right) => left.name.localeCompare(right.name));
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

      return [...records].sort((left, right) => left.name.localeCompare(right.name));
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
        })
        .from(agentSkillGroups)
        .where(and(
          eq(agentSkillGroups.companyId, companyId),
          eq(agentSkillGroups.agentId, agentId),
        )) as Array<{ skillGroupId: string }>;

      return this.listSkillGroupsByIds(
        selectableDatabase,
        companyId,
        attachments.map((attachment) => attachment.skillGroupId),
      );
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
        })
        .from(agentSkills)
        .where(and(
          eq(agentSkills.companyId, companyId),
          eq(agentSkills.agentId, agentId),
        )) as Array<{ skillId: string }>;

      return this.listSkillsByIds(
        selectableDatabase,
        companyId,
        attachments.map((attachment) => attachment.skillId),
      );
    });
  }

  async deleteSkillGroup(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      skillGroupId: string;
    },
  ): Promise<SkillGroupRecord> {
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

      return deletedSkill;
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

      return updatedSkill;
    });
  }

  async detachSkillGroupFromAgent(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    skillGroupId: string,
  ): Promise<SkillGroupRecord> {
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

    return skill;
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

    return [...records].sort((left, right) => left.name.localeCompare(right.name));
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
      id: skills.id,
      instructions: skills.instructions,
      name: skills.name,
      repository: skills.repository,
      skillDirectory: skills.skillDirectory,
      skillGroupId: skills.skillGroupId,
    };
  }
}
