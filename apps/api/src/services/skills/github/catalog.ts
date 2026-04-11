import matter from "gray-matter";
import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { skill_groups, skills } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import type { SkillRecord } from "../service.ts";
import { SkillGithubPublicClient } from "./public_client.ts";

export type SkillGithubDiscoveredSkillRecord = {
  branchName: string;
  commitSha: string;
  description: string | null;
  fileList: string[];
  importable: boolean;
  name: string;
  repository: string;
  skillDirectory: string;
  validationError: string | null;
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

type SkillGroupRecord = {
  id: string;
};

/**
 * Discovers GitHub-backed skills from public repositories and imports the selected directory into
 * the company skill catalog after revalidating the repository contents server-side.
 */
@injectable()
export class SkillGithubCatalog {
  private readonly githubPublicClient: SkillGithubPublicClient;

  constructor(
    @inject(SkillGithubPublicClient)
    githubPublicClient: SkillGithubPublicClient = new SkillGithubPublicClient(),
  ) {
    this.githubPublicClient = githubPublicClient;
  }

  async discoverSkills(repository: string): Promise<SkillGithubDiscoveredSkillRecord[]> {
    const repositoryTree = await this.githubPublicClient.getRepositoryTree(repository);
    const skillFilePaths = repositoryTree.treeEntries
      .filter((treeEntry) => treeEntry.path === "SKILL.md" || treeEntry.path.endsWith("/SKILL.md"))
      .map((treeEntry) => treeEntry.path)
      .sort((left, right) => left.localeCompare(right));
    const skillDirectories = skillFilePaths.map((skillFilePath) => this.getSkillDirectory(skillFilePath));

    return Promise.all(skillFilePaths.map(async (skillFilePath, skillIndex) => {
      const skillDirectory = skillDirectories[skillIndex] || ".";
      const fileList = repositoryTree.treeEntries
        .filter((treeEntry) =>
          treeEntry.path !== skillFilePath
          && this.isWithinSkillDirectory(treeEntry.path, skillDirectory)
          && !this.isWithinNestedSkillDirectory(treeEntry.path, skillDirectory, skillDirectories)
        )
        .map((treeEntry) => treeEntry.path)
        .sort((left, right) => left.localeCompare(right));
      const skillTreeEntry = repositoryTree.treeEntries.find((treeEntry) => treeEntry.path === skillFilePath);
      if (!skillTreeEntry) {
        return {
          branchName: repositoryTree.branchName,
          commitSha: repositoryTree.commitSha,
          description: null,
          fileList,
          importable: false,
          name: this.getSkillName(skillDirectory, repositoryTree.repository),
          repository: repositoryTree.repository,
          skillDirectory,
          validationError: "GitHub skill file could not be found.",
        };
      }

      try {
        const skillDocument = matter(
          await this.githubPublicClient.readBlob(repositoryTree.repository, skillTreeEntry.sha),
        );
        const skillName = this.normalizeOptionalTextValue(skillDocument.data.name)
          ?? this.getSkillName(skillDirectory, repositoryTree.repository);
        const instructions = String(skillDocument.content || "").trim();
        if (!instructions) {
          return {
            branchName: repositoryTree.branchName,
            commitSha: repositoryTree.commitSha,
            description: this.normalizeOptionalTextValue(skillDocument.data.description),
            fileList,
            importable: false,
            name: skillName,
            repository: repositoryTree.repository,
            skillDirectory,
            validationError: "SKILL.md does not contain any instructions.",
          };
        }

        return {
          branchName: repositoryTree.branchName,
          commitSha: repositoryTree.commitSha,
          description: this.normalizeOptionalTextValue(skillDocument.data.description),
          fileList,
          importable: true,
          name: skillName,
          repository: repositoryTree.repository,
          skillDirectory,
          validationError: null,
        };
      } catch (error: unknown) {
        return {
          branchName: repositoryTree.branchName,
          commitSha: repositoryTree.commitSha,
          description: null,
          fileList,
          importable: false,
          name: this.getSkillName(skillDirectory, repositoryTree.repository),
          repository: repositoryTree.repository,
          skillDirectory,
          validationError: error instanceof Error ? error.message : "Failed to parse SKILL.md.",
        };
      }
    }));
  }

  async importSkill(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      repository: string;
      skillDirectory: string;
      skillGroupId?: string | null;
    },
  ): Promise<SkillRecord> {
    const normalizedSkillDirectory = this.normalizeSkillDirectory(input.skillDirectory);
    const discoveredSkills = await this.discoverSkills(input.repository);
    const selectedSkill = discoveredSkills.find((skill) =>
      this.normalizeSkillDirectory(skill.skillDirectory) === normalizedSkillDirectory
    );
    if (!selectedSkill) {
      throw new Error("GitHub skill directory not found.");
    }
    if (!selectedSkill.importable) {
      throw new Error(selectedSkill.validationError || `Skill ${selectedSkill.skillDirectory} cannot be imported.`);
    }

    const repositoryTree = await this.githubPublicClient.getRepositoryTree(input.repository);
    const skillFilePath = selectedSkill.skillDirectory === "."
      ? "SKILL.md"
      : `${selectedSkill.skillDirectory}/SKILL.md`;
    const skillTreeEntry = repositoryTree.treeEntries.find((treeEntry) => treeEntry.path === skillFilePath);
    if (!skillTreeEntry) {
      throw new Error("GitHub skill file could not be found.");
    }

    const skillDocument = matter(
      await this.githubPublicClient.readBlob(repositoryTree.repository, skillTreeEntry.sha),
    );
    const instructions = String(skillDocument.content || "").trim();
    if (!instructions) {
      throw new Error("SKILL.md does not contain any instructions.");
    }

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const skillGroupId = await this.requireSkillGroupId(selectableDatabase, input.companyId, input.skillGroupId);
      const [existingSkill] = await selectableDatabase
        .select({
          skillDirectory: skills.skillDirectory,
        })
        .from(skills)
        .where(and(
          eq(skills.companyId, input.companyId),
          eq(skills.repository, repositoryTree.repository),
          eq(skills.skillDirectory, selectedSkill.skillDirectory),
        )) as Array<{ skillDirectory: string | null }>;
      if (existingSkill) {
        throw new Error(`Skill ${existingSkill.skillDirectory} is already imported.`);
      }

      const [createdSkill] = await insertableDatabase
        .insert(skills)
        .values({
          companyId: input.companyId,
          description: this.normalizeOptionalTextValue(skillDocument.data.description) ?? "",
          fileList: [...selectedSkill.fileList],
          githubBranchName: repositoryTree.branchName,
          githubTrackedCommitSha: repositoryTree.commitSha,
          instructions,
          name: selectedSkill.name,
          repository: repositoryTree.repository,
          skillDirectory: selectedSkill.skillDirectory,
          skillGroupId,
        })
        .returning?.(this.skillSelection()) as SkillRecord[];

      if (!createdSkill) {
        throw new Error("Failed to import GitHub skill.");
      }

      return createdSkill;
    });
  }

  private getSkillDirectory(skillFilePath: string): string {
    const pathSegments = skillFilePath.split("/").filter((segment) => segment.length > 0);
    if (pathSegments.length <= 1) {
      return ".";
    }

    return pathSegments.slice(0, -1).join("/");
  }

  private getSkillName(skillDirectory: string, repository: string): string {
    if (skillDirectory === ".") {
      return repository.split("/").at(-1) || repository;
    }

    return skillDirectory.split("/").at(-1) || skillDirectory;
  }

  private isWithinNestedSkillDirectory(
    path: string,
    skillDirectory: string,
    skillDirectories: string[],
  ): boolean {
    return skillDirectories.some((candidateDirectory) =>
      candidateDirectory !== skillDirectory
      && this.isChildSkillDirectory(candidateDirectory, skillDirectory)
      && this.isWithinSkillDirectory(path, candidateDirectory)
    );
  }

  private isWithinSkillDirectory(path: string, skillDirectory: string): boolean {
    if (skillDirectory === ".") {
      return path !== "SKILL.md";
    }

    return path.startsWith(`${skillDirectory}/`);
  }

  private isChildSkillDirectory(candidateDirectory: string, skillDirectory: string): boolean {
    if (skillDirectory === ".") {
      return candidateDirectory !== ".";
    }

    return candidateDirectory.startsWith(`${skillDirectory}/`);
  }

  private normalizeOptionalTextValue(value: unknown): string | null {
    const normalizedValue = String(value || "").trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private normalizeSkillDirectory(value: string): string {
    const normalizedValue = String(value || "").trim().replace(/^\/+|\/+$/g, "");
    if (!normalizedValue) {
      throw new Error("GitHub skill directory is required.");
    }

    return normalizedValue;
  }

  private async requireSkillGroupId(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    skillGroupId?: string | null,
  ): Promise<string | null> {
    if (skillGroupId === undefined || skillGroupId === null) {
      return null;
    }

    const normalizedSkillGroupId = String(skillGroupId || "").trim();
    if (!normalizedSkillGroupId) {
      return null;
    }

    const [skillGroup] = await selectableDatabase
      .select({
        id: skill_groups.id,
      })
      .from(skill_groups)
      .where(and(
        eq(skill_groups.companyId, companyId),
        eq(skill_groups.id, normalizedSkillGroupId),
      )) as SkillGroupRecord[];
    if (!skillGroup) {
      throw new Error("Skill group not found.");
    }

    return skillGroup.id;
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
