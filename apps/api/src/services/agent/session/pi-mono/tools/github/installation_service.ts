import { and, asc, eq } from "drizzle-orm";
import {
  companyGithubInstallations,
  githubRepositories,
} from "../../../../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../../../../db/transaction_provider_interface.ts";
import { GithubClient } from "../../../../../../github/client.ts";

type GithubInstallationRow = {
  createdAt: Date;
  installationId: number;
};

type GithubInstallationLookupRow = {
  installationId: number;
};

type GithubRepositoryRow = {
  archived: boolean;
  defaultBranch: string | null;
  fullName: string;
  htmlUrl: string | null;
  installationId: number;
  isPrivate: boolean;
  name: string;
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

export type AgentGithubInstallationRepository = {
  archived: boolean;
  defaultBranch: string | null;
  fullName: string;
  htmlUrl: string | null;
  installationId: number;
  isPrivate: boolean;
  name: string;
};

export type AgentGithubInstallation = {
  createdAt: Date;
  installationId: number;
  repositories: AgentGithubInstallationRepository[];
};

/**
 * Loads the company-linked GitHub installations available to the current agent session and mints
 * installation access tokens on demand. Keeping this logic in one place lets the PI Mono tools
 * stay focused on presentation while still enforcing that commands only run against installations
 * the current company has explicitly linked.
 */
export class AgentGithubInstallationService {
  private readonly transactionProvider: TransactionProviderInterface;
  private readonly companyId: string;
  private readonly githubClient: GithubClient;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    githubClient: GithubClient,
  ) {
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
    this.githubClient = githubClient;
  }

  async listInstallations(): Promise<AgentGithubInstallation[]> {
    return this.transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const installations = await selectableDatabase
        .select({
          createdAt: companyGithubInstallations.createdAt,
          installationId: companyGithubInstallations.installationId,
        })
        .from(companyGithubInstallations)
        .where(eq(companyGithubInstallations.companyId, this.companyId))
        .orderBy(asc(companyGithubInstallations.installationId)) as GithubInstallationRow[];
      const repositories = await selectableDatabase
        .select({
          archived: githubRepositories.archived,
          defaultBranch: githubRepositories.defaultBranch,
          fullName: githubRepositories.fullName,
          htmlUrl: githubRepositories.htmlUrl,
          installationId: githubRepositories.installationId,
          isPrivate: githubRepositories.isPrivate,
          name: githubRepositories.name,
        })
        .from(githubRepositories)
        .where(eq(githubRepositories.companyId, this.companyId))
        .orderBy(
          asc(githubRepositories.installationId),
          asc(githubRepositories.fullName),
        ) as GithubRepositoryRow[];

      const repositoriesByInstallationId = new Map<number, AgentGithubInstallationRepository[]>();
      for (const repository of repositories) {
        const installationRepositories = repositoriesByInstallationId.get(repository.installationId) ?? [];
        installationRepositories.push({
          archived: repository.archived,
          defaultBranch: repository.defaultBranch,
          fullName: repository.fullName,
          htmlUrl: repository.htmlUrl,
          installationId: repository.installationId,
          isPrivate: repository.isPrivate,
          name: repository.name,
        });
        repositoriesByInstallationId.set(repository.installationId, installationRepositories);
      }

      return installations.map((installation) => {
        return {
          createdAt: installation.createdAt,
          installationId: installation.installationId,
          repositories: repositoriesByInstallationId.get(installation.installationId) ?? [],
        };
      });
    });
  }

  async getInstallationAccessToken(installationIdValue: string | number | bigint): Promise<string> {
    const installationId = GithubClient.validateInstallationId(installationIdValue);
    await this.assertInstallationLinked(installationId);
    return this.githubClient.getInstallationAccessToken(installationId);
  }

  private async assertInstallationLinked(installationId: number): Promise<void> {
    const installation = await this.transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [row] = await selectableDatabase
        .select({
          installationId: companyGithubInstallations.installationId,
        })
        .from(companyGithubInstallations)
        .where(and(
          eq(companyGithubInstallations.companyId, this.companyId),
          eq(companyGithubInstallations.installationId, installationId),
        ))
        .limit(1) as GithubInstallationLookupRow[];

      return row ?? null;
    });

    if (!installation) {
      throw new Error(`GitHub installation ${installationId} is not linked to this company.`);
    }
  }
}
