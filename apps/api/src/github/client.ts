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

type CachedGithubAppJwt = {
  token: string;
  cacheExpiresAtMs: number;
};

type CachedInstallationAccessToken = {
  token: string;
  tokenExpiresAt: Date;
  cacheExpiresAtMs: number;
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
}
