import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import type { AppRuntimeTransaction, TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { companyGithubInstallations, companyMembers, githubRepositories } from "../../db/schema.ts";
import {
  type GithubInstallationRepository,
  GithubClient,
} from "../../github/client.ts";
import { GithubInstallationStateService } from "../../github/installation_state_service.ts";
import { SessionManagerService } from "../../services/agent/session/session_manager_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type AddGithubInstallationMutationArguments = {
  input: {
    installationId: string;
    setupAction?: string | null;
    state: string;
  };
};

type GithubInstallationRecord = {
  accountLogin: string | null;
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
  accountLogin: string | null;
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
  organizationSlug: string | null;
  repositories: GraphqlGithubRepositoryRecord[];
  returnPath: string;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(limit: number): Promise<unknown[]>;
        orderBy(...fields: unknown[]): Promise<unknown[]>;
      };
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown> | Array<Record<string, unknown>>): {
      returning(selection?: Record<string, unknown>): Promise<unknown[]>;
    };
  };
};

type CompanyScopedDatabase = SelectableDatabase & InsertableDatabase;

type InstallationTarget = {
  companyId: string;
  organizationSlug: string | null;
  returnPath: string;
  sourceSessionId: string | null;
  userId: string;
};

/**
 * Links a GitHub App installation to the authenticated company and seeds the repository cache.
 */
@injectable()
export class AddGithubInstallationMutation extends Mutation<
  AddGithubInstallationMutationArguments,
  GraphqlAddGithubInstallationPayload
