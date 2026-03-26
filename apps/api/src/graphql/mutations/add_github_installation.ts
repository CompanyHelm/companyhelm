import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { companyGithubInstallations, githubRepositories } from "../../db/schema.ts";
import {
  type GithubInstallationRepository,
  GithubClient,
} from "../../github/client.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type AddGithubInstallationMutationArguments = {
  input: {
    installationId: string;
    setupAction?: string | null;
  };
};

type GithubInstallationRecord = {
  installationId: number;
  createdAt: Date;
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

type GraphqlGithubInstallationRecord = {
  id: string;
  installationId: string;
  createdAt: string;
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

type GraphqlAddGithubInstallationPayload = {
  githubInstallation: GraphqlGithubInstallationRecord;
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

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown> | Array<Record<string, unknown>>): {
      returning(selection?: Record<string, unknown>): Promise<GithubInstallationRecord[]>;
    };
  };
};

/**
 * Links a GitHub App installation to the authenticated company and seeds the repository cache.
 */
@injectable()
export class AddGithubInstallationMutation extends Mutation<
  AddGithubInstallationMutationArguments,
  GraphqlAddGithubInstallationPayload
> {
  private readonly githubClient: GithubClient;

  constructor(@inject(GithubClient) githubClient: GithubClient = new GithubClient({} as Config)) {
    super();
    this.githubClient = githubClient;
  }

  protected resolve = async (
    arguments_: AddGithubInstallationMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlAddGithubInstallationPayload> => {
    const installationId = GithubClient.validateInstallationId(arguments_.input.installationId);
    void arguments_.input.setupAction;

    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const [existingInstallation] = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      return selectableDatabase
        .select({
          installationId: companyGithubInstallations.installationId,
          createdAt: companyGithubInstallations.createdAt,
        })
        .from(companyGithubInstallations)
        .where(and(
          eq(companyGithubInstallations.companyId, context.authSession.company.id),
          eq(companyGithubInstallations.installationId, installationId),
        ))
        .limit(1);
    });

    if (existingInstallation) {
      const repositories = await context.app_runtime_transaction_provider.transaction(async (tx) => {
        return AddGithubInstallationMutation.loadRepositoriesForInstallation(tx as SelectableDatabase, {
          companyId: context.authSession.company.id,
          installationId,
        });
      });

      return {
        githubInstallation: AddGithubInstallationMutation.serializeInstallation(existingInstallation),
        repositories: repositories.map((repository) => AddGithubInstallationMutation.serializeRepository(repository)),
      };
    }

    const githubInstallationRepositories = await this.githubClient.getInstallationRepositories(installationId);
    const now = new Date();
    const repositoryInsertValues = githubInstallationRepositories.map((repository) =>
      AddGithubInstallationMutation.createRepositoryInsertValue({
        companyId: context.authSession.company.id,
        installationId,
        repository,
        timestamp: now,
      })
    );

    try {
      const [createdInstallation] = await context.app_runtime_transaction_provider.transaction(async (tx) => {
        const insertableDatabase = tx as InsertableDatabase;
        const [installationRecord] = await insertableDatabase
          .insert(companyGithubInstallations)
          .values({
            installationId,
            companyId: context.authSession.company.id,
            createdAt: now,
          })
          .returning({
            installationId: companyGithubInstallations.installationId,
            createdAt: companyGithubInstallations.createdAt,
          });

        if (repositoryInsertValues.length > 0) {
          await insertableDatabase
            .insert(githubRepositories)
            .values(repositoryInsertValues)
            .returning();
        }

        return [installationRecord];
      });

      if (!createdInstallation) {
        throw new Error("Failed to add GitHub installation.");
      }

      return {
        githubInstallation: AddGithubInstallationMutation.serializeInstallation(createdInstallation),
        repositories: repositoryInsertValues.map((repository) =>
          AddGithubInstallationMutation.serializeInsertedRepository(repository)
        ),
      };
    } catch (error) {
      if (AddGithubInstallationMutation.isUniqueViolation(error)) {
        throw new Error(
          `GitHub installation ${installationId} is already linked to another company.`,
          { cause: error },
        );
      }

      throw error;
    }
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

  private static serializeInstallation(record: GithubInstallationRecord): GraphqlGithubInstallationRecord {
    return {
      id: String(record.installationId),
      installationId: String(record.installationId),
      createdAt: record.createdAt.toISOString(),
    };
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

  private static serializeInsertedRepository(record: ReturnType<typeof AddGithubInstallationMutation.createRepositoryInsertValue>): GraphqlGithubRepositoryRecord {
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

  private static isUniqueViolation(error: unknown): boolean {
    return typeof error === "object"
      && error !== null
      && "code" in error
      && error.code === "23505";
  }
}
