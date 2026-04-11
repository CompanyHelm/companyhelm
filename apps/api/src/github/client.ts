import { createSign } from "node:crypto";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";

const GITHUB_API_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_ACCEPT_HEADER = "application/vnd.github+json";
const MAX_GITHUB_JWT_TTL_SECONDS = 600;
const DEFAULT_GITHUB_JWT_TTL_SECONDS = 600;
const DEFAULT_IAT_BACKDATE_SECONDS = 60;
const INSTALLATION_REPOSITORIES_PAGE_SIZE = 100;
const INSTALLATION_TOKEN_CACHE_TTL_MS = 30 * 60 * 1000;
const INSTALLATION_TOKEN_DEFAULT_TTL_MS = 60 * 60 * 1000;
const INSTALLATION_TOKEN_EXPIRY_SKEW_MS = 60 * 1000;
const GITHUB_APP_JWT_EXPIRY_SKEW_MS = 30 * 1000;

export type GithubAuthorizationCallback = {
  installationId: number | null;
  setupAction: string | null;
  authorizationCode: string | null;
  state: string | null;
};

export type GithubInstallationRepository = {
  externalId: string;
  name: string;
  fullName: string;
  htmlUrl: string | null;
  isPrivate: boolean;
  defaultBranch: string | null;
  archived: boolean;
};

export type GithubDiscoveredSkillDirectory = {
  fileList: string[];
  name: string;
  path: string;
};

export type GithubSkillPackage = {
  branchName: string;
  description: string;
  fileList: string[];
  instructions: string;
  name: string;
  path: string;
  repositoryFullName: string;
};

type CachedGithubAppJwt = {
  token: string;
  cacheExpiresAtMs: number;
};

type CachedInstallationAccessToken = {
  token: string;
  tokenExpiresAt: Date;
  cacheExpiresAtMs: number;
};

type GithubRepositoryTreeEntry = {
  path: string;
  sha: string | null;
  type: string;
};

type IndexedGithubSkillDirectory = GithubDiscoveredSkillDirectory & {
  skillMarkdownSha: string | null;
};

class GithubApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "GithubApiError";
    this.statusCode = statusCode;
  }
}

/**
 * Wraps the minimal GitHub App behavior needed to link installations and mirror repository
 * metadata into the company-scoped cache tables.
 */
@injectable()
export class GithubClient {
  private readonly appClientId: string;
  private readonly appPrivateKeyPem: string;
  private readonly appLink: string;
  private readonly fetchImpl: typeof fetch;
  private readonly installationAccessTokenCache = new Map<number, CachedInstallationAccessToken>();
  private cachedGithubAppJwt: CachedGithubAppJwt | null = null;

