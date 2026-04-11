import { getOAuthProvider, type OAuthCredentials, type OAuthProviderId } from "@mariozechner/pi-ai/oauth";
import { inject, injectable } from "inversify";
import { AdminDatabase } from "../db/admin_database.ts";
import { ApiLogger } from "../log/api_logger.ts";
import { WorkerBase } from "./worker_base.ts";

export type LlmOauthCredentialRow = {
  id: string;
  modelProvider: "openai-codex";
  encryptedApiKey: string;
  refreshToken: string | null;
  accessTokenExpiresAtMilliseconds: number | string;
};

/**
 * Refreshes expiring OAuth-backed LLM credentials in small locked batches so multiple worker
 * processes can run concurrently without refreshing the same row twice.
 */
@injectable()
export class LlmOauthRefreshWorker extends WorkerBase {
  private static readonly EXPIRY_WINDOW_MILLISECONDS = 20 * 60 * 1000;   // refresh tokens 20 minutes before they expire
  private static readonly INTERVAL_SECONDS = 60;
  private static readonly LOCK_BATCH_SIZE = 20;
  private readonly adminDatabase: AdminDatabase;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(ApiLogger) logger: ApiLogger,
  ) {
    super("llm_oauth_refresh", LlmOauthRefreshWorker.INTERVAL_SECONDS, logger);
    this.adminDatabase = adminDatabase;
  }

  protected async run(): Promise<void> {
    const refreshCutoff = LlmOauthRefreshWorker.serializeTimestamp(
      new Date(Date.now() + LlmOauthRefreshWorker.EXPIRY_WINDOW_MILLISECONDS),
    );

    await this.adminDatabase.getSqlClient().begin(async (transactionSql) => {
      const credentials = await transactionSql<LlmOauthCredentialRow[]>`
        SELECT
          "id",
          "model_provider" AS "modelProvider",
          "encrypted_api_key" AS "encryptedApiKey",
          "refresh_token" AS "refreshToken",
          EXTRACT(EPOCH FROM "access_token_expires_at") * 1000 AS "accessTokenExpiresAtMilliseconds"
        FROM "model_provider_credentials"
        WHERE "model_provider_credential_type" = 'oauth_token'
          AND "access_token_expires_at" IS NOT NULL
          AND "access_token_expires_at" <= ${refreshCutoff}
        ORDER BY "access_token_expires_at" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${LlmOauthRefreshWorker.LOCK_BATCH_SIZE}
      `;

      for (const credential of credentials) {
        try {
          const refreshedCredential = await this.refreshCredential(credential);
          const refreshedAt = LlmOauthRefreshWorker.serializeTimestamp(new Date());
          await transactionSql`
            UPDATE "model_provider_credentials"
            SET
              "encrypted_api_key" = ${refreshedCredential.access},
              "refresh_token" = ${refreshedCredential.refresh},
              "access_token_expires_at" = ${LlmOauthRefreshWorker.serializeTimestamp(
                new Date(refreshedCredential.expires),
              )},
              "refreshed_at" = ${refreshedAt},
              "status" = 'active',
              "error_message" = null,
              "updated_at" = ${refreshedAt}
            WHERE "id" = ${credential.id}
          `;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown OAuth refresh failure.";
          const failedAt = LlmOauthRefreshWorker.serializeTimestamp(new Date());
          await transactionSql`
            UPDATE "model_provider_credentials"
            SET
              "status" = 'error',
              "error_message" = ${message},
              "updated_at" = ${failedAt}
            WHERE "id" = ${credential.id}
          `;
          this.getLogger().error({
            credentialId: credential.id,
            error: message,
          }, "failed to refresh llm oauth credential");
        }
      }
    });
  }

  protected async refreshCredential(credential: LlmOauthCredentialRow): Promise<OAuthCredentials> {
    const refreshToken = credential.refreshToken?.trim();
    if (!refreshToken) {
      throw new Error("OAuth credential is missing a refresh token.");
    }

    const expires = Number(credential.accessTokenExpiresAtMilliseconds);
    if (!Number.isFinite(expires) || expires <= 0) {
      throw new Error("OAuth credential is missing a valid access token expiry.");
    }

    const oauthProvider = getOAuthProvider(this.resolveOAuthProviderId(credential.modelProvider));
    if (!oauthProvider) {
      throw new Error(`OAuth provider is not registered for model provider ${credential.modelProvider}.`);
    }

    return oauthProvider.refreshToken({
      access: credential.encryptedApiKey,
      refresh: refreshToken,
      expires,
    });
  }

  private resolveOAuthProviderId(modelProvider: LlmOauthCredentialRow["modelProvider"]): OAuthProviderId {
    if (modelProvider === "openai-codex") {
      return "openai-codex";
    }

    throw new Error(`Unsupported OAuth model provider: ${modelProvider}`);
  }

  private static serializeTimestamp(value: Date): string {
    return value.toISOString();
  }
}
