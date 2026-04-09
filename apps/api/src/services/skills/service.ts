import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { skill_groups, skills } from "../../db/schema.ts";
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

/**
 * Owns the company skill catalog and centralizes skill validation plus persistence so GraphQL only
 * needs to orchestrate transport concerns.
 */
@injectable()
export class SkillService {
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

  private requireNonEmptyValue(value: string | null, label: string): string {
    const normalizedValue = value?.trim() ?? "";
    if (normalizedValue.length === 0) {
      throw new Error(`${label} is required.`);
    }

    return normalizedValue;
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

  private async requireSkillGroupId(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    skillGroupId: string | null,
  ): Promise<string | null> {
    if (skillGroupId === null) {
      return null;
    }

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

    return group.id;
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