  constructor(
    @inject(Config) config: Config,
    options: {
      fetchImpl?: typeof fetch;
    } = {},
  ) {
    this.appClientId = GithubClient.normalizeTextValue(config.github?.app_client_id);
    this.appPrivateKeyPem = GithubClient.normalizePrivateKeyPem(config.github?.app_private_key_pem);
    this.appLink = GithubClient.normalizeTextValue(config.github?.app_link);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  getAppClientId(): string {
    if (!this.appClientId) {
      throw new Error("GitHub app client id is not configured.");
    }

    return this.appClientId;
  }

  getAppLink(): string {
    if (!this.appLink) {
      throw new Error("GitHub app link is not configured.");
    }

    return this.appLink;
  }

  buildInstallationUrl(state: string): string {
    const normalizedState = GithubClient.normalizeTextValue(state);
    if (!normalizedState) {
      throw new Error("GitHub installation state is required.");
    }

    const url = new URL(this.getAppLink());
    if (!/\/installations\/new\/?$/.test(url.pathname)) {
      url.pathname = `${url.pathname.replace(/\/+$/, "")}/installations/new`;
    }
    url.searchParams.set("state", normalizedState);

    return url.toString();
  }

  async getInstallationRepositories(
    installationIdValue: string | number | bigint,
    options: {
      forceRefresh?: boolean;
    } = {},
  ): Promise<GithubInstallationRepository[]> {
    const installationToken = await this.getInstallationAccessToken(installationIdValue, options);
    const installationId = GithubClient.validateInstallationId(installationIdValue);
    const githubRepositories = await this.fetchInstallationRepositories(
      installationId,
      installationToken,
    );

    return this.buildInstallationRepositories(githubRepositories);
  }

  async listSkillDirectories(input: {
    defaultBranch: string;
    installationId: string | number | bigint;
    repositoryFullName: string;
  }): Promise<GithubDiscoveredSkillDirectory[]> {
    const branchName = this.requireRepositoryBranch(input.defaultBranch);
    const installationId = GithubClient.validateInstallationId(input.installationId);
    const repository = GithubClient.parseRepositoryFullName(input.repositoryFullName);
    const repositoryTree = await this.fetchRepositoryTree({
      branchName,
      installationId,
      repository,
    });
    const indexedDirectories = GithubClient.indexSkillDirectories({
      repositoryName: repository.name,
      treeEntries: repositoryTree,
    });

    return indexedDirectories.map((directory) => ({
      fileList: [...directory.fileList],
      name: directory.name,
      path: directory.path,
    }));
  }

  async getSkillPackage(input: {
    defaultBranch: string;
    installationId: string | number | bigint;
    repositoryFullName: string;
    skillDirectory: string;
  }): Promise<GithubSkillPackage> {
    const branchName = this.requireRepositoryBranch(input.defaultBranch);
    const installationId = GithubClient.validateInstallationId(input.installationId);
    const repository = GithubClient.parseRepositoryFullName(input.repositoryFullName);
    const repositoryTree = await this.fetchRepositoryTree({
      branchName,
      installationId,
      repository,
    });
    const indexedDirectories = GithubClient.indexSkillDirectories({
      repositoryName: repository.name,
      treeEntries: repositoryTree,
    });
    const normalizedSkillDirectory = GithubClient.normalizeSkillDirectoryPath(input.skillDirectory);
    const skillDirectoryRecord = indexedDirectories.find((directory) =>
      GithubClient.normalizeSkillDirectoryPath(directory.path) === normalizedSkillDirectory
    );

    if (!skillDirectoryRecord) {
      throw new Error("GitHub skill directory not found.");
    }
    if (!skillDirectoryRecord.skillMarkdownSha) {
      throw new Error("GitHub skill is missing SKILL.md content.");
    }

    const instructions = await this.fetchRepositoryBlobText({
      blobSha: skillDirectoryRecord.skillMarkdownSha,
      installationId,
      repository,
    });
    const parsedSkill = GithubClient.parseSkillMarkdown({
      fallbackDescription: `Imported from ${repository.fullName}:${skillDirectoryRecord.path}`,
      fallbackName: skillDirectoryRecord.name,
      markdown: instructions,
    });

    return {
      branchName,
      description: parsedSkill.description,
      fileList: [...skillDirectoryRecord.fileList],
      instructions,
      name: parsedSkill.name,
      path: skillDirectoryRecord.path,
      repositoryFullName: repository.fullName,
    };
  }

  async getInstallationAccessToken(
    installationIdValue: string | number | bigint,
    options: {
      forceRefresh?: boolean;
    } = {},
  ): Promise<string> {
    const installationId = GithubClient.validateInstallationId(installationIdValue);
    if (options.forceRefresh) {
      this.installationAccessTokenCache.delete(installationId);
    }

    let cachedInstallationToken = this.getCachedInstallationAccessToken(installationId);
    if (!cachedInstallationToken) {
      cachedInstallationToken = await this.requestInstallationAccessToken(installationId);
    }

    return cachedInstallationToken.token;
  }

  static validateInstallationId(value: string | number | bigint): number {
    if (typeof value === "number" || typeof value === "bigint") {
      return GithubClient.normalizePositiveSafeInteger(value);
    }

    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      throw new Error("installationId is required.");
    }
    if (!/^\d+$/.test(normalizedValue)) {
      throw new Error("installationId must be a positive integer.");
    }

    return GithubClient.normalizePositiveSafeInteger(Number(normalizedValue));
  }

