import { injectable } from "inversify";
import { createOAuthAppAuth } from "@octokit/auth-oauth-app";
import { Octokit, RequestError } from "octokit";
import type { Config } from "../../../config/schema.ts";
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

type OctokitError = Error & {
  request?: {
    method?: string;
    url?: string;
  };
  response?: {
    data?: {
      message?: string;
    };
    headers?: Record<string, string | number | undefined>;
  };
  status?: number;
};

type SkillGithubPublicClientOptions = {
  fetchImpl?: typeof fetch;
  github?: Pick<Config["github"], "app_client_id" | "app_client_secret">;
  requestTimeoutMs?: number;
};

const DEFAULT_GITHUB_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Reads public GitHub repository metadata and file contents directly from the GitHub REST API
 * using Octokit so skill discovery can stay entirely in memory without cloning repositories.
 */
@injectable()
export class SkillGithubPublicClient {
  private readonly octokit: Octokit;
  private readonly fetchImpl: typeof fetch;
  private readonly requestTimeoutMs: number;

  constructor(options: SkillGithubPublicClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.requestTimeoutMs = this.normalizeRequestTimeoutMs(options.requestTimeoutMs);
    this.octokit = this.createOctokit(options.github);
  }

  async getRepositoryBranches(repository: string): Promise<{
    branches: SkillGithubRepositoryBranchRecord[];
    repository: string;
  }> {
    const repositoryReference = SkillGithubRepositoryReference.parse(repository);
    const repositoryRecord = await this.getRepositoryRecord(repositoryReference);
    try {
      const defaultBranchName = String(repositoryRecord.data.default_branch || "").trim();
      const branchResponses = await this.octokit.paginate(this.octokit.rest.repos.listBranches, {
        owner: repositoryReference.owner,
        per_page: 100,
        repo: repositoryReference.repository,
      });

      return {
        branches: branchResponses
          .map((branchResponse) => ({
            commitSha: String(branchResponse.commit.sha || "").trim(),
            isDefault: branchResponse.name === defaultBranchName,
            name: String(branchResponse.name || "").trim(),
          }))
          .filter((branchResponse) => branchResponse.name.length > 0 && branchResponse.commitSha.length > 0)
          .sort((left, right) => {
            if (left.isDefault && !right.isDefault) {
              return -1;
            }
            if (!left.isDefault && right.isDefault) {
              return 1;
            }

            return left.name.localeCompare(right.name);
          }),
        repository: repositoryRecord.data.full_name,
      };
    } catch (error: unknown) {
      throw this.createGithubRequestError(error, "list GitHub branches");
    }
  }

  async getRepositoryTree(
    repository: string,
    branchName?: string,
  ): Promise<SkillGithubRepositoryTreeRecord> {
    const repositoryReference = SkillGithubRepositoryReference.parse(repository);
    const repositoryRecord = await this.getRepositoryRecord(repositoryReference);
    const resolvedBranchName = this.requireBranchName(
      branchName ?? repositoryRecord.data.default_branch ?? "",
    );
    const branchRecord = await this.getBranchRecord(repositoryReference, resolvedBranchName);
    const treeEntries = await this.listTreeEntries(repositoryReference, branchRecord.data.commit.sha);

    return {
      branchName: branchRecord.data.name,
      commitSha: branchRecord.data.commit.sha,
      repository: repositoryRecord.data.full_name,
      treeEntries,
    };
  }

