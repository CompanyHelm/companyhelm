import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { companyGithubInstallations, githubRepositories } from "../../db/schema.ts";
import {
  type GithubInstallationRepository,
  GithubClient,
} from "../../github/client.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type RefreshGithubInstallationRepositoriesMutationArguments = {
  input: {
    installationId: string;
  };
};

type GithubInstallationRecord = {
  installationId: number;
};

type GithubRepositoryRecord = {
  id: string;
  installationId: number;
  externalId: string;
  name: string;
  fullName: string;
  htmlUrl: string | null;
  isPrivate: boolean;
  defaultBranch: string | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type GraphqlGithubRepositoryRecord = {
  id: string;
  githubInstallationId: string;
  externalId: string;
  name: string;
  fullName: string;
  htmlUrl: string | null;
  isPrivate: boolean;
  defaultBranch: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

type GraphqlRefreshGithubInstallationRepositoriesPayload = {
  repositories: GraphqlGithubRepositoryRecord[];
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(limit: number): Promise<GithubInstallationRecord[]>;
        orderBy(...fields: unknown[]): Promise<GithubRepositoryRecord[]>;
      };
    };
  };
};

type WritableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown>;
  };
  insert(table: unknown): {
    values(value: Record<string, unknown> | Array<Record<string, unknown>>): {
      returning(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): {
        returning(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
      };
    };
  };
};

/**
 * Refreshes the cached repository set for a linked installation while preserving row ids for
 * repositories that GitHub still returns, so workspace repository pins can safely reference them.
 */
@injectable()
export class RefreshGithubInstallationRepositoriesMutation extends Mutation<
  RefreshGithubInstallationRepositoriesMutationArguments,
  GraphqlRefreshGithubInstallationRepositoriesPayload
> {
  private readonly githubClient: GithubClient;

  constructor(@inject(GithubClient) githubClient: GithubClient = new GithubClient({} as Config)) {
    super();
    this.githubClient = githubClient;
  }

  protected resolve = async (
    arguments_: RefreshGithubInstallationRepositoriesMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlRefreshGithubInstallationRepositoriesPayload> => {
    const installationId = GithubClient.validateInstallationId(arguments_.input.installationId);

    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    const companyId = context.authSession.company.id;

    const [installationRecord] = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as unknown as SelectableDatabase;
      return selectableDatabase
        .select({
          installationId: companyGithubInstallations.installationId,
        })
        .from(companyGithubInstallations)
        .where(and(
          eq(companyGithubInstallations.companyId, companyId),
          eq(companyGithubInstallations.installationId, installationId),
        ))
        .limit(1);
    });

    if (!installationRecord) {
      throw new Error("GitHub installation not found.");
    }

    const repositories = await this.githubClient.getInstallationRepositories(installationId, {
      forceRefresh: true,
    });
    const now = new Date();

    const refreshedRepositories = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const writableDatabase = tx as WritableDatabase;
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const existingRepositories = await RefreshGithubInstallationRepositoriesMutation.loadRepositoriesForInstallation(
        selectableDatabase,
        {
          companyId,
          installationId,
        },
      );
      const existingRepositoryByExternalId = new Map(
        existingRepositories.map((repository) => [repository.externalId, repository]),
      );
      const refreshedExternalIds = new Set(repositories.map((repository) => repository.externalId));
      const deletedRepositoryIds = existingRepositories
        .filter((repository) => !refreshedExternalIds.has(repository.externalId))
        .map((repository) => repository.id);
      if (deletedRepositoryIds.length > 0) {
        await writableDatabase
          .delete(githubRepositories)
          .where(and(
            eq(githubRepositories.companyId, companyId),
            eq(githubRepositories.installationId, installationId),
            inArray(githubRepositories.id, deletedRepositoryIds),
          ));
      }

      for (const repository of repositories) {
        const existingRepository = existingRepositoryByExternalId.get(repository.externalId);
        if (existingRepository) {
          await RefreshGithubInstallationRepositoriesMutation.updateRepository(
            writableDatabase,
            existingRepository.id,
            repository,
            now,
          );
          continue;
        }

        await writableDatabase
          .insert(githubRepositories)
          .values(
            RefreshGithubInstallationRepositoriesMutation.createRepositoryInsertValue({
              companyId,
              installationId,
              repository,
              timestamp: now,
            }),
          )
          .returning();
      }

      return RefreshGithubInstallationRepositoriesMutation.loadRepositoriesForInstallation(
        selectableDatabase,
        {
          companyId,
          installationId,
        },
      );
    });

    return {
      repositories: refreshedRepositories.map((repository) =>
        RefreshGithubInstallationRepositoriesMutation.serializeRepository(repository)
      ),
    };
  };

  private static async loadRepositoriesForInstallation(
    selectableDatabase: SelectableDatabase,
    params: {
      companyId: string;
      installationId: number;
    },
  ): Promise<GithubRepositoryRecord[]> {
    return selectableDatabase
      .select({
        id: githubRepositories.id,
        installationId: githubRepositories.installationId,
        externalId: githubRepositories.externalId,
        name: githubRepositories.name,
        fullName: githubRepositories.fullName,
        htmlUrl: githubRepositories.htmlUrl,
        isPrivate: githubRepositories.isPrivate,
        defaultBranch: githubRepositories.defaultBranch,
        archived: githubRepositories.archived,
        createdAt: githubRepositories.createdAt,
        updatedAt: githubRepositories.updatedAt,
      })
      .from(githubRepositories)
      .where(and(
        eq(githubRepositories.companyId, params.companyId),
        eq(githubRepositories.installationId, params.installationId),
      ))
      .orderBy(asc(githubRepositories.fullName), asc(githubRepositories.externalId));
  }

  private static createRepositoryInsertValue(params: {
    companyId: string;
    installationId: number;
    repository: GithubInstallationRepository;
    timestamp: Date;
  }) {
    return {
      id: randomUUID(),
      companyId: params.companyId,
      installationId: params.installationId,
      externalId: params.repository.externalId,
      name: params.repository.name,
      fullName: params.repository.fullName,
      htmlUrl: params.repository.htmlUrl,
      isPrivate: params.repository.isPrivate,
      defaultBranch: params.repository.defaultBranch,
      archived: params.repository.archived,
      createdAt: params.timestamp,
      updatedAt: params.timestamp,
    };
  }

  private static async updateRepository(
    writableDatabase: WritableDatabase,
    repositoryId: string,
    repository: GithubInstallationRepository,
    timestamp: Date,
  ): Promise<void> {
    await writableDatabase
      .update(githubRepositories)
      .set({
        archived: repository.archived,
        defaultBranch: repository.defaultBranch,
        fullName: repository.fullName,
        htmlUrl: repository.htmlUrl,
        isPrivate: repository.isPrivate,
        name: repository.name,
        updatedAt: timestamp,
      })
      .where(eq(githubRepositories.id, repositoryId))
      .returning();
  }

  private static serializeRepository(record: GithubRepositoryRecord): GraphqlGithubRepositoryRecord {
    return {
      id: record.id,
      githubInstallationId: String(record.installationId),
      externalId: record.externalId,
      name: record.name,
      fullName: record.fullName,
      htmlUrl: record.htmlUrl,
      isPrivate: record.isPrivate,
      defaultBranch: record.defaultBranch,
      archived: record.archived,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
