import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { githubRepositories } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import {
  type GithubDiscoveredSkillDirectory,
  GithubClient,
} from "../../github/client.ts";
import { SkillService, type SkillRecord } from "./service.ts";

type GithubRepositoryRecord = {
  defaultBranch: string | null;
  fullName: string;
  id: string;
  installationId: number;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<GithubRepositoryRecord[]>;
    };
  };
};

/**
 * Bridges the company-scoped GitHub repository cache with the skill catalog so GraphQL can expose
 * repository discovery and import flows without duplicating GitHub lookup logic.
 */
@injectable()
export class GithubSkillService {
  private readonly githubClient: GithubClient;
  private readonly skillService: SkillService;

  constructor(
    @inject(GithubClient) githubClient: GithubClient = new GithubClient({} as Config),
    @inject(SkillService) skillService: SkillService = new SkillService(),
  ) {
    this.githubClient = githubClient;
    this.skillService = skillService;
  }

  async listSkillDirectories(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      repositoryId: string;
    },
  ): Promise<GithubDiscoveredSkillDirectory[]> {
    const repository = await this.requireRepository(transactionProvider, input);
    const branchName = this.requireDefaultBranch(repository.defaultBranch);

    return this.githubClient.listSkillDirectories({
      defaultBranch: branchName,
      installationId: repository.installationId,
      repositoryFullName: repository.fullName,
    });
  }

  async importSkill(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      repositoryId: string;
      skillDirectory: string;
      skillGroupId?: string | null;
    },
  ): Promise<SkillRecord> {
    const repository = await this.requireRepository(transactionProvider, input);
    const branchName = this.requireDefaultBranch(repository.defaultBranch);
    const skillPackage = await this.githubClient.getSkillPackage({
      defaultBranch: branchName,
      installationId: repository.installationId,
      repositoryFullName: repository.fullName,
      skillDirectory: input.skillDirectory,
    });

    return this.skillService.createGithubSkill(transactionProvider, {
      companyId: input.companyId,
      description: skillPackage.description,
      fileList: skillPackage.fileList,
      githubBranchName: skillPackage.branchName,
      instructions: skillPackage.instructions,
      name: skillPackage.name,
      repository: skillPackage.repositoryFullName,
      skillDirectory: skillPackage.path,
      skillGroupId: input.skillGroupId,
    });
  }

  private async requireRepository(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      repositoryId: string;
    },
  ): Promise<GithubRepositoryRecord> {
    const [repository] = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;

      return selectableDatabase
        .select({
          defaultBranch: githubRepositories.defaultBranch,
          fullName: githubRepositories.fullName,
          id: githubRepositories.id,
          installationId: githubRepositories.installationId,
        })
        .from(githubRepositories)
        .where(and(
          eq(githubRepositories.companyId, input.companyId),
          eq(githubRepositories.id, input.repositoryId),
        ));
    });

    if (!repository) {
      throw new Error("GitHub repository not found.");
    }

    return repository;
  }

  private requireDefaultBranch(defaultBranch: string | null): string {
    const normalizedValue = String(defaultBranch || "").trim();
    if (!normalizedValue) {
      throw new Error("GitHub repository default branch is not available.");
    }

    return normalizedValue;
  }
}
