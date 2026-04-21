import { injectable } from "inversify";
import { AgentEnvironmentWorkspacePath } from "../environments/workspace_path.ts";
import type { GithubRepositoryProvisioningRepositoryRecord } from "./provisioning_service.ts";

/**
 * Resolves the deterministic workspace checkout paths for pinned repositories. The user-facing
 * path follows the agent convention of `~/workspace`, while shell commands use `$HOME` so POSIX
 * shells expand the target directory reliably even when values are quoted.
 */
@injectable()
export class GithubRepositoryProvisioningPathService {
  getDisplayPath(repository: GithubRepositoryProvisioningRepositoryRecord): string {
    return `${AgentEnvironmentWorkspacePath.get()}/${this.requireRepositoryDirectoryName(repository.name)}`;
  }

  getShellWorkspaceDirectory(): string {
    return "$HOME/workspace";
  }

  getShellRepositoryDirectory(repository: GithubRepositoryProvisioningRepositoryRecord): string {
    return `${this.getShellWorkspaceDirectory()}/${this.requireRepositoryDirectoryName(repository.name)}`;
  }

  private requireRepositoryDirectoryName(repositoryName: string): string {
    if (repositoryName.length === 0) {
      throw new Error("GitHub repository name is required.");
    }
    if (repositoryName === "." || repositoryName === "..") {
      throw new Error(`GitHub repository name ${repositoryName} cannot be used as a workspace directory.`);
    }
    if (repositoryName.includes("/") || repositoryName.includes("\\")) {
      throw new Error(`GitHub repository name ${repositoryName} cannot contain path separators.`);
    }

    return repositoryName;
  }
}
