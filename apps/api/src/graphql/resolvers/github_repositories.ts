import { and, asc, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { GithubClient } from "../../github/client.ts";
import { githubRepositories } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type GithubRepositoriesQueryArguments = {
  installationId?: string | null;
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

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        orderBy(...fields: unknown[]): Promise<GithubRepositoryRecord[]>;
      };
    };
  };
};

/**
 * Returns the cached GitHub repository metadata mirrored for the authenticated company.
 */
@injectable()
export class GithubRepositoriesQueryResolver {
  execute = async (
    _root: unknown,
    arguments_: GithubRepositoriesQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlGithubRepositoryRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const normalizedInstallationId = arguments_.installationId
      ? GithubClient.validateInstallationId(arguments_.installationId)
      : null;

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const whereCondition = normalizedInstallationId == null
        ? eq(githubRepositories.companyId, context.authSession.company.id)
        : and(
          eq(githubRepositories.companyId, context.authSession.company.id),
          eq(githubRepositories.installationId, normalizedInstallationId),
        );
      const repositories = await selectableDatabase
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
        .where(whereCondition)
        .orderBy(asc(githubRepositories.fullName), asc(githubRepositories.externalId));

      return repositories.map((repository) => ({
        id: repository.id,
        githubInstallationId: String(repository.installationId),
        externalId: repository.externalId,
        name: repository.name,
        fullName: repository.fullName,
        htmlUrl: repository.htmlUrl,
        isPrivate: repository.isPrivate,
        defaultBranch: repository.defaultBranch,
        archived: repository.archived,
        createdAt: repository.createdAt.toISOString(),
        updatedAt: repository.updatedAt.toISOString(),
      }));
    });
  };
}
