import { inject, injectable } from "inversify";
import { AdminDatabase } from "../db/admin_database.ts";
import { ApiLogger } from "../log/api_logger.ts";
import {
  LlmOauthCredentialRefreshService,
  type LlmOauthCredentialRecord,
} from "../services/ai_providers/llm_oauth_credential_refresh_service.ts";
import { WorkerBase } from "./worker_base.ts";

export type LlmOauthCredentialRow = LlmOauthCredentialRecord;

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
  private readonly refreshService: LlmOauthCredentialRefreshService;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(ApiLogger) logger: ApiLogger,
    @inject(LlmOauthCredentialRefreshService)
    refreshService: LlmOauthCredentialRefreshService = new LlmOauthCredentialRefreshService(),
  ) {
    super("llm_oauth_refresh", LlmOauthRefreshWorker.INTERVAL_SECONDS, logger);
    this.adminDatabase = adminDatabase;
    this.refreshService = refreshService;
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

  protected async refreshCredential(credential: LlmOauthCredentialRow) {
    return this.refreshService.refreshCredential(credential);
  }

  private static serializeTimestamp(value: Date): string {
    return value.toISOString();
  }
}