  static parseAuthorizationCallback(
    value: URL | URLSearchParams | string | Record<string, string | null | undefined>,
  ): GithubAuthorizationCallback {
    const searchParams = GithubClient.parseCallbackSearchParams(value);
    const installationValue = GithubClient.normalizeTextValue(searchParams.get("installation_id"));

    return {
      installationId: installationValue
        ? GithubClient.validateInstallationId(installationValue)
        : null,
      setupAction: GithubClient.normalizeTextValue(searchParams.get("setup_action")) || null,
      authorizationCode: GithubClient.normalizeTextValue(searchParams.get("code")) || null,
      state: GithubClient.normalizeTextValue(searchParams.get("state")) || null,
    };
  }

  static generateAppJwt(params: {
    clientId: string;
    privateKeyPem: string;
    ttlSeconds?: number;
    iatBackdateSeconds?: number;
  }): {
    token: string;
    iatUnix: number;
    expUnix: number;
  } {
    const clientId = GithubClient.normalizeTextValue(params.clientId);
    const privateKeyPem = GithubClient.normalizePrivateKeyPem(params.privateKeyPem);
    const ttlSeconds = params.ttlSeconds ?? DEFAULT_GITHUB_JWT_TTL_SECONDS;
    const iatBackdateSeconds = params.iatBackdateSeconds ?? DEFAULT_IAT_BACKDATE_SECONDS;

    if (!clientId) {
      throw new Error("GitHub app client id is required.");
    }
    if (!privateKeyPem) {
      throw new Error("GitHub app private key PEM is required.");
    }
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0 || ttlSeconds > MAX_GITHUB_JWT_TTL_SECONDS) {
      throw new Error(`ttlSeconds must be between 1 and ${MAX_GITHUB_JWT_TTL_SECONDS}.`);
    }
    if (!Number.isInteger(iatBackdateSeconds) || iatBackdateSeconds < 0) {
      throw new Error("iatBackdateSeconds must be >= 0.");
    }

    const nowUnix = Math.floor(Date.now() / 1000);
    const iatUnix = nowUnix - iatBackdateSeconds;
    const expUnix = nowUnix + ttlSeconds;
    const unsignedToken = [
      GithubClient.base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
      GithubClient.base64UrlEncode(JSON.stringify({
        iss: clientId,
        iat: iatUnix,
        exp: expUnix,
      })),
    ].join(".");
    const signer = createSign("RSA-SHA256");
    signer.update(unsignedToken);
    signer.end();

    let signature: Buffer;
    try {
      signature = signer.sign(privateKeyPem);
    } catch (error) {
      throw new Error(
        "GitHub app private key PEM is invalid. Ensure the env value includes newline escapes (\\n).",
        { cause: error },
      );
    }

