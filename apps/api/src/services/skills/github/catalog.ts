import matter from "gray-matter";
import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { Config } from "../../../config/schema.ts";
import { githubRepositories, skill_groups, skills } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { GithubClient } from "../../../github/client.ts";
import type { SkillRecord, SkillSourceType } from "../service.ts";
import { SkillGithubPublicClient } from "./public_client.ts";

export type SkillGitSourceType = "public_git" | "github_installation";

export type SkillGitSourceInput = {
  githubRepositoryId?: string | null;
  repository?: string | null;
  sourceType?: SkillGitSourceType | string | null;
};

export type SkillGithubDiscoveredBranchRecord = {
  commitSha: string;
  isDefault: boolean;
  name: string;
  repository: string;
};

export type SkillGithubDiscoveredSkillRecord = {
  branchName: string;
  commitSha: string | null;
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

type GithubRepositoryRecord = {
  archived: boolean;
  defaultBranch: string | null;
  fullName: string;
  id: string;
  installationId: number;
};

type CreateGitSkillRecord = {
  branchName: string;
  commitSha: string;
  description: string;
  fileList: string[];
  githubRepositoryId: string | null;
  githubRepositoryInstallationId: number | null;
  instructions: string;
  name: string;
  repository: string;
  skillDirectory: string;
  sourceType: Extract<SkillSourceType, "public_git" | "github_installation">;
};

type GitSkillSelectionRecord = {
  branchName: string;
  skillDirectory: string;
  source: SkillGitSourceInput;
};

type ResolvedGitSkillSourceRecord = {
  defaultBranch: string | null;
  githubRepositoryId: string | null;
  installationId: number | null;
  repository: string;
  sourceType: Extract<SkillSourceType, "public_git" | "github_installation">;
};

/**
 * Discovers Git-backed skill packages from public repositories or company-linked GitHub App
 * repositories, then imports selected package snapshots into the company skill catalog.
 */
@injectable()
export class SkillGithubCatalog {
  private readonly githubClient: GithubClient;
  private readonly githubPublicClient: SkillGithubPublicClient;

  constructor(
    @inject(SkillGithubPublicClient)
    githubPublicClient: SkillGithubPublicClient = new SkillGithubPublicClient({} as Config),
    @inject(GithubClient)
    githubClient: GithubClient = new GithubClient({} as Config),
  ) {
    this.githubClient = githubClient;
    this.githubPublicClient = githubPublicClient;
  }

  async discoverBranches(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      source: SkillGitSourceInput;
    },
  ): Promise<SkillGithubDiscoveredBranchRecord[]> {
    const source = await this.resolveGitSource(transactionProvider, input.companyId, input.source);
    if (source.sourceType === "github_installation") {
      const installationId = this.requireInstallationId(source);
      const branches = await this.githubClient.listRepositoryBranches({
        defaultBranch: source.defaultBranch,
        installationId,
        repositoryFullName: source.repository,
      });

      return branches.map((branch) => ({
        commitSha: branch.commitSha,
        isDefault: branch.isDefault,
        name: branch.name,
        repository: branch.repositoryFullName,
      }));
    }

    const repositoryBranches = await this.githubPublicClient.getRepositoryBranches(source.repository);

    return repositoryBranches.branches.map((branch) => ({
      commitSha: branch.commitSha,
      isDefault: branch.isDefault,
      name: branch.name,
      repository: repositoryBranches.repository,
    }));
  }

  async discoverSkills(
    transactionProvider: TransactionProviderInterface,
    input: {
      branchName: string;
      companyId: string;
      source: SkillGitSourceInput;
    },
  ): Promise<SkillGithubDiscoveredSkillRecord[]> {
    const source = await this.resolveGitSource(transactionProvider, input.companyId, input.source);
    if (source.sourceType === "github_installation") {
      const installationId = this.requireInstallationId(source);
      const skillDirectories = await this.githubClient.listSkillDirectories({
        branchName: input.branchName,
        installationId,
        repositoryFullName: source.repository,
      });

      return skillDirectories.map((skillDirectory) => ({
        branchName: input.branchName,
        commitSha: null,
        description: null,
        fileList: skillDirectory.fileList.map((filePath) =>
          this.toRepositoryPath(skillDirectory.path, filePath)
        ),
        importable: true,
        instructions: null,
        name: skillDirectory.name,
        repository: source.repository,
        skillDirectory: skillDirectory.path,
        validationError: null,
      }));
    }

    return this.githubPublicClient.inspectRepository(source.repository, input.branchName, async (repositoryTree) => {
      const skillFilePaths = this.getSkillFilePaths(repositoryTree.treeEntries);
      const skillDirectories = skillFilePaths.map((skillFilePath) => this.getSkillDirectory(skillFilePath));

      return Promise.all(skillFilePaths.map(async (skillFilePath, skillIndex) => {
        void skillFilePath;
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
        repository?: string | null;
        skillDirectory: string;
        source?: SkillGitSourceInput | null;
      }>;
    },
  ): Promise<SkillRecord[]> {
    const gitSkillSelections = this.requireGitSkillSelections(input.skills);
    const gitSkillRecords = await this.resolveGitSkillSelections(
      transactionProvider,
      input.companyId,
      gitSkillSelections,
    );

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const skillGroupId = await this.requireSkillGroupId(selectableDatabase, input.companyId, input.skillGroupId);
      const existingSkills = await selectableDatabase
        .select(this.skillSelection())
        .from(skills)
        .where(eq(skills.companyId, input.companyId)) as SkillRecord[];

      this.requireUniqueSkillSelections(existingSkills, gitSkillRecords);

      const createdSkills: SkillRecord[] = [];

      for (const gitSkillRecord of gitSkillRecords) {
        const [createdSkill] = await insertableDatabase
          .insert(skills)
          .values({
            branchName: gitSkillRecord.branchName,
            companyId: input.companyId,
            description: gitSkillRecord.description,
            fileList: [...gitSkillRecord.fileList],
            githubRepositoryId: gitSkillRecord.githubRepositoryId,
            instructions: gitSkillRecord.instructions,
            name: gitSkillRecord.name,
            repository: gitSkillRecord.sourceType === "public_git" ? gitSkillRecord.repository : null,
            skillDirectory: gitSkillRecord.skillDirectory,
            skillGroupId,
            sourceType: gitSkillRecord.sourceType,
            trackedCommitSha: gitSkillRecord.commitSha,
          })
          .returning?.(this.skillSelection()) as SkillRecord[];

        if (!createdSkill) {
          throw new Error(`Failed to import Git skill ${gitSkillRecord.skillDirectory}.`);
        }

        createdSkills.push({
          ...createdSkill,
          githubRepositoryInstallationId: gitSkillRecord.githubRepositoryInstallationId,
          repository: gitSkillRecord.repository,
        });
      }

      return createdSkills;
    });
  }

  private async resolveGitSkillSelections(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    selections: GitSkillSelectionRecord[],
  ): Promise<CreateGitSkillRecord[]> {
    const gitSkillRecords: CreateGitSkillRecord[] = [];
    const selectionsByBranchKey = this.groupSelectionsByBranch(selections);

    for (const selectionsForBranch of selectionsByBranchKey.values()) {
      const [firstSelection] = selectionsForBranch;
      if (!firstSelection) {
        continue;
      }

      const source = await this.resolveGitSource(transactionProvider, companyId, firstSelection.source);
      if (source.sourceType === "github_installation") {
        const installationId = this.requireInstallationId(source);
        for (const selection of selectionsForBranch) {
          const skillPackage = await this.githubClient.getSkillPackage({
            branchName: selection.branchName,
            installationId,
            repositoryFullName: source.repository,
            skillDirectory: selection.skillDirectory,
          });
          gitSkillRecords.push({
            branchName: skillPackage.branchName,
            commitSha: skillPackage.commitSha,
            description: skillPackage.description,
            fileList: skillPackage.fileList.map((filePath) =>
              this.toRepositoryPath(skillPackage.path, filePath)
            ),
            githubRepositoryId: source.githubRepositoryId,
            githubRepositoryInstallationId: installationId,
            instructions: skillPackage.instructions.trim(),
            name: skillPackage.name,
            repository: skillPackage.repositoryFullName,
            skillDirectory: skillPackage.path,
            sourceType: "github_installation",
          });
        }
        continue;
      }

      await this.githubPublicClient.inspectRepository(source.repository, firstSelection.branchName, async (repositoryTree) => {
        const skillDirectories = this.getSkillFilePaths(repositoryTree.treeEntries)
          .map((skillFilePath) => this.getSkillDirectory(skillFilePath));

        for (const selection of selectionsForBranch) {
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

          gitSkillRecords.push({
            branchName: selectedSkill.branchName,
            commitSha: selectedSkill.commitSha ?? "",
            description: selectedSkill.description ?? "",
            fileList: [...selectedSkill.fileList],
            githubRepositoryId: null,
            githubRepositoryInstallationId: null,
            instructions: selectedSkill.instructions,
            name: selectedSkill.name,
            repository: selectedSkill.repository,
            skillDirectory: selectedSkill.skillDirectory,
            sourceType: "public_git",
          });
        }
      });
    }

    return gitSkillRecords;
  }

  private async resolveGitSource(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    source: SkillGitSourceInput,
  ): Promise<ResolvedGitSkillSourceRecord> {
    const sourceType = this.resolveSourceType(source);
    if (sourceType === "public_git") {
      return {
        defaultBranch: null,
        githubRepositoryId: null,
        installationId: null,
        repository: this.requireNonEmptyValue(source.repository ?? null, "Git repository"),
        sourceType,
      };
    }

    const githubRepositoryId = this.requireNonEmptyValue(source.githubRepositoryId ?? null, "GitHub repository id");
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [repository] = await selectableDatabase
        .select({
          archived: githubRepositories.archived,
          defaultBranch: githubRepositories.defaultBranch,
          fullName: githubRepositories.fullName,
          id: githubRepositories.id,
          installationId: githubRepositories.installationId,
        })
        .from(githubRepositories)
        .where(and(
          eq(githubRepositories.companyId, companyId),
          eq(githubRepositories.id, githubRepositoryId),
        )) as GithubRepositoryRecord[];
      if (!repository) {
        throw new Error("GitHub repository not found.");
      }
      if (repository.archived) {
        throw new Error("Archived GitHub repositories cannot be imported as skills.");
      }

      return {
        defaultBranch: repository.defaultBranch,
        githubRepositoryId: repository.id,
        installationId: repository.installationId,
        repository: repository.fullName,
        sourceType,
      };
    });
  }

  private resolveSourceType(source: SkillGitSourceInput): SkillGitSourceType {
    const sourceType = String(source.sourceType || "").trim();
    if (!sourceType && source.repository) {
      return "public_git";
    }
    if (sourceType === "public_git" || sourceType === "PUBLIC_GIT") {
      return "public_git";
    }
    if (sourceType === "github_installation" || sourceType === "GITHUB_INSTALLATION") {
      return "github_installation";
    }

    throw new Error("Git skill source type is required.");
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

  private requireInstallationId(source: ResolvedGitSkillSourceRecord): number {
    if (source.installationId === null) {
      throw new Error("GitHub repository installation id is required.");
    }

    return source.installationId;
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
    selections: GitSkillSelectionRecord[],
  ): Map<string, GitSkillSelectionRecord[]> {
    const selectionsByBranchKey = new Map<string, GitSkillSelectionRecord[]>();
    for (const selection of selections) {
      const sourceType = this.resolveSourceType(selection.source);
      const sourceKey = sourceType === "github_installation"
        ? selection.source.githubRepositoryId
        : selection.source.repository;
      const branchKey = `${sourceType}:${sourceKey}:${selection.branchName}`;
      const currentSelections = selectionsByBranchKey.get(branchKey) ?? [];
      currentSelections.push(selection);
      selectionsByBranchKey.set(branchKey, currentSelections);
    }

    return selectionsByBranchKey;
  }

  private requireGitSkillSelections(
    value: Array<{
      branchName: string;
      repository?: string | null;
      skillDirectory: string;
      source?: SkillGitSourceInput | null;
    }>,
  ): GitSkillSelectionRecord[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error("At least one Git skill must be selected.");
    }

    return value.map((record) => ({
      branchName: this.requireNonEmptyValue(record.branchName, "Git branch name"),
      skillDirectory: this.normalizeSkillDirectory(record.skillDirectory),
      source: record.source ?? {
        repository: record.repository,
        sourceType: "public_git",
      },
    }));
  }

  private requireNonEmptyValue(value: string | null, label: string): string {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      throw new Error(`${label} is required.`);
    }

    return normalizedValue;
  }

  private requireUniqueSkillSelections(
    existingSkills: SkillRecord[],
    gitSkillRecords: CreateGitSkillRecord[],
  ): void {
    const selectedSkillNames = new Set<string>();
    const selectedSkillRepositories = new Set<string>();

    // Validate the whole selection up front so a partially imported batch can never happen.
    for (const gitSkillRecord of gitSkillRecords) {
      const selectedRepositoryKey = gitSkillRecord.sourceType === "github_installation"
        ? `${gitSkillRecord.githubRepositoryId}:${gitSkillRecord.skillDirectory}`
        : `${gitSkillRecord.repository}:${gitSkillRecord.skillDirectory}`;
      if (selectedSkillRepositories.has(selectedRepositoryKey)) {
        throw new Error(`Skill ${gitSkillRecord.skillDirectory} was selected more than once.`);
      }
      selectedSkillRepositories.add(selectedRepositoryKey);

      if (selectedSkillNames.has(gitSkillRecord.name)) {
        throw new Error(`Skill name ${gitSkillRecord.name} was selected more than once.`);
      }
      selectedSkillNames.add(gitSkillRecord.name);

      const existingSkill = existingSkills.find((skill) =>
        skill.skillDirectory === gitSkillRecord.skillDirectory
        && (
          gitSkillRecord.sourceType === "github_installation"
            ? skill.githubRepositoryId === gitSkillRecord.githubRepositoryId
            : skill.repository === gitSkillRecord.repository
        )
      );
      if (existingSkill?.skillDirectory) {
        throw new Error(`Skill ${existingSkill.skillDirectory} is already imported.`);
      }

      const existingSkillName = existingSkills.find((skill) => skill.name === gitSkillRecord.name);
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

  private toRepositoryPath(skillDirectory: string, relativePath: string): string {
    if (skillDirectory === ".") {
      return relativePath;
    }

    return `${skillDirectory}/${relativePath}`;
  }

  private skillSelection() {
    return {
      branchName: skills.branchName,
      companyId: skills.companyId,
      description: skills.description,
      fileList: skills.fileList,
      githubRepositoryId: skills.githubRepositoryId,
      id: skills.id,
      instructions: skills.instructions,
      name: skills.name,
      repository: skills.repository,
      skillDirectory: skills.skillDirectory,
      skillGroupId: skills.skillGroupId,
      sourceType: skills.sourceType,
      trackedCommitSha: skills.trackedCommitSha,
    };
  }
}
