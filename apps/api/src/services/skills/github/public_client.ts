import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { inject, injectable } from "inversify";
import { Config } from "../../../config/schema.ts";
import { SkillGithubRepositoryReference } from "./repository_reference.ts";

export type SkillGithubRepositoryBranchRecord = {
  commitSha: string;
  isDefault: boolean;
  name: string;
};

export type SkillGithubRepositoryTreeEntry = {
  path: string;
  sha: string;
  type: "blob";
};

export type SkillGithubRepositoryTreeRecord = {
  branchName: string;
  commitSha: string;
  repository: string;
  treeEntries: SkillGithubRepositoryTreeEntry[];
};

export type SkillGithubRepositorySnapshot = SkillGithubRepositoryTreeRecord & {
  readFile(path: string): Promise<string>;
};

type GitCommandResult = {
  stderr: string;
  stdout: string;
};

type GitCommandRunner = (
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs: number;
  },
) => Promise<GitCommandResult>;

type SkillGithubPublicClientOptions = {
  commandTimeoutMs?: number;
  gitCommandRunner?: GitCommandRunner;
  makeTempDirectory?: () => Promise<string>;
  removeDirectory?: (path: string) => Promise<void>;
};

const DEFAULT_GIT_COMMAND_TIMEOUT_MS = 30_000;
const GIT_OUTPUT_MAX_BUFFER_BYTES = 20 * 1024 * 1024;
const execFileAsync = promisify(execFile);

/**
 * Reads public Git repositories through the Git transport instead of host-specific REST APIs. Each
 * tree/file inspection uses an ephemeral shallow, blobless checkout and removes it after the call.
 */
@injectable()
export class SkillGithubPublicClient {
  private readonly commandTimeoutMs: number;
  private readonly gitCommandRunner: GitCommandRunner;
  private readonly makeTempDirectory: () => Promise<string>;
  private readonly removeDirectory: (path: string) => Promise<void>;

  constructor(
    @inject(Config) config: Config = {} as Config,
    options: SkillGithubPublicClientOptions = {},
  ) {
    void config;
    this.commandTimeoutMs = this.normalizeCommandTimeoutMs(options.commandTimeoutMs);
    this.gitCommandRunner = options.gitCommandRunner ?? this.runGitCommand;
    this.makeTempDirectory = options.makeTempDirectory
      ?? (() => mkdtemp(join(tmpdir(), "companyhelm-git-skills-")));
    this.removeDirectory = options.removeDirectory
      ?? ((path) => rm(path, { force: true, recursive: true }));
  }

  async getRepositoryBranches(repository: string): Promise<{
    branches: SkillGithubRepositoryBranchRecord[];
    repository: string;
  }> {
    const repositoryReference = SkillGithubRepositoryReference.parse(repository);
    try {
      const [defaultBranchName, branches] = await Promise.all([
        this.resolveDefaultBranchName(repositoryReference.remoteUrl),
        this.listRemoteBranches(repositoryReference.remoteUrl),
      ]);

      return {
        branches: branches
          .map((branch) => ({
            ...branch,
            isDefault: branch.name === defaultBranchName,
          }))
          .sort((left, right) => {
            if (left.isDefault && !right.isDefault) {
              return -1;
            }
            if (!left.isDefault && right.isDefault) {
              return 1;
            }

            return left.name.localeCompare(right.name);
          }),
        repository: repositoryReference.getFullName(),
      };
    } catch (error: unknown) {
      throw this.createGitRequestError(error, "list Git branches");
    }
  }

  async getRepositoryTree(
    repository: string,
    branchName?: string,
  ): Promise<SkillGithubRepositoryTreeRecord> {
    return this.inspectRepository(repository, branchName, async (snapshot) => ({
      branchName: snapshot.branchName,
      commitSha: snapshot.commitSha,
      repository: snapshot.repository,
      treeEntries: snapshot.treeEntries,
    }));
  }

  async inspectRepository<T>(
    repository: string,
    branchName: string | undefined,
    callback: (snapshot: SkillGithubRepositorySnapshot) => Promise<T>,
  ): Promise<T> {
    const repositoryReference = SkillGithubRepositoryReference.parse(repository);
    const resolvedBranchName = await this.resolveBranchName(repositoryReference.remoteUrl, branchName);
    const tempDirectory = await this.makeTempDirectory();
    try {
      await this.git(["init"], { cwd: tempDirectory });
      await this.git(["remote", "add", "origin", repositoryReference.remoteUrl], { cwd: tempDirectory });
      await this.git(["fetch", "--depth=1", "--filter=blob:none", "origin", resolvedBranchName], {
        cwd: tempDirectory,
      });
      const commitSha = (await this.git(["rev-parse", "FETCH_HEAD"], { cwd: tempDirectory })).stdout.trim();
      const treeEntries = this.parseTreeEntries(
        (await this.git(["ls-tree", "-r", "--full-tree", "FETCH_HEAD"], { cwd: tempDirectory })).stdout,
      );
      const snapshot: SkillGithubRepositorySnapshot = {
        branchName: resolvedBranchName,
        commitSha,
        repository: repositoryReference.getFullName(),
        treeEntries,
        readFile: async (path: string) => {
          const normalizedPath = this.requireRepositoryPath(path);
          return (await this.git(["show", `FETCH_HEAD:${normalizedPath}`], { cwd: tempDirectory })).stdout;
        },
      };

      return await callback(snapshot);
    } catch (error: unknown) {
      throw this.createGitRequestError(error, "read the Git repository");
    } finally {
      await this.removeDirectory(tempDirectory);
    }
  }

