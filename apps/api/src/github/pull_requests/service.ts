import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import {
  githubPullRequests,
  githubPullRequestStateEnum,
  githubRepositories,
} from "../../db/schema.ts";
import type { AppRuntimeTransaction, TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";

export type GithubPullRequestState = typeof githubPullRequestStateEnum.enumValues[number];

export type GithubPullRequestRecord = {
  companyId: string;
  createdAt: Date;
  createdByAgentId: string | null;
  createdBySessionId: string | null;
  externalId: string;
  githubRepositoryId: string;
  id: string;
  number: number;
  ownerAgentId: string | null;
  ownerSessionId: string | null;
  state: GithubPullRequestState;
  title: string;
  updatedAt: Date;
  url: string;
};

type GithubRepositoryRecord = {
  id: string;
};

/**
 * Owns the first-class GitHub pull-request rows that connect GitHub's repository-scoped PR
 * identity to CompanyHelm session or agent ownership. The service deliberately keeps webhook and
 * tool callers on the same lookup/upsert path so routing decisions do not drift from PR creation.
 */
@injectable()
export class GithubPullRequestService {
  async trackCreatedPullRequest(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      createdByAgentId: string;
      createdBySessionId: string;
      externalId: string;
      installationId: number;
      number: number;
      ownerSessionId: string;
      repositoryFullName: string;
      state: GithubPullRequestState;
      title: string;
      url: string;
    },
  ): Promise<GithubPullRequestRecord> {
    return transactionProvider.transaction(async (tx) => {
      const repository = await this.requireRepository(tx, {
        companyId: input.companyId,
        installationId: input.installationId,
        repositoryFullName: input.repositoryFullName,
      });

      return this.upsertOwnedPullRequest(tx, {
        companyId: input.companyId,
        createdByAgentId: input.createdByAgentId,
        createdBySessionId: input.createdBySessionId,
        externalId: input.externalId,
        githubRepositoryId: repository.id,
        number: input.number,
        ownerAgentId: null,
        ownerSessionId: input.ownerSessionId,
        state: input.state,
        title: input.title,
        url: input.url,
      });
    });
  }

  async updateTrackedPullRequestFromWebhook(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      externalId: string | null;
      installationId: number;
      number: number;
      repositoryExternalId: string;
      state: GithubPullRequestState;
      title: string;
      url: string;
    },
  ): Promise<GithubPullRequestRecord | null> {
    return transactionProvider.transaction(async (tx) => {
      const repository = await this.findRepositoryByExternalId(tx, {
        companyId: input.companyId,
        installationId: input.installationId,
        repositoryExternalId: input.repositoryExternalId,
      });
      if (!repository) {
        return null;
      }

      const trackedPullRequest = await this.findByRepositoryAndNumber(tx, input.companyId, repository.id, input.number);
      if (!trackedPullRequest) {
        return null;
      }

      return this.updateTrackedPullRequest(tx, trackedPullRequest, {
        externalId: input.externalId,
        state: input.state,
        title: input.title,
        url: input.url,
      });
    });
  }

  async findTrackedPullRequestFromWebhook(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      installationId: number;
      number: number;
      repositoryExternalId: string;
    },
  ): Promise<GithubPullRequestRecord | null> {
    return transactionProvider.transaction(async (tx) => {
      const repository = await this.findRepositoryByExternalId(tx, input);
      if (!repository) {
        return null;
      }

      return this.findByRepositoryAndNumber(tx, input.companyId, repository.id, input.number);
    });
  }

  normalizeGithubState(value: string): GithubPullRequestState {
    const normalizedValue = value.toLowerCase();
    if (normalizedValue === "open" || normalizedValue === "closed" || normalizedValue === "merged") {
      return normalizedValue;
    }

    throw new Error(`Unsupported GitHub pull request state: ${value}`);
  }

  private async requireRepository(
    tx: AppRuntimeTransaction,
    input: {
      companyId: string;
      installationId: number;
      repositoryFullName: string;
    },
  ): Promise<GithubRepositoryRecord> {
    const [repository] = await tx
      .select({
        id: githubRepositories.id,
      })
      .from(githubRepositories)
      .where(and(
        eq(githubRepositories.companyId, input.companyId),
        eq(githubRepositories.installationId, input.installationId),
        eq(githubRepositories.fullName, input.repositoryFullName),
      ))
      .limit(1) as GithubRepositoryRecord[];

    if (!repository) {
      throw new Error("GitHub repository is not linked to this company.");
    }

    return repository;
  }

  private async findRepositoryByExternalId(
    tx: AppRuntimeTransaction,
    input: {
      companyId: string;
      installationId: number;
      repositoryExternalId: string;
    },
  ): Promise<GithubRepositoryRecord | null> {
    const [repository] = await tx
      .select({
        id: githubRepositories.id,
      })
      .from(githubRepositories)
      .where(and(
        eq(githubRepositories.companyId, input.companyId),
        eq(githubRepositories.installationId, input.installationId),
        eq(githubRepositories.externalId, input.repositoryExternalId),
      ))
      .limit(1) as GithubRepositoryRecord[];

    return repository ?? null;
  }

  private async findByRepositoryAndNumber(
    tx: AppRuntimeTransaction,
    companyId: string,
    githubRepositoryId: string,
    number: number,
  ): Promise<GithubPullRequestRecord | null> {
    const [pullRequest] = await tx
      .select(this.selection())
      .from(githubPullRequests)
      .where(and(
        eq(githubPullRequests.companyId, companyId),
        eq(githubPullRequests.githubRepositoryId, githubRepositoryId),
        eq(githubPullRequests.number, number),
      ))
      .limit(1) as GithubPullRequestRecord[];

    return pullRequest ?? null;
  }

  private async upsertOwnedPullRequest(
    tx: AppRuntimeTransaction,
    input: {
      companyId: string;
      createdByAgentId: string;
      createdBySessionId: string;
      externalId: string;
      githubRepositoryId: string;
      number: number;
      ownerAgentId: string | null;
      ownerSessionId: string | null;
      state: GithubPullRequestState;
      title: string;
      url: string;
    },
  ): Promise<GithubPullRequestRecord> {
    const timestamp = new Date();
    const [pullRequest] = await tx
      .insert(githubPullRequests)
      .values({
        companyId: input.companyId,
        createdAt: timestamp,
        createdByAgentId: input.createdByAgentId,
        createdBySessionId: input.createdBySessionId,
        externalId: input.externalId,
        githubRepositoryId: input.githubRepositoryId,
        number: input.number,
        ownerAgentId: input.ownerAgentId,
        ownerSessionId: input.ownerSessionId,
        state: input.state,
        title: input.title,
        updatedAt: timestamp,
        url: input.url,
      })
      .onConflictDoUpdate({
        target: [
          githubPullRequests.companyId,
          githubPullRequests.githubRepositoryId,
          githubPullRequests.number,
        ],
        set: {
          externalId: input.externalId,
          ownerAgentId: input.ownerAgentId,
          ownerSessionId: input.ownerSessionId,
          state: input.state,
          title: input.title,
          updatedAt: timestamp,
          url: input.url,
        },
      })
      .returning(this.selection()) as GithubPullRequestRecord[];

    if (!pullRequest) {
      throw new Error("Failed to track GitHub pull request.");
    }

    return pullRequest;
  }

  private async updateTrackedPullRequest(
    tx: AppRuntimeTransaction,
    trackedPullRequest: GithubPullRequestRecord,
    input: {
      externalId: string | null;
      state: GithubPullRequestState;
      title: string;
      url: string;
    },
  ): Promise<GithubPullRequestRecord> {
    const [pullRequest] = await tx
      .update(githubPullRequests)
      .set({
        externalId: input.externalId ?? trackedPullRequest.externalId,
        state: input.state,
        title: input.title,
        updatedAt: new Date(),
        url: input.url,
      })
      .where(eq(githubPullRequests.id, trackedPullRequest.id))
      .returning(this.selection()) as GithubPullRequestRecord[];

    if (!pullRequest) {
      throw new Error("Failed to update tracked GitHub pull request.");
    }

    return pullRequest;
  }

  private selection() {
    return {
      companyId: githubPullRequests.companyId,
      createdAt: githubPullRequests.createdAt,
      createdByAgentId: githubPullRequests.createdByAgentId,
      createdBySessionId: githubPullRequests.createdBySessionId,
      externalId: githubPullRequests.externalId,
      githubRepositoryId: githubPullRequests.githubRepositoryId,
      id: githubPullRequests.id,
      number: githubPullRequests.number,
      ownerAgentId: githubPullRequests.ownerAgentId,
      ownerSessionId: githubPullRequests.ownerSessionId,
      state: githubPullRequests.state,
      title: githubPullRequests.title,
      updatedAt: githubPullRequests.updatedAt,
      url: githubPullRequests.url,
    };
  }
}