  async readBlob(repository: string, blobSha: string): Promise<string> {
    const repositoryReference = SkillGithubRepositoryReference.parse(repository);
    const normalizedBlobSha = String(blobSha || "").trim();
    if (!normalizedBlobSha) {
      throw new Error("GitHub blob sha is required.");
    }

    try {
      const blobRecord = await this.octokit.rest.git.getBlob({
        file_sha: normalizedBlobSha,
        owner: repositoryReference.owner,
        repo: repositoryReference.repository,
      });

      return this.decodeBlobContent(blobRecord.data.content, blobRecord.data.encoding);
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new Error("GitHub file could not be read.", {
          cause: error,
        });
      }

      throw this.createGithubRequestError(error, "read the GitHub file");
    }
  }

  private async getRepositoryRecord(repositoryReference: SkillGithubRepositoryReference) {
    try {
      const repositoryRecord = await this.octokit.rest.repos.get({
        owner: repositoryReference.owner,
        repo: repositoryReference.repository,
      });
      if (repositoryRecord.data.private) {
        throw new Error("Only public GitHub repositories are supported.");
      }

      return repositoryRecord;
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "Only public GitHub repositories are supported.") {
        throw error;
      }
      if (this.isNotFoundError(error)) {
        throw new Error("Public GitHub repository not found.", {
          cause: error,
        });
      }

      throw this.createGithubRequestError(error, "read the GitHub repository");
    }
  }

  private async getBranchRecord(
    repositoryReference: SkillGithubRepositoryReference,
    branchName: string,
  ) {
    try {
      return await this.octokit.rest.repos.getBranch({
        branch: branchName,
        owner: repositoryReference.owner,
        repo: repositoryReference.repository,
      });
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new Error("GitHub branch not found.", {
          cause: error,
        });
      }

      throw this.createGithubRequestError(error, "read the GitHub branch");
    }
  }

  private async listTreeEntries(
    repositoryReference: SkillGithubRepositoryReference,
    commitSha: string,
  ): Promise<SkillGithubRepositoryTreeEntry[]> {
    try {
      const recursiveTree = await this.octokit.rest.git.getTree({
        owner: repositoryReference.owner,
        recursive: "true",
        repo: repositoryReference.repository,
        tree_sha: commitSha,
      });
      if (!recursiveTree.data.truncated) {
        return recursiveTree.data.tree
          .map((treeEntry) => this.toBlobTreeEntry(treeEntry.path, treeEntry.sha, treeEntry.type))
          .filter((treeEntry): treeEntry is SkillGithubRepositoryTreeEntry => treeEntry !== null)
          .sort((left, right) => left.path.localeCompare(right.path));
      }

      const treeEntries: SkillGithubRepositoryTreeEntry[] = [];
      const pendingTrees = [{
        prefix: "",
        treeSha: commitSha,
      }];

      while (pendingTrees.length > 0) {
        const nextTree = pendingTrees.shift();
        if (!nextTree) {
          continue;
        }

        const treeResponse = await this.octokit.rest.git.getTree({
          owner: repositoryReference.owner,
          repo: repositoryReference.repository,
          tree_sha: nextTree.treeSha,
        });

        for (const treeEntry of treeResponse.data.tree) {
          const normalizedPath = this.joinTreePath(nextTree.prefix, treeEntry.path);
          if (!normalizedPath) {
            continue;
          }
          if (treeEntry.type === "tree" && treeEntry.sha) {
            pendingTrees.push({
              prefix: normalizedPath,
              treeSha: treeEntry.sha,
            });
            continue;
          }

          const blobTreeEntry = this.toBlobTreeEntry(normalizedPath, treeEntry.sha, treeEntry.type);
          if (blobTreeEntry) {
            treeEntries.push(blobTreeEntry);
          }
        }
      }

      return treeEntries.sort((left, right) => left.path.localeCompare(right.path));
    } catch (error: unknown) {
      throw this.createGithubRequestError(error, "read the GitHub repository tree");
    }
  }

  private decodeBlobContent(content: string, encoding?: string): string {
    const normalizedEncoding = String(encoding || "").trim().toLowerCase();
    if (normalizedEncoding === "base64") {
      return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8");
    }
    if (normalizedEncoding === "utf-8" || normalizedEncoding === "utf8") {
      return content;
    }

    throw new Error(`GitHub blob encoding ${normalizedEncoding || "unknown"} is not supported.`);
  }

  private joinTreePath(prefix: string, path?: string | null): string {
    const normalizedPath = String(path || "").trim();
    if (!normalizedPath) {
      return "";
    }
    if (!prefix) {
      return normalizedPath;
    }

    return `${prefix}/${normalizedPath}`;
  }

  private requireBranchName(value: string): string {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      throw new Error("GitHub repository default branch is not available.");
    }

    return normalizedValue;
  }

  private toBlobTreeEntry(
    path?: string | null,
    sha?: string | null,
    type?: string | null,
  ): SkillGithubRepositoryTreeEntry | null {
    const normalizedPath = String(path || "").trim();
    const normalizedSha = String(sha || "").trim();
    if (!normalizedPath || !normalizedSha || type !== "blob") {
      return null;
    }

    return {
      path: normalizedPath,
      sha: normalizedSha,
      type: "blob",
    };
  }

  private isNotFoundError(error: unknown): error is OctokitError {
    return typeof error === "object"
      && error !== null
      && "status" in error
      && Number((error as { status?: unknown }).status) === 404;
  }

  private createOctokit(github: SkillGithubPublicClientOptions["github"]): Octokit {
    const clientId = String(github?.app_client_id ?? "").trim();
    const clientSecret = String(github?.app_client_secret ?? "").trim();
    const baseOptions = {
      retry: {
        enabled: false,
      },
      throttle: {
        enabled: false,
      },
      request: {
        fetch: this.createTimedFetch(),
      },
    };

    if (!clientId || !clientSecret) {
      return new Octokit(baseOptions);
    }

    return new Octokit({
      ...baseOptions,
      auth: {
        clientId,
        clientSecret,
      },
      authStrategy: createOAuthAppAuth,
    });
  }

  private createTimedFetch(): typeof fetch {
    return async (resource: string | URL | Request, init?: RequestInit) => {
      const timeoutController = new AbortController();
      const timeoutHandle = setTimeout(() => {
        timeoutController.abort();
      }, this.requestTimeoutMs);
      const signal = this.mergeAbortSignals(init?.signal, timeoutController.signal);

      try {
        return await this.fetchImpl(resource, {
          ...init,
          signal,
        });
      } catch (error: unknown) {
        if (timeoutController.signal.aborted) {
          throw new Error(`GitHub request timed out after ${this.requestTimeoutMs}ms.`, {
            cause: error,
          });
        }

        throw error;
      } finally {
        clearTimeout(timeoutHandle);
      }
    };
  }

  private mergeAbortSignals(
    leftSignal: AbortSignal | null | undefined,
    rightSignal: AbortSignal | null | undefined,
  ): AbortSignal | undefined {
    if (leftSignal && rightSignal) {
      return AbortSignal.any([leftSignal, rightSignal]);
    }

    return leftSignal ?? rightSignal ?? undefined;
  }

  private createGithubRequestError(error: unknown, action: string): Error {
    if (this.isTimedOutError(error)) {
      return new Error(`GitHub request timed out while trying to ${action}.`, {
        cause: error,
      });
    }

    if (this.isRateLimitedError(error)) {
      return new Error(`GitHub API request quota is exhausted while trying to ${action}. Please try again later.`, {
        cause: error,
      });
    }

    if (error instanceof RequestError || this.isOctokitError(error)) {
      const message = this.normalizeGithubErrorMessage(error.message);
      return new Error(`GitHub request failed while trying to ${action}: ${message}`, {
        cause: error,
      });
    }

    if (error instanceof Error) {
      return new Error(`GitHub request failed while trying to ${action}: ${this.normalizeGithubErrorMessage(error.message)}`, {
        cause: error,
      });
    }

    return new Error(`GitHub request failed while trying to ${action}.`);
  }

  private isTimedOutError(error: unknown): error is Error {
    return error instanceof Error && /timed out after \d+ms/i.test(error.message);
  }

  private isRateLimitedError(error: unknown): error is OctokitError {
    if (!this.isOctokitError(error)) {
      return false;
    }

    const message = this.normalizeGithubErrorMessage(error.message).toLowerCase();
    const remaining = String(error.response?.headers?.["x-ratelimit-remaining"] ?? "").trim();
    return remaining === "0"
      || Number(error.status) === 429
      || message.includes("rate limit")
      || message.includes("quota exhausted")
      || message.includes("secondary rate");
  }

  private isOctokitError(error: unknown): error is OctokitError {
    return typeof error === "object"
      && error !== null
      && "message" in error
      && typeof (error as { message?: unknown }).message === "string"
      && "status" in error;
  }

  private normalizeGithubErrorMessage(message: string): string {
    const normalizedMessage = String(message || "").trim();
    return normalizedMessage || "Unknown GitHub API error.";
  }

  private normalizeRequestTimeoutMs(value: number | undefined): number {
    if (!Number.isFinite(value) || !value || value <= 0) {
      return DEFAULT_GITHUB_REQUEST_TIMEOUT_MS;
    }

    return Math.floor(value);
  }
}
