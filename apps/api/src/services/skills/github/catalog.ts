import matter from "gray-matter";
import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { Config } from "../../../config/schema.ts";
import { skill_groups, skills } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import type { SkillRecord } from "../service.ts";
import { SkillGithubPublicClient } from "./public_client.ts";

export type SkillGithubDiscoveredBranchRecord = {
  commitSha: string;
  isDefault: boolean;
  name: string;
  repository: string;
};

export type SkillGithubDiscoveredSkillRecord = {
  branchName: string;
  commitSha: string;
  description: string | null;
  fileList: string[];
  importable: boolean;
  instructions: string | null;
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

type CreateGithubSkillRecord = {
  branchName: string;
  commitSha: string;
  description: string;
  fileList: string[];
  instructions: string;
  name: string;
  repository: string;
  skillDirectory: string;
};

type GithubSkillSelectionRecord = {
  branchName: string;
  repository: string;
  skillDirectory: string;
};

/**
 * Discovers Git-backed skills from public repositories and imports selected discovery results
 * into the company skill catalog. Imports reload the selected SKILL.md files on the server so the
 * client never needs to echo large instructions payloads back through GraphQL.
 */
@injectable()
export class SkillGithubCatalog {
  private readonly githubPublicClient: SkillGithubPublicClient;

  constructor(
    @inject(SkillGithubPublicClient)
    githubPublicClient: SkillGithubPublicClient = new SkillGithubPublicClient({} as Config),
  ) {
    this.githubPublicClient = githubPublicClient;
  }

  async discoverBranches(repository: string): Promise<SkillGithubDiscoveredBranchRecord[]> {
    const repositoryBranches = await this.githubPublicClient.getRepositoryBranches(repository);

    return repositoryBranches.branches.map((branch) => ({
      commitSha: branch.commitSha,
      isDefault: branch.isDefault,
      name: branch.name,
      repository: repositoryBranches.repository,
    }));
  }

  async discoverSkills(input: {
    branchName: string;
    repository: string;
  }): Promise<SkillGithubDiscoveredSkillRecord[]> {
    return this.githubPublicClient.inspectRepository(input.repository, input.branchName, async (repositoryTree) => {
      const skillFilePaths = this.getSkillFilePaths(repositoryTree.treeEntries);
      const skillDirectories = skillFilePaths.map((skillFilePath) => this.getSkillDirectory(skillFilePath));

      return Promise.all(skillFilePaths.map(async (skillFilePath, skillIndex) => {
        const skillDirectory = skillDirectories[skillIndex] || ".";
        return this.readDiscoveredSkill(repositoryTree, skillDirectory, skillDirectories);
      }));
    });
  }

  async importSkills(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      skillGroupId?: string | null;
      skills: Array<{
        branchName: string;
        repository: string;
        skillDirectory: string;
      }>;
    },
  ): Promise<SkillRecord[]> {
    const githubSkillSelections = this.requireGithubSkillSelections(input.skills);
    const githubSkillRecords = await this.resolveGithubSkillSelections(githubSkillSelections);

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const skillGroupId = await this.requireSkillGroupId(selectableDatabase, input.companyId, input.skillGroupId);
      const existingSkills = await selectableDatabase
        .select(this.skillSelection())
        .from(skills)
        .where(eq(skills.companyId, input.companyId)) as SkillRecord[];

      this.requireUniqueSkillSelections(existingSkills, githubSkillRecords);

      const createdSkills: SkillRecord[] = [];

      for (const githubSkillRecord of githubSkillRecords) {
        const [createdSkill] = await insertableDatabase
          .insert(skills)
          .values({
            companyId: input.companyId,
            description: githubSkillRecord.description,
            fileList: [...githubSkillRecord.fileList],
            githubBranchName: githubSkillRecord.branchName,
            githubTrackedCommitSha: githubSkillRecord.commitSha,
            instructions: githubSkillRecord.instructions,
            name: githubSkillRecord.name,
            repository: githubSkillRecord.repository,
            skillDirectory: githubSkillRecord.skillDirectory,
            skillGroupId,
          })
          .returning?.(this.skillSelection()) as SkillRecord[];

        if (!createdSkill) {
          throw new Error(`Failed to import Git skill ${githubSkillRecord.skillDirectory}.`);
        }

        createdSkills.push(createdSkill);
      }

      return createdSkills;
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
      throw new Error("Git skill directory is required.");
    }
    if (normalizedValue === ".") {
      return normalizedValue;
    }
    if (
      normalizedValue.includes("\0")
      || normalizedValue.split("/").some((segment) => segment === "." || segment === "..")
    ) {
      throw new Error("Git skill directory is invalid.");
    }

    return normalizedValue;
  }

  private async resolveGithubSkillSelections(
    value: GithubSkillSelectionRecord[],
  ): Promise<CreateGithubSkillRecord[]> {
    const githubSkillRecords: CreateGithubSkillRecord[] = [];
    const selectionsByBranchKey = this.groupSelectionsByBranch(value);

    for (const selections of selectionsByBranchKey.values()) {
      const [firstSelection] = selections;
      if (!firstSelection) {
        continue;
      }

      await this.githubPublicClient.inspectRepository(firstSelection.repository, firstSelection.branchName, async (repositoryTree) => {
        const skillDirectories = this.getSkillFilePaths(repositoryTree.treeEntries)
          .map((skillFilePath) => this.getSkillDirectory(skillFilePath));

        for (const selection of selections) {
          const selectedSkill = await this.readDiscoveredSkill(
            repositoryTree,
            selection.skillDirectory,
            skillDirectories,
          );
          if (!selectedSkill.importable || !selectedSkill.instructions) {
            throw new Error(
              selectedSkill.validationError
              ?? `Skill ${selection.skillDirectory} could not be imported from Git.`,
            );
          }

          githubSkillRecords.push({
            branchName: selectedSkill.branchName,
            commitSha: selectedSkill.commitSha,
            description: selectedSkill.description ?? "",
            fileList: [...selectedSkill.fileList],
            instructions: selectedSkill.instructions,
            name: selectedSkill.name,
            repository: selectedSkill.repository,
            skillDirectory: selectedSkill.skillDirectory,
          });
        }
      });
    }

    return githubSkillRecords;
  }

  private async readDiscoveredSkill(
    repositoryTree: {
      branchName: string;
      commitSha: string;
      repository: string;
      treeEntries: Array<{ path: string }>;
      readFile(path: string): Promise<string>;
    },
    skillDirectory: string,
    skillDirectories: string[],
  ): Promise<SkillGithubDiscoveredSkillRecord> {
    const skillFilePath = this.getSkillFilePath(skillDirectory);
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
        instructions: null,
        name: this.getSkillName(skillDirectory, repositoryTree.repository),
        repository: repositoryTree.repository,
        skillDirectory,
        validationError: "Git skill file could not be found.",
      };
    }

    try {
      const skillDocument = matter(await repositoryTree.readFile(skillFilePath));
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
          instructions: null,
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
        instructions,
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
        instructions: null,
        name: this.getSkillName(skillDirectory, repositoryTree.repository),
        repository: repositoryTree.repository,
        skillDirectory,
        validationError: error instanceof Error ? error.message : "Failed to parse SKILL.md.",
      };
    }
  }

  private getSkillFilePaths(treeEntries: Array<{ path: string }>): string[] {
    return treeEntries
      .filter((treeEntry) => treeEntry.path === "SKILL.md" || treeEntry.path.endsWith("/SKILL.md"))
      .map((treeEntry) => treeEntry.path)
      .sort((left, right) => left.localeCompare(right));
  }

  private getSkillFilePath(skillDirectory: string): string {
    return skillDirectory === "." ? "SKILL.md" : `${skillDirectory}/SKILL.md`;
  }

  private groupSelectionsByBranch(
    selections: GithubSkillSelectionRecord[],
  ): Map<string, GithubSkillSelectionRecord[]> {
    const selectionsByBranchKey = new Map<string, GithubSkillSelectionRecord[]>();
    for (const selection of selections) {
      const branchKey = `${selection.repository}:${selection.branchName}`;
      const currentSelections = selectionsByBranchKey.get(branchKey) ?? [];
      currentSelections.push(selection);
      selectionsByBranchKey.set(branchKey, currentSelections);
    }

    return selectionsByBranchKey;
  }

  private requireGithubSkillSelections(
    value: Array<{
      branchName: string;
      repository: string;
      skillDirectory: string;
    }>,
  ): GithubSkillSelectionRecord[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error("At least one Git skill must be selected.");
    }

    return value.map((record) => ({
      branchName: this.requireNonEmptyValue(record.branchName, "Git branch name"),
      repository: this.requireNonEmptyValue(record.repository, "Git repository"),
      skillDirectory: this.normalizeSkillDirectory(record.skillDirectory),
    }));
  }

  private requireNonEmptyValue(value: string, label: string): string {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      throw new Error(`${label} is required.`);
    }

    return normalizedValue;
  }

  private requireUniqueSkillSelections(
    existingSkills: SkillRecord[],
    githubSkillRecords: CreateGithubSkillRecord[],
  ): void {
    const selectedSkillNames = new Set<string>();
    const selectedSkillRepositories = new Set<string>();

    // Validate the whole selection up front so a partially imported batch can never happen.
    for (const githubSkillRecord of githubSkillRecords) {
      const selectedRepositoryKey = `${githubSkillRecord.repository}:${githubSkillRecord.skillDirectory}`;
      if (selectedSkillRepositories.has(selectedRepositoryKey)) {
        throw new Error(`Skill ${githubSkillRecord.skillDirectory} was selected more than once.`);
      }
      selectedSkillRepositories.add(selectedRepositoryKey);

      if (selectedSkillNames.has(githubSkillRecord.name)) {
        throw new Error(`Skill name ${githubSkillRecord.name} was selected more than once.`);
      }
      selectedSkillNames.add(githubSkillRecord.name);

      const existingSkill = existingSkills.find((skill) =>
        skill.repository === githubSkillRecord.repository
        && skill.skillDirectory === githubSkillRecord.skillDirectory
      );
      if (existingSkill?.skillDirectory) {
        throw new Error(`Skill ${existingSkill.skillDirectory} is already imported.`);
      }

      const existingSkillName = existingSkills.find((skill) => skill.name === githubSkillRecord.name);
      if (existingSkillName) {
        throw new Error(`Skill name ${existingSkillName.name} already exists.`);
      }
    }
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
