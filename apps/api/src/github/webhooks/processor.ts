import { randomUUID } from "node:crypto";
import { inject, injectable } from "inversify";
import type { Sql } from "postgres";
import { AdminDatabase } from "../../db/admin_database.ts";
import type { GithubWebhookJobPayload } from "./queue.ts";

type GithubRepositoryPayload = {
  archived: boolean;
  defaultBranch: string | null;
  externalId: string;
  fullName: string;
  htmlUrl: string | null;
  isPrivate: boolean;
  name: string;
};

type GithubInstallationLookup = {
  companyId: string;
};

type GithubWebhookPayload = Record<string, unknown>;

/**
 * Applies durable GitHub webhook jobs to the local GitHub installation and repository cache. The
 * processor deliberately starts with cache-maintenance events; product actions such as PR or issue
 * automation can be added behind the same queue without changing webhook ingress.
 */
@injectable()
export class GithubWebhookProcessor {
  private readonly adminDatabase: AdminDatabase;

  constructor(@inject(AdminDatabase) adminDatabase: AdminDatabase) {
    this.adminDatabase = adminDatabase;
  }

  async process(job: GithubWebhookJobPayload): Promise<void> {
    const payload = this.parsePayload(job.payload);
    const action = this.readOptionalString(payload.action);

    if (job.eventName === "installation" && action === "deleted") {
      await this.deleteInstallation(payload);
      return;
    }

    if (job.eventName === "installation_repositories") {
      await this.processInstallationRepositories(action, payload);
      return;
    }

    if (job.eventName === "repository") {
      await this.processRepositoryEvent(action, payload);
    }
  }

  private async deleteInstallation(payload: GithubWebhookPayload): Promise<void> {
    const installationId = this.readInstallationId(payload);
    const sql = this.adminDatabase.getSqlClient();

    await sql`
      DELETE FROM "company_github_installations"
      WHERE "installation_id" = ${installationId}
    `;
  }

  private async processInstallationRepositories(
    action: string | null,
    payload: GithubWebhookPayload,
  ): Promise<void> {
    const installationId = this.readInstallationId(payload);
    const repositoriesToAdd = action === "added"
      ? this.readRepositoryArray(payload.repositories_added)
      : [];
    const repositoriesToRemove = action === "removed"
      ? this.readRepositoryArray(payload.repositories_removed)
      : [];

    if (repositoriesToAdd.length === 0 && repositoriesToRemove.length === 0) {
      return;
    }

    await this.withLinkedInstallation(installationId, async (companyId) => {
      const sql = this.adminDatabase.getSqlClient();
      await sql.begin(async (transactionSql) => {
        for (const repository of repositoriesToAdd) {
          await this.upsertRepository(transactionSql as unknown as Sql, companyId, installationId, repository);
        }

        for (const repository of repositoriesToRemove) {
          await this.deleteRepository(transactionSql as unknown as Sql, companyId, installationId, repository.externalId);
        }
      });
    });
  }

  private async processRepositoryEvent(
    action: string | null,
    payload: GithubWebhookPayload,
  ): Promise<void> {
    const installationId = this.readInstallationId(payload);
    const repository = this.readRepository(payload.repository);

    await this.withLinkedInstallation(installationId, async (companyId) => {
      const sql = this.adminDatabase.getSqlClient();
      if (action === "deleted") {
        await this.deleteRepository(sql, companyId, installationId, repository.externalId);
        return;
      }

      await this.upsertRepository(sql, companyId, installationId, repository);
    });
  }

  private async withLinkedInstallation(
    installationId: number,
    callback: (companyId: string) => Promise<void>,
  ): Promise<void> {
    const sql = this.adminDatabase.getSqlClient();
    const [installation] = await sql<GithubInstallationLookup[]>`
      SELECT "company_id" AS "companyId"
      FROM "company_github_installations"
      WHERE "installation_id" = ${installationId}
      LIMIT 1
    `;

    if (!installation) {
      return;
    }

    await callback(installation.companyId);
  }

  private async upsertRepository(
    sql: Sql,
    companyId: string,
    installationId: number,
    repository: GithubRepositoryPayload,
  ): Promise<void> {
    const now = new Date();
    await sql`
      INSERT INTO "github_repositories" (
        "id",
        "company_id",
        "installation_id",
        "external_id",
        "name",
        "full_name",
        "html_url",
        "is_private",
        "default_branch",
        "archived",
        "created_at",
        "updated_at"
      )
      VALUES (
        ${randomUUID()},
        ${companyId},
        ${installationId},
        ${repository.externalId},
        ${repository.name},
        ${repository.fullName},
        ${repository.htmlUrl},
        ${repository.isPrivate},
        ${repository.defaultBranch},
        ${repository.archived},
        ${now},
        ${now}
      )
      ON CONFLICT ("company_id", "installation_id", "external_id")
      DO UPDATE SET
        "name" = excluded."name",
        "full_name" = excluded."full_name",
        "html_url" = excluded."html_url",
        "is_private" = excluded."is_private",
        "default_branch" = excluded."default_branch",
        "archived" = excluded."archived",
        "updated_at" = excluded."updated_at"
    `;
  }

  private async deleteRepository(
    sql: Sql,
    companyId: string,
    installationId: number,
    externalId: string,
  ): Promise<void> {
    await sql`
      DELETE FROM "github_repositories"
      WHERE "company_id" = ${companyId}
        AND "installation_id" = ${installationId}
        AND "external_id" = ${externalId}
    `;
  }

  private parsePayload(payload: string): GithubWebhookPayload {
    const parsedPayload = JSON.parse(payload) as unknown;
    if (!parsedPayload || typeof parsedPayload !== "object" || Array.isArray(parsedPayload)) {
      throw new Error("GitHub webhook payload must be a JSON object.");
    }

    return parsedPayload as GithubWebhookPayload;
  }

  private readInstallationId(payload: GithubWebhookPayload): number {
    const installation = this.readObject(payload.installation, "GitHub webhook installation is required.");
    return this.readPositiveInteger(installation.id, "GitHub webhook installation id is required.");
  }

  private readRepositoryArray(value: unknown): GithubRepositoryPayload[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((entry) => this.readRepository(entry));
  }

  private readRepository(value: unknown): GithubRepositoryPayload {
    const repository = this.readObject(value, "GitHub webhook repository is required.");
    return {
      archived: Boolean(repository.archived),
      defaultBranch: this.readOptionalString(repository.default_branch),
      externalId: String(this.readPositiveInteger(repository.id, "GitHub repository id is required.")),
      fullName: this.readRequiredString(repository.full_name, "GitHub repository full name is required."),
      htmlUrl: this.readOptionalString(repository.html_url),
      isPrivate: Boolean(repository.private),
      name: this.readRequiredString(repository.name, "GitHub repository name is required."),
    };
  }

  private readObject(value: unknown, errorMessage: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(errorMessage);
    }

    return value as Record<string, unknown>;
  }

  private readPositiveInteger(value: unknown, errorMessage: string): number {
    const numericValue = Number(value);
    if (!Number.isSafeInteger(numericValue) || numericValue <= 0) {
      throw new Error(errorMessage);
    }

    return numericValue;
  }

  private readRequiredString(value: unknown, errorMessage: string): string {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(errorMessage);
    }

    return value;
  }

  private readOptionalString(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
  }
}