    return {
      token: `${unsignedToken}.${GithubClient.base64UrlEncode(signature)}`,
      iatUnix,
      expUnix,
    };
  }

  private getOrCreateGithubAppJwt(): string {
    const now = Date.now();
    if (this.cachedGithubAppJwt && this.cachedGithubAppJwt.cacheExpiresAtMs > now) {
      return this.cachedGithubAppJwt.token;
    }

    const tokenPayload = GithubClient.generateAppJwt({
      clientId: this.getAppClientId(),
      privateKeyPem: this.appPrivateKeyPem,
    });
    const expMs = tokenPayload.expUnix * 1000;
    const cacheExpiresAtMs = Math.max(now, expMs - GITHUB_APP_JWT_EXPIRY_SKEW_MS);

    this.cachedGithubAppJwt = {
      token: tokenPayload.token,
      cacheExpiresAtMs,
    };

    return tokenPayload.token;
  }

  private getCachedInstallationAccessToken(installationId: number): CachedInstallationAccessToken | null {
    const now = Date.now();
    const cachedToken = this.installationAccessTokenCache.get(installationId);
    if (!cachedToken || cachedToken.cacheExpiresAtMs <= now) {
      this.installationAccessTokenCache.delete(installationId);
      return null;
    }

    return cachedToken;
  }

  private cacheInstallationAccessToken(
    installationId: number,
    token: string,
    githubExpiresAtRaw: string | null | undefined,
  ): CachedInstallationAccessToken {
    const nowMs = Date.now();
    const parsedExpiry = GithubClient.parseIsoUtcDate(githubExpiresAtRaw);
    const tokenExpiresAtMs = parsedExpiry?.getTime() ?? (nowMs + INSTALLATION_TOKEN_DEFAULT_TTL_MS);
    const cacheExpiresAtMs = Math.min(
      nowMs + INSTALLATION_TOKEN_CACHE_TTL_MS,
      tokenExpiresAtMs - INSTALLATION_TOKEN_EXPIRY_SKEW_MS,
    );
    const cachedToken = {
      token,
      tokenExpiresAt: new Date(tokenExpiresAtMs),
      cacheExpiresAtMs,
    };

    this.installationAccessTokenCache.set(installationId, cachedToken);
    return cachedToken;
  }

  private async requestInstallationAccessToken(installationId: number): Promise<CachedInstallationAccessToken> {
    const response = await this.fetchImpl(`${GITHUB_API_URL}/app/installations/${installationId}/access_tokens`, {
      method: "POST",
      headers: {
        Accept: GITHUB_ACCEPT_HEADER,
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        Authorization: `Bearer ${this.getOrCreateGithubAppJwt()}`,
      },
    });

    if (!response.ok) {
      throw new GithubApiError(
        `Failed to create installation access token for installation ${installationId}: ${
          GithubClient.githubApiErrorMessage(await GithubClient.readResponseBody(response), response.status)
        }`,
        response.status,
      );
    }

    const payload = await response.json() as Record<string, unknown>;
    const token = GithubClient.normalizeTextValue(payload.token);
    if (!token) {
      throw new Error("GitHub installation access token response is missing token.");
    }

    return this.cacheInstallationAccessToken(
      installationId,
      token,
      GithubClient.normalizeTextValue(payload.expires_at) || null,
    );
  }

  private async fetchInstallationRepositories(
    installationId: number,
    installationToken: string,
  ): Promise<Array<Record<string, unknown>>> {
    try {
      return await this.fetchInstallationRepositoriesWithToken(installationId, installationToken);
    } catch (error) {
      if (!(error instanceof GithubApiError) || error.statusCode !== 401) {
        throw error;
      }

      this.installationAccessTokenCache.delete(installationId);
      const refreshedToken = await this.requestInstallationAccessToken(installationId);
      return this.fetchInstallationRepositoriesWithToken(installationId, refreshedToken.token);
    }
  }

  private async fetchInstallationRepositoriesWithToken(
    installationId: number,
    installationToken: string,
  ): Promise<Array<Record<string, unknown>>> {
    const repositories: Array<Record<string, unknown>> = [];
    let page = 1;

    while (true) {
      const response = await this.fetchImpl(
        `${GITHUB_API_URL}/installation/repositories?per_page=${INSTALLATION_REPOSITORIES_PAGE_SIZE}&page=${page}`,
        {
          method: "GET",
          headers: {
            Accept: GITHUB_ACCEPT_HEADER,
            "X-GitHub-Api-Version": GITHUB_API_VERSION,
            Authorization: `token ${installationToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new GithubApiError(
          `Failed to list repositories for installation ${installationId}: ${
            GithubClient.githubApiErrorMessage(await GithubClient.readResponseBody(response), response.status)
          }`,
          response.status,
        );
      }

      const payload = await response.json() as Record<string, unknown>;
      const pageRows = Array.isArray(payload.repositories)
        ? payload.repositories as Array<Record<string, unknown>>
        : [];
      repositories.push(...pageRows);

      if (pageRows.length < INSTALLATION_REPOSITORIES_PAGE_SIZE) {
        break;
      }

      page += 1;
    }

    return repositories;
  }

  private buildInstallationRepositories(
    githubRepositories: Array<Record<string, unknown>>,
  ): GithubInstallationRepository[] {
    const repositories: GithubInstallationRepository[] = [];
    const seenExternalIds = new Set<string>();

    for (const githubRepository of githubRepositories) {
      const externalId = GithubClient.normalizeGithubRepositoryId(githubRepository.id);
      const name = GithubClient.normalizeTextValue(githubRepository.name);
      const fullName = GithubClient.normalizeTextValue(githubRepository.full_name);
      if (!externalId || !name || !fullName || seenExternalIds.has(externalId)) {
        continue;
      }

      repositories.push({
        externalId,
        name,
        fullName,
        htmlUrl: GithubClient.normalizeTextValue(githubRepository.html_url) || null,
        isPrivate: Boolean(githubRepository.private),
        defaultBranch: GithubClient.normalizeTextValue(githubRepository.default_branch) || null,
        archived: Boolean(githubRepository.archived),
      });
      seenExternalIds.add(externalId);
    }

    return repositories;
  }

  private requireRepositoryBranch(value: string): string {
    const normalizedValue = GithubClient.normalizeTextValue(value);
    if (!normalizedValue) {
      throw new Error("GitHub repository default branch is required.");
    }

    return normalizedValue;
  }

  private async fetchRepositoryTree(input: {
    branchName: string;
    installationId: number;
    repository: {
      owner: string;
      name: string;
      fullName: string;
    };
  }): Promise<GithubRepositoryTreeEntry[]> {
    const payload = await this.fetchInstallationJson<Record<string, unknown>>({
      errorLabel: `Failed to read repository tree for ${input.repository.fullName}@${input.branchName}`,
      installationId: input.installationId,
      url: `${GITHUB_API_URL}/repos/${encodeURIComponent(input.repository.owner)}/${
        encodeURIComponent(input.repository.name)
      }/git/trees/${encodeURIComponent(input.branchName)}?recursive=1`,
    });
    if (payload.truncated === true) {
      throw new Error("GitHub repository tree is too large to scan for skills.");
    }

    return Array.isArray(payload.tree)
      ? payload.tree
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
        .map((entry) => ({
          path: GithubClient.normalizeTextValue(entry.path),
          sha: GithubClient.normalizeTextValue(entry.sha) || null,
          type: GithubClient.normalizeTextValue(entry.type),
        }))
        .filter((entry) => entry.path.length > 0 && entry.type.length > 0)
      : [];
  }

  private async fetchRepositoryBlobText(input: {
    blobSha: string;
    installationId: number;
    repository: {
      owner: string;
      name: string;
      fullName: string;
    };
  }): Promise<string> {
    const payload = await this.fetchInstallationJson<Record<string, unknown>>({
      errorLabel: `Failed to read ${input.repository.fullName} blob ${input.blobSha}`,
      installationId: input.installationId,
      url: `${GITHUB_API_URL}/repos/${encodeURIComponent(input.repository.owner)}/${
        encodeURIComponent(input.repository.name)
      }/git/blobs/${encodeURIComponent(input.blobSha)}`,
    });
    const encoding = GithubClient.normalizeTextValue(payload.encoding);
    const content = GithubClient.normalizeTextValue(payload.content).replace(/\s+/g, "");
    if (encoding !== "base64" || !content) {
      throw new Error("GitHub blob response is missing base64 content.");
    }

    return Buffer.from(content, "base64").toString("utf8");
  }

  private async fetchInstallationJson<T>(input: {
    errorLabel: string;
    installationId: number;
    url: string;
  }): Promise<T> {
    const executeRequest = async (token: string) => {
      const response = await this.fetchImpl(input.url, {
        method: "GET",
        headers: {
          Accept: GITHUB_ACCEPT_HEADER,
          "X-GitHub-Api-Version": GITHUB_API_VERSION,
          Authorization: `token ${token}`,
        },
      });

      if (!response.ok) {
        throw new GithubApiError(
          `${input.errorLabel}: ${
            GithubClient.githubApiErrorMessage(await GithubClient.readResponseBody(response), response.status)
          }`,
          response.status,
        );
      }

      return response.json() as Promise<T>;
    };

    try {
      return await executeRequest(await this.getInstallationAccessToken(input.installationId));
    } catch (error) {
      if (!(error instanceof GithubApiError) || error.statusCode !== 401) {
        throw error;
      }

      return executeRequest(await this.getInstallationAccessToken(input.installationId, {
        forceRefresh: true,
      }));
    }
  }

  private static parseCallbackSearchParams(
    value: URL | URLSearchParams | string | Record<string, string | null | undefined>,
  ): URLSearchParams {
    if (value instanceof URL) {
      return value.searchParams;
    }
    if (value instanceof URLSearchParams) {
      return value;
    }
    if (typeof value === "string") {
      const normalizedValue = value.trim();
      if (!normalizedValue) {
        return new URLSearchParams();
      }
      if (normalizedValue.startsWith("?")) {
        return new URLSearchParams(normalizedValue.slice(1));
      }
      if (normalizedValue.includes("://")) {
        return new URL(normalizedValue).searchParams;
      }

      return new URLSearchParams(normalizedValue);
    }

    const searchParams = new URLSearchParams();
    for (const [key, entry] of Object.entries(value)) {
      if (entry == null) {
        continue;
      }
      searchParams.set(key, entry);
    }

    return searchParams;
  }

  private static normalizePositiveSafeInteger(value: number | bigint): number {
    if (typeof value === "bigint") {
      if (value <= 0n) {
        throw new Error("installationId must be a positive integer.");
      }
      if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("installationId is too large.");
      }

      return Number(value);
    }

    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error("installationId must be a positive integer.");
    }

    return value;
  }

  private static normalizeTextValue(value: unknown): string {
    return String(value ?? "").trim();
  }

  private static normalizePrivateKeyPem(value: unknown): string {
    let normalizedValue = GithubClient.normalizeTextValue(value);
    if (
      (normalizedValue.startsWith("\"") && normalizedValue.endsWith("\""))
      || (normalizedValue.startsWith("'") && normalizedValue.endsWith("'"))
    ) {
      normalizedValue = normalizedValue.slice(1, -1).trim();
    }

    return normalizedValue
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .trim();
  }

  private static base64UrlEncode(value: Buffer | string): string {
    const encodedValue = Buffer.isBuffer(value)
      ? value.toString("base64")
      : Buffer.from(value).toString("base64");

    return encodedValue.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  private static async readResponseBody(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return "";
    }
  }

  private static githubApiErrorMessage(rawBody: string, status: number): string {
    const normalizedBody = String(rawBody || "").trim();
    if (!normalizedBody) {
      return `GitHub API request failed with status ${status}.`;
    }

    try {
      const parsedBody = JSON.parse(normalizedBody) as Record<string, unknown>;
      const message = GithubClient.normalizeTextValue(parsedBody.message);
      if (message) {
        return message;
      }
    } catch {
      return normalizedBody.slice(0, 500);
    }

    return normalizedBody.slice(0, 500);
  }

  private static parseIsoUtcDate(rawValue: string | null | undefined): Date | null {
    const normalizedValue = GithubClient.normalizeTextValue(rawValue);
    if (!normalizedValue) {
      return null;
    }

    const parsedDate = new Date(normalizedValue);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  private static normalizeGithubRepositoryId(value: unknown): string | null {
    if (typeof value === "boolean" || value == null) {
      return null;
    }
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || value <= 0) {
        return null;
      }

      return String(value);
    }
    if (typeof value === "bigint") {
      return value > 0n ? value.toString() : null;
    }

    const normalizedValue = GithubClient.normalizeTextValue(value);
    if (!/^\d+$/.test(normalizedValue)) {
      return null;
    }

    return normalizedValue;
  }

  private static parseRepositoryFullName(value: string): {
    owner: string;
    name: string;
    fullName: string;
  } {
    const normalizedValue = GithubClient.normalizeTextValue(value);
    const [owner, name, ...rest] = normalizedValue.split("/");
    if (!owner || !name || rest.length > 0) {
      throw new Error("GitHub repository full name must be in owner/name format.");
    }

    return {
      owner,
      name,
      fullName: `${owner}/${name}`,
    };
  }

  private static indexSkillDirectories(input: {
    repositoryName: string;
    treeEntries: GithubRepositoryTreeEntry[];
  }): IndexedGithubSkillDirectory[] {
    const skillDirectoryRecords = new Map<string, IndexedGithubSkillDirectory>();

    for (const entry of input.treeEntries) {
      if (entry.type !== "blob") {
        continue;
      }

      const normalizedPath = GithubClient.normalizeRepositoryTreePath(entry.path);
      if (!normalizedPath.endsWith("SKILL.md")) {
        continue;
      }

      const normalizedDirectory = GithubClient.normalizeSkillDirectoryPath(
        normalizedPath === "SKILL.md" ? "." : normalizedPath.slice(0, -"/SKILL.md".length),
      );
      skillDirectoryRecords.set(normalizedDirectory, {
        fileList: [],
        name: GithubClient.buildSkillDirectoryName(normalizedDirectory, input.repositoryName),
        path: GithubClient.displaySkillDirectoryPath(normalizedDirectory),
        skillMarkdownSha: entry.sha,
      });
    }

    const sortedDirectories = [...skillDirectoryRecords.keys()].sort((left, right) => right.length - left.length);
    for (const entry of input.treeEntries) {
      if (entry.type !== "blob") {
        continue;
      }

      const normalizedPath = GithubClient.normalizeRepositoryTreePath(entry.path);
      const nearestDirectory = sortedDirectories.find((directory) =>
        GithubClient.pathBelongsToDirectory(normalizedPath, directory)
      );
      if (!nearestDirectory) {
        continue;
      }

      const directoryRecord = skillDirectoryRecords.get(nearestDirectory);
      if (!directoryRecord) {
        continue;
      }

      const relativePath = GithubClient.relativePathWithinDirectory(normalizedPath, nearestDirectory);
      if (relativePath === "SKILL.md") {
        directoryRecord.skillMarkdownSha = entry.sha;
        continue;
      }

      directoryRecord.fileList.push(relativePath);
    }

    return [...skillDirectoryRecords.values()]
      .map((directory) => ({
        ...directory,
        fileList: [...new Set(directory.fileList)].sort((left, right) => left.localeCompare(right)),
      }))
      .sort((left, right) => left.path.localeCompare(right.path));
  }

  private static parseSkillMarkdown(input: {
    fallbackDescription: string;
    fallbackName: string;
    markdown: string;
  }): {
    description: string;
    name: string;
  } {
    const lines = input.markdown.split(/\r?\n/);
    const headingLine = lines.find((line) => /^#\s+/.test(line.trim()));
    const headingName = headingLine
      ? GithubClient.normalizeTextValue(headingLine.replace(/^#\s+/, ""))
      : "";
    const descriptionParagraph = GithubClient.extractMarkdownParagraph(lines);

    return {
      description: descriptionParagraph || input.fallbackDescription,
      name: headingName || input.fallbackName,
    };
  }

  private static extractMarkdownParagraph(lines: string[]): string {
    const paragraphLines: string[] = [];
    let inCodeFence = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith("```")) {
        inCodeFence = !inCodeFence;
        continue;
      }
      if (inCodeFence) {
        continue;
      }
      if (line.length === 0) {
        if (paragraphLines.length > 0) {
          break;
        }
        continue;
      }
      if (line.startsWith("#")) {
        continue;
      }
      if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
        if (paragraphLines.length === 0) {
          continue;
        }
        break;
      }

      paragraphLines.push(line);
    }

    return paragraphLines.join(" ").trim();
  }

  private static buildSkillDirectoryName(directoryPath: string, repositoryName: string): string {
    const normalizedDirectory = GithubClient.normalizeSkillDirectoryPath(directoryPath);
    const basename = normalizedDirectory
      ? normalizedDirectory.split("/").filter(Boolean).at(-1) ?? repositoryName
      : repositoryName;

    return basename
      .split(/[-_]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  }

  private static normalizeRepositoryTreePath(value: string): string {
    return GithubClient.normalizeTextValue(value).replace(/^\/+/, "").replace(/\/+$/, "");
  }

  private static normalizeSkillDirectoryPath(value: string): string {
    const normalizedValue = GithubClient.normalizeRepositoryTreePath(value);
    if (normalizedValue === "." || normalizedValue.length === 0) {
      return "";
    }

    return normalizedValue;
  }

  private static displaySkillDirectoryPath(value: string): string {
    const normalizedValue = GithubClient.normalizeSkillDirectoryPath(value);
    return normalizedValue || ".";
  }

  private static pathBelongsToDirectory(path: string, directoryPath: string): boolean {
    const normalizedDirectory = GithubClient.normalizeSkillDirectoryPath(directoryPath);
    if (!normalizedDirectory) {
      return true;
    }

    return path === normalizedDirectory || path.startsWith(`${normalizedDirectory}/`);
  }

  private static relativePathWithinDirectory(path: string, directoryPath: string): string {
    const normalizedDirectory = GithubClient.normalizeSkillDirectoryPath(directoryPath);
    if (!normalizedDirectory) {
      return path;
    }

    return path.slice(normalizedDirectory.length + 1);
  }
}
