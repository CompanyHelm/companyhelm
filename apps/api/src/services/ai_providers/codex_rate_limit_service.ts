import { Buffer } from "node:buffer";
import { and, eq, notInArray } from "drizzle-orm";
import { injectable } from "inversify";
import { codexRateLimitSnapshots } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";

export type CodexRateLimitRefreshCredential = {
  apiKey: string;
  baseUrl: string | null;
  companyId: string;
  credentialId: string;
  modelProvider: string;
};

type CodexRateLimitWindow = {
  resetsAt: Date | null;
  usedPercent: number | null;
  windowMinutes: number | null;
};

type CodexRateLimitCredits = {
  balance: string | null;
  hasCredits: boolean | null;
  unlimited: boolean | null;
};

type CodexRateLimitSnapshotPayload = {
  credits: CodexRateLimitCredits;
  limitId: string;
  limitName: string | null;
  planType: string | null;
  primary: CodexRateLimitWindow;
  rateLimitReachedType: string | null;
  secondary: CodexRateLimitWindow;
};

type CodexRateLimitSnapshotInsert = typeof codexRateLimitSnapshots.$inferInsert;

/**
 * Fetches Codex subscription usage and persists it as small DB snapshots. The in-memory throttle
 * prevents a busy session from repeatedly hitting ChatGPT or rewriting identical rows.
 */
@injectable()
export class CodexRateLimitService {
  private static readonly codexProviderId = "openai-codex";
  private static readonly defaultCodexBaseUrl = "https://chatgpt.com/backend-api";
  private static readonly refreshThrottleMilliseconds = 5 * 60 * 1000;
  private static readonly authClaim = "https://api.openai.com/auth";
  private static readonly accountIdClaim = "https://api.openai.com/auth.chatgpt_account_id";
  private static readonly lastAttemptAtByCredentialKey = new Map<string, number>();
  private static readonly pendingRefreshByCredentialKey = new Map<string, Promise<void>>();

  async refreshCredentialLimits(
    transactionProvider: TransactionProviderInterface,
    credential: CodexRateLimitRefreshCredential,
    refreshedAt: Date = new Date(),
    options: {
      force?: boolean;
    } = {},
  ): Promise<void> {
    if (credential.modelProvider !== CodexRateLimitService.codexProviderId) {
      return;
    }

    const credentialKey = this.createCredentialKey(credential);
    const nowMilliseconds = refreshedAt.getTime();
    const pendingRefresh = CodexRateLimitService.pendingRefreshByCredentialKey.get(credentialKey);
    if (pendingRefresh) {
      await pendingRefresh;
      return;
    }

    const lastAttemptAtMilliseconds = CodexRateLimitService.lastAttemptAtByCredentialKey.get(credentialKey);
    if (
      !options.force
      && typeof lastAttemptAtMilliseconds === "number"
      && nowMilliseconds - lastAttemptAtMilliseconds < CodexRateLimitService.refreshThrottleMilliseconds
    ) {
      return;
    }

    CodexRateLimitService.lastAttemptAtByCredentialKey.set(credentialKey, nowMilliseconds);
    const refreshPromise = this.refreshCredentialLimitsUnthrottled(transactionProvider, credential, refreshedAt);
    CodexRateLimitService.pendingRefreshByCredentialKey.set(credentialKey, refreshPromise);
    try {
      await refreshPromise;
    } finally {
      CodexRateLimitService.pendingRefreshByCredentialKey.delete(credentialKey);
    }
  }

  clearMemoryCacheForTests(): void {
    CodexRateLimitService.lastAttemptAtByCredentialKey.clear();
    CodexRateLimitService.pendingRefreshByCredentialKey.clear();
  }

  private async refreshCredentialLimitsUnthrottled(
    transactionProvider: TransactionProviderInterface,
    credential: CodexRateLimitRefreshCredential,
    refreshedAt: Date,
  ): Promise<void> {
    try {
      const payload = await this.fetchCodexUsage(credential);
      const snapshots = this.parseSnapshots(payload);
      await this.persistSnapshots(transactionProvider, credential, snapshots, refreshedAt);
    } catch (error: unknown) {
      await this.persistRefreshError(transactionProvider, credential, refreshedAt, this.resolveErrorMessage(error));
      throw error;
    }
  }

  private async fetchCodexUsage(credential: CodexRateLimitRefreshCredential): Promise<unknown> {
    const accessToken = credential.apiKey.trim();
    if (!accessToken) {
      throw new Error("Codex credential is missing an access token.");
    }

    const response = await fetch(this.resolveUsageUrl(credential.baseUrl), {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
        "chatgpt-account-id": this.extractAccountId(accessToken),
        originator: "pi",
        "user-agent": "CompanyHelm Codex Limit Tracker",
      },
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`Codex usage request failed with status ${response.status}.`);
    }