> {
  private readonly appRuntimeDatabase: AppRuntimeDatabase;
  private readonly githubClient: GithubClient;
  private readonly githubInstallationStateService: GithubInstallationStateService;
  private readonly sessionManagerService: SessionManagerService | null;

  constructor(
    @inject(GithubClient) githubClient: GithubClient = new GithubClient({} as Config),
    @inject(GithubInstallationStateService)
    githubInstallationStateService: GithubInstallationStateService =
      new GithubInstallationStateService({} as Config),
    @inject(AppRuntimeDatabase)
    appRuntimeDatabase: AppRuntimeDatabase = new AppRuntimeDatabase({} as Config),
    @inject(SessionManagerService)
    sessionManagerService: SessionManagerService = null as never,
  ) {
    super();
    this.appRuntimeDatabase = appRuntimeDatabase;
    this.githubClient = githubClient;
    this.githubInstallationStateService = githubInstallationStateService;
    this.sessionManagerService = sessionManagerService;
  }

  protected resolve = async (
    arguments_: AddGithubInstallationMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlAddGithubInstallationPayload> => {
    const installationId = GithubClient.validateInstallationId(arguments_.input.installationId);
    void arguments_.input.setupAction;

    if (!context.authSession) {
      throw new Error("Authentication required.");
    }
    const installationTarget = this.resolveInstallationTarget(arguments_, context);

    const payload = await this.executeForInstallationTarget(context, installationTarget, async (database) => {
      await this.ensureMembership(database, installationTarget);

      const [existingInstallation] = await (database
        .select({
          accountLogin: companyGithubInstallations.accountLogin,
          installationId: companyGithubInstallations.installationId,
          createdAt: companyGithubInstallations.createdAt,
        })
        .from(companyGithubInstallations)
        .where(and(
          eq(companyGithubInstallations.companyId, installationTarget.companyId),
          eq(companyGithubInstallations.installationId, installationId),
        ))
        .limit(1)) as GithubInstallationRecord[];

      if (existingInstallation) {
        const repositories = await AddGithubInstallationMutation.loadRepositoriesForInstallation(database, {
          companyId: installationTarget.companyId,
          installationId,
        });

        return {
          githubInstallation: AddGithubInstallationMutation.serializeInstallation(existingInstallation),
          organizationSlug: installationTarget.organizationSlug,
          repositories: repositories.map((repository) =>
            AddGithubInstallationMutation.serializeRepository(repository)
          ),
          returnPath: installationTarget.returnPath,
        };
      }

      const githubInstallationRepositories = await this.githubClient.getInstallationRepositories(installationId);
      const githubInstallationAccount = await this.githubClient.getInstallationAccount(installationId);
      const now = new Date();
      const repositoryInsertValues = githubInstallationRepositories.map((repository) =>
        AddGithubInstallationMutation.createRepositoryInsertValue({
          companyId: installationTarget.companyId,
          installationId,
          repository,
          timestamp: now,
        })
      );

      try {
        const [createdInstallation] = await (database
          .insert(companyGithubInstallations)
          .values({
            accountLogin: githubInstallationAccount.login,
            installationId,
            companyId: installationTarget.companyId,
            createdAt: now,
          })
          .returning({
            accountLogin: companyGithubInstallations.accountLogin,
            installationId: companyGithubInstallations.installationId,
            createdAt: companyGithubInstallations.createdAt,
          })) as GithubInstallationRecord[];

        if (repositoryInsertValues.length > 0) {
          await database
            .insert(githubRepositories)
            .values(repositoryInsertValues)
            .returning();
        }

        if (!createdInstallation) {
          throw new Error("Failed to add GitHub installation.");
        }

        return {
          githubInstallation: AddGithubInstallationMutation.serializeInstallation(createdInstallation),
          organizationSlug: installationTarget.organizationSlug,
          repositories: repositoryInsertValues.map((repository) =>
            AddGithubInstallationMutation.serializeInsertedRepository(repository)
          ),
          returnPath: installationTarget.returnPath,
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
    });

    await this.notifySourceSession(installationTarget, payload.repositories.length);

    return payload;
  };

  private resolveInstallationTarget(
    arguments_: AddGithubInstallationMutationArguments,
    context: GraphqlRequestContext,
  ): InstallationTarget {
    if (!context.authSession) {
      throw new Error("Authentication required.");
    }

    const serializedState = String(arguments_.input.state || "").trim();
    if (!serializedState) {
      throw new Error("GitHub installation state is required.");
    }

    const installationState = this.githubInstallationStateService.readState(serializedState);
    if (installationState.userId !== context.authSession.user.id) {
      throw new Error("GitHub installation state does not match the authenticated user.");
    }

    return {
      companyId: installationState.companyId,
      organizationSlug: installationState.organizationSlug,
      returnPath: installationState.returnPath,
      sourceSessionId: installationState.sourceSessionId,
      userId: installationState.userId,
    };
  }

  private async executeForInstallationTarget<T>(
    context: GraphqlRequestContext,
    installationTarget: InstallationTarget,
    callback: (database: CompanyScopedDatabase) => Promise<T>,
  ): Promise<T> {
    void context;
    return this.appRuntimeDatabase.withCompanyContext(installationTarget.companyId, async (database) => {
      return callback(database as CompanyScopedDatabase);
    });
  }

  private async ensureMembership(
    database: CompanyScopedDatabase,
    installationTarget: InstallationTarget,
  ): Promise<void> {
    const [membership] = await (database
      .select({
        userId: companyMembers.userId,
      })
      .from(companyMembers)
      .where(and(
        eq(companyMembers.companyId, installationTarget.companyId),
        eq(companyMembers.userId, installationTarget.userId),
      ))
      .limit(1)) as Array<{ userId: string }>;
    if (!membership) {
      throw new Error("GitHub installation state is no longer valid for this company.");
    }
  };

  private async notifySourceSession(
    installationTarget: InstallationTarget,
    repositoryCount: number,
  ): Promise<void> {
    if (!installationTarget.sourceSessionId) {
      return;
    }
    if (!this.sessionManagerService) {
      throw new Error("Session manager service is required to notify the source GitHub installation session.");
    }

    const repositoryLabel = repositoryCount === 1 ? "repository" : "repositories";
    await this.sessionManagerService.prompt(
      this.createCompanyTransactionProvider(installationTarget.companyId),
      installationTarget.companyId,
      installationTarget.sourceSessionId,
      `GitHub installation connected. ${repositoryCount} ${repositoryLabel} synced and available in CompanyHelm.`,
      undefined,
      undefined,
      true,
      undefined,
      installationTarget.userId,
    );
  }

  private createCompanyTransactionProvider(companyId: string): TransactionProviderInterface {
    return {
      transaction: async <T>(callback: (tx: AppRuntimeTransaction) => Promise<T>): Promise<T> => {
        return this.appRuntimeDatabase.withCompanyContext(companyId, async (database) => {
          return callback(database as AppRuntimeTransaction);
        });
      },
    };
  }

  private static async loadRepositoriesForInstallation(
    selectableDatabase: SelectableDatabase,
    params: {
      companyId: string;
      installationId: number;
    },
  ): Promise<GithubRepositoryRecord[]> {
    const rows = await selectableDatabase
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

    return rows as GithubRepositoryRecord[];
  }

  private static serializeInstallation(record: GithubInstallationRecord): GraphqlGithubInstallationRecord {
    return {
      accountLogin: record.accountLogin,
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
