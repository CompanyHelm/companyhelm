/**
 * Normalizes user-provided GitHub repository references so the rest of the public import flow can
 * accept either `owner/repo` or full `https://github.com/owner/repo` URLs without duplicating
 * parsing logic.
 */
export class SkillGithubRepositoryReference {
  readonly owner: string;
  readonly repository: string;

  constructor(input: {
    owner: string;
    repository: string;
  }) {
    this.owner = SkillGithubRepositoryReference.requireSegment(input.owner, "GitHub repository owner");
    this.repository = SkillGithubRepositoryReference.requireSegment(
      input.repository,
      "GitHub repository name",
    );
  }

  static parse(value: string): SkillGithubRepositoryReference {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      throw new Error("GitHub repository is required.");
    }

    if (normalizedValue.startsWith("https://") || normalizedValue.startsWith("http://")) {
      const url = new URL(normalizedValue);
      if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
        throw new Error("GitHub repository URL must use github.com.");
      }

      const [owner, repository] = url.pathname
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .slice(0, 2);

      return new SkillGithubRepositoryReference({
        owner: owner ?? "",
        repository: SkillGithubRepositoryReference.stripGitSuffix(repository ?? ""),
      });
    }

    const [owner, repository] = normalizedValue.split("/").slice(0, 2);
    return new SkillGithubRepositoryReference({
      owner: owner ?? "",
      repository: SkillGithubRepositoryReference.stripGitSuffix(repository ?? ""),
    });
  }

  getFullName(): string {
    return `${this.owner}/${this.repository}`;
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

  private static stripGitSuffix(value: string): string {
    return value.replace(/\.git$/i, "");
  }
}
