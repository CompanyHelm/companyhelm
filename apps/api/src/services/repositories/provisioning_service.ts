import { and, asc, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import { githubRepositories, githubRepositoryProvisionings } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";

export type GithubRepositoryProvisioningRepositoryRecord = {
  archived: boolean;
  defaultBranch: string | null;
  externalId: string;
  fullName: string;
  htmlUrl: string | null;
  id: string;
  installationId: number;
  isPrivate: boolean;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type GithubRepositoryProvisioningRecord = {
  companyId: string;
  createdAt: Date;
  githubRepository: GithubRepositoryProvisioningRepositoryRecord;
  githubRepositoryId: string;
  id: string;
  updatedAt: Date;
};

type GithubRepositoryProvisioningRow = {
  companyId: string;
  createdAt: Date;
  githubRepositoryId: string;
  id: string;
  updatedAt: Date;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(limit: number): Promise<Array<Record<string, unknown>>>;
        orderBy(...fields: unknown[]): Promise<Array<Record<string, unknown>>>;
      };
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): {
      returning(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Owns company-scoped repository pins that should be present in every agent workspace. The service
 * keeps the user-facing pin action tied to the durable GitHub repository row while enforcing that
 * derived checkout directories cannot collide inside `~/workspace`.
 */
@injectable()
export class GithubRepositoryProvisioningService {
  async listProvisionings(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<GithubRepositoryProvisioningRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      return this.listProvisioningsInDatabase(tx as unknown as SelectableDatabase, companyId);
    });
  }

  async createProvisioning(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      githubRepositoryId: string;
    },
  ): Promise<GithubRepositoryProvisioningRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const repository = await this.loadRepositoryById(
        selectableDatabase,
        input.companyId,
        input.githubRepositoryId,
      );
      if (!repository) {
        throw new Error("GitHub repository not found.");
      }

      const existingProvisionings = await this.listProvisioningsInDatabase(selectableDatabase, input.companyId);
      const existingProvisioning = existingProvisionings.find((provisioning) =>
        provisioning.githubRepositoryId === repository.id
      );
      if (existingProvisioning) {
        return existingProvisioning;
      }

      const collidingProvisioning = existingProvisionings.find((provisioning) =>
        provisioning.githubRepository.name === repository.name
      );
      if (collidingProvisioning) {
        throw new Error(
          `A workspace repository named "${repository.name}" is already pinned.`,
        );
      }

      const now = new Date();
      const insertableDatabase = tx as unknown as InsertableDatabase;
      const [createdProvisioning] = await insertableDatabase
        .insert(githubRepositoryProvisionings)
        .values({
          companyId: input.companyId,
          createdAt: now,
          githubRepositoryId: repository.id,
          updatedAt: now,
        })
        .returning(this.provisioningSelection()) as GithubRepositoryProvisioningRow[];
      if (!createdProvisioning) {
        throw new Error("Failed to pin the GitHub repository.");
      }

      return {
        ...createdProvisioning,
        githubRepository: repository,
      };
    });
  }

  async deleteProvisioning(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      provisioningId: string;
    },
  ): Promise<string> {
    return transactionProvider.transaction(async (tx) => {
      const deletableDatabase = tx as unknown as DeletableDatabase;
      const [deletedProvisioning] = await deletableDatabase
        .delete(githubRepositoryProvisionings)
        .where(and(
          eq(githubRepositoryProvisionings.companyId, input.companyId),
          eq(githubRepositoryProvisionings.id, input.provisioningId),
        ))
        .returning({
          id: githubRepositoryProvisionings.id,
        }) as Array<{ id: string }>;
      if (!deletedProvisioning) {
        throw new Error("GitHub repository provisioning not found.");
      }

      return deletedProvisioning.id;
    });
  }

  private async listProvisioningsInDatabase(
    selectableDatabase: SelectableDatabase,
    companyId: string,
  ): Promise<GithubRepositoryProvisioningRecord[]> {
    const provisioningRows = await selectableDatabase
      .select(this.provisioningSelection())
      .from(githubRepositoryProvisionings)
      .where(eq(githubRepositoryProvisionings.companyId, companyId))
      .orderBy(asc(githubRepositoryProvisionings.createdAt)) as GithubRepositoryProvisioningRow[];
    const repositoryIds = provisioningRows.map((provisioning) => provisioning.githubRepositoryId);
    const repositories = await this.loadRepositoriesByIds(selectableDatabase, companyId, repositoryIds);
    const repositoryById = new Map(repositories.map((repository) => [repository.id, repository]));

    return provisioningRows
      .map((provisioning) => {
        const repository = repositoryById.get(provisioning.githubRepositoryId);
        if (!repository) {
          throw new Error("Pinned GitHub repository not found.");
        }

        return {
          ...provisioning,
          githubRepository: repository,
        };
      })
      .sort((leftProvisioning, rightProvisioning) =>
        leftProvisioning.githubRepository.fullName.localeCompare(rightProvisioning.githubRepository.fullName)
      );
  }

  private async loadRepositoryById(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    githubRepositoryId: string,
  ): Promise<GithubRepositoryProvisioningRepositoryRecord | null> {
    const [repository] = await selectableDatabase
      .select(this.repositorySelection())
      .from(githubRepositories)
      .where(and(
        eq(githubRepositories.companyId, companyId),
        eq(githubRepositories.id, githubRepositoryId),
      ))
      .limit(1) as GithubRepositoryProvisioningRepositoryRecord[];

    return repository ?? null;
  }

  private async loadRepositoriesByIds(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    githubRepositoryIds: string[],
  ): Promise<GithubRepositoryProvisioningRepositoryRecord[]> {
    if (githubRepositoryIds.length === 0) {
      return [];
    }

    return selectableDatabase
      .select(this.repositorySelection())
      .from(githubRepositories)
      .where(and(
        eq(githubRepositories.companyId, companyId),
        inArray(githubRepositories.id, githubRepositoryIds),
      ))
      .orderBy(asc(githubRepositories.fullName), asc(githubRepositories.externalId)) as Promise<
        GithubRepositoryProvisioningRepositoryRecord[]
      >;
  }

  private provisioningSelection(): Record<string, unknown> {
    return {
      companyId: githubRepositoryProvisionings.companyId,
      createdAt: githubRepositoryProvisionings.createdAt,
      githubRepositoryId: githubRepositoryProvisionings.githubRepositoryId,
      id: githubRepositoryProvisionings.id,
      updatedAt: githubRepositoryProvisionings.updatedAt,
    };
  }

  private repositorySelection(): Record<string, unknown> {
    return {
      archived: githubRepositories.archived,
      createdAt: githubRepositories.createdAt,
      defaultBranch: githubRepositories.defaultBranch,
      externalId: githubRepositories.externalId,
      fullName: githubRepositories.fullName,
      htmlUrl: githubRepositories.htmlUrl,
      id: githubRepositories.id,
      installationId: githubRepositories.installationId,
      isPrivate: githubRepositories.isPrivate,
      name: githubRepositories.name,
      updatedAt: githubRepositories.updatedAt,
    };
  }
}