  private async resolveDefaultBranchName(remoteUrl: string): Promise<string> {
    const response = await this.git(["ls-remote", "--symref", remoteUrl, "HEAD"]);
    const defaultBranchLine = response.stdout
      .split("\n")
      .find((line) => line.startsWith("ref: refs/heads/") && line.endsWith("\tHEAD"));
    const defaultBranchName = defaultBranchLine
      ?.replace(/^ref: refs\/heads\//u, "")
      .replace(/\tHEAD$/u, "")
      .trim();
    if (!defaultBranchName) {
      throw new Error("Git repository default branch is not available.");
    }

    return defaultBranchName;
  }

  private async resolveBranchName(remoteUrl: string, branchName: string | undefined): Promise<string> {
    const normalizedBranchName = String(branchName || "").trim();
    const resolvedBranchName = normalizedBranchName.length > 0
      ? normalizedBranchName
      : await this.resolveDefaultBranchName(remoteUrl);
    this.assertSafeBranchName(resolvedBranchName);

    return resolvedBranchName;
  }

  private async listRemoteBranches(remoteUrl: string): Promise<Array<Omit<SkillGithubRepositoryBranchRecord, "isDefault">>> {
    const response = await this.git(["ls-remote", "--heads", remoteUrl]);
    return response.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [commitSha, reference] = line.split(/\s+/u);
        const name = String(reference || "").replace(/^refs\/heads\//u, "").trim();
        return {
          commitSha: String(commitSha || "").trim(),
          name,
        };
      })
      .filter((branch) => branch.commitSha.length > 0 && branch.name.length > 0);
  }

  private parseTreeEntries(output: string): SkillGithubRepositoryTreeEntry[] {
    return output
      .split("\n")
      .map((line) => {
        const match = /^(?<mode>\d+)\s+(?<type>\S+)\s+(?<sha>[0-9a-fA-F]+)\t(?<path>.+)$/u.exec(line);
        if (!match?.groups || match.groups.type !== "blob") {
          return null;
        }
        const normalizedPath = this.requireRepositoryPath(match.groups.path);
        return {
          path: normalizedPath,
          sha: match.groups.sha,
          type: "blob" as const,
        };
      })
      .filter((entry): entry is SkillGithubRepositoryTreeEntry => entry !== null)
      .sort((left, right) => left.path.localeCompare(right.path));
  }

  private requireRepositoryPath(path: string): string {
    const normalizedPath = String(path || "").trim().replace(/^\/+|\/+$/g, "");
    if (!normalizedPath) {
      throw new Error("Git repository path is required.");
    }
    if (
      normalizedPath === "."
      || normalizedPath.includes("\0")
      || normalizedPath.split("/").some((segment) => segment === ".." || segment === ".")
    ) {
      throw new Error("Git repository path is invalid.");
    }

    return normalizedPath;
  }

  private assertSafeBranchName(branchName: string): void {
    if (
      branchName.startsWith("-")
      || branchName.startsWith("/")
      || branchName.endsWith("/")
      || branchName.endsWith(".lock")
      || branchName.includes("..")
      || branchName.includes("@{")
      || /[\s~^:?*[\]\\\0]/u.test(branchName)
    ) {
      throw new Error("Git branch name is invalid.");
    }
  }

  private async git(args: string[], options: { cwd?: string } = {}): Promise<GitCommandResult> {
    return this.gitCommandRunner(args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
      },
      timeoutMs: this.commandTimeoutMs,
    });
  }

  private async runGitCommand(
    args: string[],
    options: {
      cwd?: string;
      env?: NodeJS.ProcessEnv;
      timeoutMs: number;
    },
  ): Promise<GitCommandResult> {
    const result = await execFileAsync("git", args, {
      cwd: options.cwd,
      env: options.env,
      maxBuffer: GIT_OUTPUT_MAX_BUFFER_BYTES,
      timeout: options.timeoutMs,
    });

    return {
      stderr: result.stderr,
      stdout: result.stdout,
    };
  }

  private createGitRequestError(error: unknown, action: string): Error {
    if (error instanceof Error) {
      return new Error(`Git request failed while trying to ${action}: ${this.normalizeGitErrorMessage(error.message)}`, {
        cause: error,
      });
    }

    return new Error(`Git request failed while trying to ${action}.`);
  }

  private normalizeGitErrorMessage(message: string): string {
    const normalizedMessage = String(message || "").trim();
    return normalizedMessage || "Unknown Git error.";
  }

  private normalizeCommandTimeoutMs(value: number | undefined): number {
    if (!Number.isFinite(value) || !value || value <= 0) {
      return DEFAULT_GIT_COMMAND_TIMEOUT_MS;
    }

    return Math.floor(value);
  }
}