    return response.json();
  }

  private async persistSnapshots(
    transactionProvider: TransactionProviderInterface,
    credential: CodexRateLimitRefreshCredential,
    snapshots: CodexRateLimitSnapshotPayload[],
    refreshedAt: Date,
  ): Promise<void> {
    const records = snapshots.map((snapshot) => this.buildCompanySnapshotRecord(credential, snapshot, refreshedAt));
    if (records.length === 0) {
      await this.persistRefreshError(transactionProvider, credential, refreshedAt, "Codex usage response had no limits.");
      return;
    }

    await transactionProvider.transaction(async (tx) => {
      for (const record of records) {
        await tx
          .insert(codexRateLimitSnapshots)
          .values(record)
          .onConflictDoUpdate({
            target: [
              codexRateLimitSnapshots.companyId,
              codexRateLimitSnapshots.credentialId,
              codexRateLimitSnapshots.limitId,
            ],
            set: {
              creditsBalance: record.creditsBalance,
              creditsHasCredits: record.creditsHasCredits,
              creditsUnlimited: record.creditsUnlimited,
              lastError: null,
              limitName: record.limitName,
              planType: record.planType,
              primaryResetsAt: record.primaryResetsAt,
              primaryUsedPercent: record.primaryUsedPercent,
              primaryWindowMinutes: record.primaryWindowMinutes,
              rateLimitReachedType: record.rateLimitReachedType,
              refreshedAt: record.refreshedAt,
              secondaryResetsAt: record.secondaryResetsAt,
              secondaryUsedPercent: record.secondaryUsedPercent,
              secondaryWindowMinutes: record.secondaryWindowMinutes,
              updatedAt: record.updatedAt,
            },
          });
      }

      await tx.delete(codexRateLimitSnapshots).where(and(
        eq(codexRateLimitSnapshots.companyId, credential.companyId),
        eq(codexRateLimitSnapshots.credentialId, credential.credentialId),
        notInArray(codexRateLimitSnapshots.limitId, records.map((record) => record.limitId)),
      ));
    });
  }

  private async persistRefreshError(
    transactionProvider: TransactionProviderInterface,
    credential: CodexRateLimitRefreshCredential,
    refreshedAt: Date,
    lastError: string,
  ): Promise<void> {
    const record = this.buildCompanyErrorSnapshotRecord(credential, refreshedAt, lastError);
    await transactionProvider.transaction(async (tx) => {
      await tx
        .insert(codexRateLimitSnapshots)
        .values(record)
        .onConflictDoUpdate({
          target: [
            codexRateLimitSnapshots.companyId,
            codexRateLimitSnapshots.credentialId,
            codexRateLimitSnapshots.limitId,
          ],
          set: {
            lastError: record.lastError,
            refreshedAt: record.refreshedAt,
            updatedAt: record.updatedAt,
          },
        });
    });
  }

  private parseSnapshots(payload: unknown): CodexRateLimitSnapshotPayload[] {
    if (!this.isRecord(payload)) {
      return [];
    }

    const snapshots: CodexRateLimitSnapshotPayload[] = [];
    snapshots.push({
      credits: this.parseCredits(payload.credits),
      limitId: "codex",
      limitName: "Codex",
      planType: this.readString(payload.plan_type ?? payload.planType),
      primary: this.parseWindow(
        this.readRecord(payload.rate_limit ?? payload.rateLimit)?.primary_window
          ?? this.readRecord(payload.rate_limit ?? payload.rateLimit)?.primaryWindow,
      ),
      rateLimitReachedType: this.parseRateLimitReachedType(payload.rate_limit_reached_type),
      secondary: this.parseWindow(
        this.readRecord(payload.rate_limit ?? payload.rateLimit)?.secondary_window
          ?? this.readRecord(payload.rate_limit ?? payload.rateLimit)?.secondaryWindow,
      ),
    });

    const additionalLimits = this.readArray(payload.additional_rate_limits ?? payload.additionalRateLimits);
    for (const additionalLimit of additionalLimits) {
      const additionalLimitRecord = this.readRecord(additionalLimit);
      if (!additionalLimitRecord) {
        continue;
      }

      const limitId = this.readString(additionalLimitRecord.metered_feature ?? additionalLimitRecord.limit_id);
      if (!limitId) {
        continue;
      }

      const rateLimit = this.readRecord(additionalLimitRecord.rate_limit ?? additionalLimitRecord.rateLimit);
      snapshots.push({
        credits: {
          balance: null,
          hasCredits: null,
          unlimited: null,
        },
        limitId,
        limitName: this.readString(additionalLimitRecord.limit_name ?? additionalLimitRecord.limitName),
        planType: this.readString(additionalLimitRecord.plan_type ?? additionalLimitRecord.planType),
        primary: this.parseWindow(rateLimit?.primary_window ?? rateLimit?.primaryWindow),
        rateLimitReachedType: null,
        secondary: this.parseWindow(rateLimit?.secondary_window ?? rateLimit?.secondaryWindow),
      });
    }

    return snapshots;
  }

  private parseWindow(value: unknown): CodexRateLimitWindow {
    const record = this.readRecord(value);
    return {
      resetsAt: this.parseDate(record?.reset_at ?? record?.resets_at ?? record?.resetAt),
      usedPercent: this.readNumber(record?.used_percent ?? record?.usedPercent),
      windowMinutes: this.readNumber(record?.window_minutes ?? record?.windowMinutes),
    };
  }

  private parseCredits(value: unknown): CodexRateLimitCredits {
    const record = this.readRecord(value);
    return {
      balance: this.readString(record?.balance),
      hasCredits: this.readBoolean(record?.has_credits ?? record?.hasCredits),
      unlimited: this.readBoolean(record?.unlimited),
    };
  }

  private parseRateLimitReachedType(value: unknown): string | null {
    if (typeof value === "string") {
      return value.trim() || null;
    }

    const record = this.readRecord(value);
    return this.readString(record?.kind ?? record?.type);
  }

  private buildCompanySnapshotRecord(
    credential: CodexRateLimitRefreshCredential,
    snapshot: CodexRateLimitSnapshotPayload,
    timestamp: Date,
  ): CodexRateLimitSnapshotInsert {
    return {
      companyId: credential.companyId,
      credentialId: credential.credentialId,
      creditsBalance: snapshot.credits.balance,
      creditsHasCredits: snapshot.credits.hasCredits,
      creditsUnlimited: snapshot.credits.unlimited,
      lastError: null,
      limitId: snapshot.limitId,
      limitName: snapshot.limitName,
      planType: snapshot.planType,
      primaryResetsAt: snapshot.primary.resetsAt,
      primaryUsedPercent: snapshot.primary.usedPercent,
      primaryWindowMinutes: snapshot.primary.windowMinutes,
      rateLimitReachedType: snapshot.rateLimitReachedType,
      refreshedAt: timestamp,
      secondaryResetsAt: snapshot.secondary.resetsAt,
      secondaryUsedPercent: snapshot.secondary.usedPercent,
      secondaryWindowMinutes: snapshot.secondary.windowMinutes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private buildCompanyErrorSnapshotRecord(
    credential: CodexRateLimitRefreshCredential,
    timestamp: Date,
    lastError: string,
  ): CodexRateLimitSnapshotInsert {
    return {
      companyId: credential.companyId,
      credentialId: credential.credentialId,
      creditsBalance: null,
      creditsHasCredits: null,
      creditsUnlimited: null,
      lastError,
      limitId: "codex",
      limitName: "Codex",
      planType: null,
      primaryResetsAt: null,
      primaryUsedPercent: null,
      primaryWindowMinutes: null,
      rateLimitReachedType: null,
      refreshedAt: timestamp,
      secondaryResetsAt: null,
      secondaryUsedPercent: null,
      secondaryWindowMinutes: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private resolveUsageUrl(baseUrl: string | null): string {
    const normalizedBaseUrl = String(baseUrl || CodexRateLimitService.defaultCodexBaseUrl).trim()
      || CodexRateLimitService.defaultCodexBaseUrl;
    return `${normalizedBaseUrl.replace(/\/+$/, "")}/wham/usage`;
  }

  private extractAccountId(accessToken: string): string {
    const tokenParts = accessToken.split(".");
    if (tokenParts.length < 2) {
      throw new Error("Codex access token is not a valid JWT.");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(Buffer.from(tokenParts[1], "base64url").toString("utf8"));
    } catch {
      throw new Error("Codex access token payload could not be decoded.");
    }

    const payloadRecord = this.readRecord(payload);
    const accountId = this.readString(payloadRecord?.[CodexRateLimitService.accountIdClaim])
      ?? this.readString(this.readRecord(payloadRecord?.[CodexRateLimitService.authClaim])?.chatgpt_account_id);
    if (!accountId) {
      throw new Error("Codex access token is missing the ChatGPT account ID.");
    }

    return accountId;
  }

  private createCredentialKey(credential: CodexRateLimitRefreshCredential): string {
    return credential.credentialId;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return "Codex usage request failed.";
  }

  private readRecord(value: unknown): Record<string, unknown> | null {
    if (!this.isRecord(value)) {
      return null;
    }

    return value;
  }

  private readArray(value: unknown): unknown[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value;
  }

  private readString(value: unknown): string | null {
    if (typeof value !== "string" && typeof value !== "number") {
      return null;
    }

    const normalizedValue = String(value).trim();
    return normalizedValue || null;
  }

  private readNumber(value: unknown): number | null {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return null;
    }

    return numericValue;
  }

  private readBoolean(value: unknown): boolean | null {
    if (typeof value === "boolean") {
      return value;
    }

    return null;
  }

  private parseDate(value: unknown): Date | null {
    if (typeof value !== "string" && typeof value !== "number") {
      return null;
    }

    const timestampValue = typeof value === "number" && value > 0 && value < 1_000_000_000_000
      ? value * 1000
      : value;
    const date = new Date(timestampValue);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
