import { randomUUID } from "node:crypto";
import { inject, injectable } from "inversify";
import type { Sql } from "postgres";
import { AdminDatabase } from "../../db/admin_database.ts";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import { AppRuntimeTransactionProvider } from "../../db/app_runtime_transaction_provider.ts";
import { SessionManagerService } from "../../services/agent/session/session_manager_service.ts";
import { GithubPullRequestService, type GithubPullRequestRecord } from "../pull_requests/service.ts";
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
  private readonly appRuntimeDatabase: AppRuntimeDatabase | null;
  private readonly pullRequestService: GithubPullRequestService;
  private readonly sessionManagerService: SessionManagerService | null;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(AppRuntimeDatabase) appRuntimeDatabase: AppRuntimeDatabase | null = null,
    @inject(GithubPullRequestService)
    pullRequestService: GithubPullRequestService = new GithubPullRequestService(),
    @inject(SessionManagerService) sessionManagerService: SessionManagerService | null = null,
  ) {
    this.adminDatabase = adminDatabase;
    this.appRuntimeDatabase = appRuntimeDatabase;
    this.pullRequestService = pullRequestService;
    this.sessionManagerService = sessionManagerService;
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
      return;
    }

    if (job.eventName === "pull_request") {
      await this.processPullRequestEvent(action, payload);
      return;
    }

    if (job.eventName === "pull_request_review") {
      await this.processPullRequestReviewEvent(action, payload);
      return;
    }

    if (job.eventName === "pull_request_review_comment") {
      await this.processPullRequestReviewCommentEvent(action, payload);
      return;
    }

    if (job.eventName === "issue_comment") {
      await this.processIssueCommentEvent(action, payload);
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

  private async processPullRequestEvent(
    action: string | null,
    payload: GithubWebhookPayload,
  ): Promise<void> {
    const installationId = this.readInstallationId(payload);
    const repository = this.readRepository(payload.repository);
    const pullRequest = this.readPullRequest(payload.pull_request);

    await this.withLinkedInstallation(installationId, async (companyId) => {
      const trackedPullRequest = await this.pullRequestService.updateTrackedPullRequestFromWebhook(
        this.createTransactionProvider(companyId),
        {
          companyId,
          externalId: pullRequest.externalId,
          installationId,
          number: pullRequest.number,
          repositoryExternalId: repository.externalId,
          state: pullRequest.state,
          title: pullRequest.title,
          url: pullRequest.url,
        },
      );
      if (!trackedPullRequest) {
        return;
      }

      await this.routePullRequestActivity(companyId, trackedPullRequest, [
        `GitHub pull request activity on ${repository.fullName}#${pullRequest.number}`,
        "",
        `Event: pull_request ${action ?? "updated"}`,
        `State: ${pullRequest.state}`,
        `URL: ${pullRequest.url}`,
        "",
        `Title: ${pullRequest.title}`,
      ].join("\n"));
    });
  }

  private async processPullRequestReviewEvent(
    action: string | null,
    payload: GithubWebhookPayload,
  ): Promise<void> {
    const installationId = this.readInstallationId(payload);
    const repository = this.readRepository(payload.repository);
    const pullRequest = this.readPullRequest(payload.pull_request);
    const review = this.readObject(payload.review, "GitHub pull request review is required.");

    await this.routeTrackedPullRequestActivity(installationId, repository, pullRequest.number, [
      `GitHub pull request activity on ${repository.fullName}#${pullRequest.number}`,
      "",
      `Event: review ${action ?? "submitted"}`,
      `Author: ${this.readActorLogin(review.user) ?? "unknown"}`,
      `Review state: ${this.readOptionalString(review.state) ?? "unknown"}`,
      `URL: ${this.readOptionalString(review.html_url) ?? pullRequest.url}`,
      "",
      this.formatSummary(this.readOptionalString(review.body)),
    ].join("\n"));
  }

  private async processPullRequestReviewCommentEvent(
    action: string | null,
    payload: GithubWebhookPayload,
  ): Promise<void> {
    const installationId = this.readInstallationId(payload);
    const repository = this.readRepository(payload.repository);
    const pullRequest = this.readPullRequest(payload.pull_request);
    const comment = this.readObject(payload.comment, "GitHub pull request review comment is required.");

    await this.routeTrackedPullRequestActivity(installationId, repository, pullRequest.number, [
      `GitHub pull request activity on ${repository.fullName}#${pullRequest.number}`,
      "",
      `Event: review_comment ${action ?? "updated"}`,
      `Author: ${this.readActorLogin(comment.user) ?? "unknown"}`,
      `URL: ${this.readOptionalString(comment.html_url) ?? pullRequest.url}`,
      "",
      this.formatSummary(this.readOptionalString(comment.body)),
    ].join("\n"));
  }

  private async processIssueCommentEvent(
    action: string | null,
    payload: GithubWebhookPayload,
  ): Promise<void> {
    const issue = this.readObject(payload.issue, "GitHub issue payload is required.");
    if (!issue.pull_request) {
      return;
    }

    const installationId = this.readInstallationId(payload);
    const repository = this.readRepository(payload.repository);
    const pullRequestNumber = this.readPositiveInteger(issue.number, "GitHub pull request number is required.");
    const comment = this.readObject(payload.comment, "GitHub issue comment is required.");

    await this.routeTrackedPullRequestActivity(installationId, repository, pullRequestNumber, [
      `GitHub pull request activity on ${repository.fullName}#${pullRequestNumber}`,
      "",
      `Event: issue_comment ${action ?? "updated"}`,
      `Author: ${this.readActorLogin(comment.user) ?? "unknown"}`,
      `URL: ${this.readOptionalString(comment.html_url) ?? this.readOptionalString(issue.html_url) ?? repository.htmlUrl ?? ""}`,
      "",
      this.formatSummary(this.readOptionalString(comment.body)),
    ].join("\n"));
  }

  private async routeTrackedPullRequestActivity(
    installationId: number,
    repository: GithubRepositoryPayload,
    pullRequestNumber: number,
    message: string,
  ): Promise<void> {
    await this.withLinkedInstallation(installationId, async (companyId) => {
      const trackedPullRequest = await this.pullRequestService.findTrackedPullRequestFromWebhook(
        this.createTransactionProvider(companyId),
        {
          companyId,
          installationId,
          number: pullRequestNumber,
          repositoryExternalId: repository.externalId,
        },
      );
      if (!trackedPullRequest) {
        return;
      }

      await this.routePullRequestActivity(companyId, trackedPullRequest, message);
    });
  }

  private async routePullRequestActivity(
    companyId: string,
    pullRequest: GithubPullRequestRecord,
    message: string,
  ): Promise<void> {
    if (!pullRequest.ownerSessionId) {
      return;
    }

    const transactionProvider = this.createTransactionProvider(companyId);
    await transactionProvider.transaction(async (tx) => {
      await this.requireSessionManagerService().queuePromptInTransaction(
        tx,
        tx,
        tx,
        companyId,
        pullRequest.ownerSessionId as string,
        message,
        {
          principalMetadata: {
            principalType: "github_webhook",
          },
          shouldSteer: true,
        },
      );
    });
    await this.requireSessionManagerService().notifyQueuedSessionMessage(companyId, pullRequest.ownerSessionId, true);
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

  private readPullRequest(value: unknown): {
    externalId: string;
    number: number;
    state: "closed" | "merged" | "open";
    title: string;
    url: string;
  } {
    const pullRequest = this.readObject(value, "GitHub pull request is required.");
    const state = pullRequest.merged
      ? "merged"
      : this.pullRequestService.normalizeGithubState(
        this.readRequiredString(pullRequest.state, "GitHub pull request state is required."),
      );

    return {
      externalId: String(this.readPositiveInteger(pullRequest.id, "GitHub pull request id is required.")),
      number: this.readPositiveInteger(pullRequest.number, "GitHub pull request number is required."),
      state,
      title: this.readRequiredString(pullRequest.title, "GitHub pull request title is required."),
      url: this.readRequiredString(pullRequest.html_url, "GitHub pull request URL is required."),
    };
  }

  private readActorLogin(value: unknown): string | null {
    const user = value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;

    return user ? this.readOptionalString(user.login) : null;
  }

  private formatSummary(value: string | null): string {
    if (!value) {
      return "Summary: No body provided.";
    }

    return `Summary:\n${value.slice(0, 4_000)}`;
  }

  private createTransactionProvider(companyId: string): AppRuntimeTransactionProvider {
    if (!this.appRuntimeDatabase) {
      throw new Error("App runtime database is required to process GitHub pull request webhook activity.");
    }

    return new AppRuntimeTransactionProvider(this.appRuntimeDatabase, companyId);
  }

  private requireSessionManagerService(): SessionManagerService {
    if (!this.sessionManagerService) {
      throw new Error("Session manager service is required to route GitHub pull request webhook activity.");
    }

    return this.sessionManagerService;
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
