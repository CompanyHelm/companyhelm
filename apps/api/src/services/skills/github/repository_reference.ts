/**
 * Normalizes user-provided Git repository references so the import flow can accept full HTTPS Git
 * remotes from any host while keeping `owner/repo` as a GitHub shorthand for convenience.
 */
export class SkillGithubRepositoryReference {
  readonly displayName: string;
  readonly owner: string | null;
  readonly remoteUrl: string;
  readonly repository: string | null;

  constructor(input: {
    displayName: string;
    owner?: string | null;
    remoteUrl: string;
    repository?: string | null;
  }) {
    this.displayName = SkillGithubRepositoryReference.requireDisplayName(input.displayName);
    this.remoteUrl = SkillGithubRepositoryReference.requireRemoteUrl(input.remoteUrl);
    this.owner = input.owner ? SkillGithubRepositoryReference.requireSegment(input.owner, "Git repository owner") : null;
    this.repository = input.repository
      ? SkillGithubRepositoryReference.requireSegment(input.repository, "Git repository name")
      : null;
  }

  static parse(value: string): SkillGithubRepositoryReference {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      throw new Error("Git repository is required.");
    }

    if (normalizedValue.startsWith("https://") || normalizedValue.startsWith("http://")) {
      const url = new URL(normalizedValue);
      if (url.protocol !== "https:") {
        throw new Error("Git repository URL must use HTTPS.");
      }
      if (url.username || url.password) {
        throw new Error("Git repository URL must not include credentials.");
      }

      url.hash = "";
      url.search = "";
      const normalizedPath = url.pathname.replace(/^\/+|\/+$/g, "");
      const pathSegments = normalizedPath.split("/").filter((segment) => segment.length > 0);
      if (pathSegments.length < 2) {
        throw new Error("Git repository URL must include an owner and repository path.");
      }
      const isGithubHost = SkillGithubRepositoryReference.isGithubHost(url.hostname);
      if (isGithubHost && pathSegments.length !== 2) {
        throw new Error("GitHub repository URL must point to a repository root.");
      }
      const [owner, repository] = isGithubHost ? pathSegments : pathSegments.slice(-2);
      const normalizedRepository = SkillGithubRepositoryReference.stripGitSuffix(repository ?? "");
      const normalizedUrl = url.toString().replace(/\/$/u, "");
      const displayName = isGithubHost
        ? `${owner}/${normalizedRepository}`
        : SkillGithubRepositoryReference.stripGitSuffix(normalizedUrl);

      return new SkillGithubRepositoryReference({
        displayName,
        owner: owner ?? "",
        remoteUrl: normalizedUrl,
        repository: normalizedRepository,
      });
    }
    if (normalizedValue.includes("://")) {
      throw new Error("Git repository URL must use HTTPS.");
    }

    const shorthandSegments = normalizedValue.split("/").filter((segment) => segment.length > 0);
    if (shorthandSegments.length !== 2) {
      throw new Error("GitHub repository shorthand must be in owner/repository format.");
    }
    const [owner, repository] = shorthandSegments;
    return new SkillGithubRepositoryReference({
      owner: owner ?? "",
      displayName: `${owner ?? ""}/${SkillGithubRepositoryReference.stripGitSuffix(repository ?? "")}`,
      remoteUrl: `https://github.com/${owner ?? ""}/${SkillGithubRepositoryReference.stripGitSuffix(repository ?? "")}.git`,
      repository: SkillGithubRepositoryReference.stripGitSuffix(repository ?? ""),
    });
  }

  getFullName(): string {
    return this.displayName;
  }

  private static requireSegment(value: string, label: string): string {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      throw new Error(`${label} is required.`);
    }
    if (normalizedValue.includes("/")) {
      throw new Error(`${label} is invalid.`);
    }

    return normalizedValue;
  }

  private static requireDisplayName(value: string): string {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      throw new Error("Git repository display name is required.");
    }

    return normalizedValue;
  }

  private static requireRemoteUrl(value: string): string {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      throw new Error("Git repository remote URL is required.");
    }

    return normalizedValue;
  }

  private static isGithubHost(hostname: string): boolean {
    return hostname === "github.com" || hostname === "www.github.com";
  }

  private static stripGitSuffix(value: string): string {
    return value.replace(/\.git$/i, "");
  }
}
