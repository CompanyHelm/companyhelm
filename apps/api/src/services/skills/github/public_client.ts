import { injectable } from "inversify";
import { Octokit } from "octokit";
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
  status?: number;
};

/**
 * Reads public GitHub repository metadata and file contents directly from the GitHub REST API
 * using Octokit so skill discovery can stay entirely in memory without cloning repositories.
 */
@injectable()
export class SkillGithubPublicClient {
  private readonly octokit: Octokit;

  constructor(options: {
    fetchImpl?: typeof fetch;
  } = {}) {
    this.octokit = new Octokit({
      request: {
        fetch: options.fetchImpl ?? fetch,
      },
    });
  }

  async getRepositoryBranches(repository: string): Promise<{
    branches: SkillGithubRepositoryBranchRecord[];
    repository: string;
  }> {
    const repositoryReference = SkillGithubRepositoryReference.parse(repository);
    const repositoryRecord = await this.getRepositoryRecord(repositoryReference);
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

      throw error;
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

      throw error;
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

      throw error;
    }
  }

  private async listTreeEntries(
    repositoryReference: SkillGithubRepositoryReference,
    commitSha: string,
  ): Promise<SkillGithubRepositoryTreeEntry[]> {
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
}
