import { inject, injectable } from "inversify";
import { AdminDatabase } from "../../db/admin_database.ts";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import { AppRuntimeTransactionProvider } from "../../db/app_runtime_transaction_provider.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { ApiLogger } from "../../log/api_logger.ts";
import { SkillGithubCatalog, type SkillGitSourceInput } from "./github/catalog.ts";
import { SkillService, type SkillRecord } from "./service.ts";

export type SkillRepositoryUpdateResult = {
  autoUpdatedSkills: number;
  checkedSkills: number;
  failedSkills: number;
  refreshedBranchCommits: number;
  skippedBecauseLocked: boolean;
};

type CompanyRow = {
  id: string;
};

/**
 * Keeps repository-backed skills aligned with their selected branch. The service deliberately
 * separates branch-head refresh from metadata installation so scheduled runs can detect available
 * updates before deciding whether auto-update should move the tracked snapshot.
 */
@injectable()
export class SkillRepositoryUpdateService {
  private static readonly ADVISORY_LOCK_KEY = "companyhelm_skill_repository_update";
  private readonly adminDatabase: AdminDatabase;
  private readonly appRuntimeDatabase: AppRuntimeDatabase;
  private readonly logger: ApiLogger;
  private readonly skillGithubCatalog: SkillGithubCatalog;
  private readonly skillService: SkillService;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(AppRuntimeDatabase) appRuntimeDatabase: AppRuntimeDatabase,
    @inject(ApiLogger) logger: ApiLogger,
    @inject(SkillService) skillService: SkillService = new SkillService(),
    @inject(SkillGithubCatalog) skillGithubCatalog: SkillGithubCatalog = new SkillGithubCatalog(),
  ) {
    this.adminDatabase = adminDatabase;
    this.appRuntimeDatabase = appRuntimeDatabase;
    this.logger = logger;
    this.skillGithubCatalog = skillGithubCatalog;
    this.skillService = skillService;
  }

  async updateAllCompanies(): Promise<SkillRepositoryUpdateResult> {
    if (!await this.acquireUpdateLock()) {
      return this.emptyResult(true);
    }

    try {
      let result = this.emptyResult(false);
      for (const companyId of await this.listCompanyIds()) {
        const companyResult = await this.updateCompanySkills(
          new AppRuntimeTransactionProvider(this.appRuntimeDatabase, companyId),
          companyId,
        );
        result = SkillRepositoryUpdateService.mergeResults(result, companyResult);
      }

      return result;
    } finally {
      await this.releaseUpdateLock();
    }
  }

  async updateCompanySkills(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<SkillRepositoryUpdateResult> {
    const branchRefreshResult = await this.refreshCompanyBranchCommits(transactionProvider, companyId);
    const autoUpdateResult = await this.autoUpdateCompanySkills(transactionProvider, companyId);

    return SkillRepositoryUpdateService.mergeResults(branchRefreshResult, autoUpdateResult);
  }

  async updateSkillNow(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    skillId: string,
  ): Promise<SkillRecord> {
    const skill = await this.skillService.getSkill(transactionProvider, companyId, skillId);
    return this.updateRepositoryBackedSkillFromCurrentBranch(transactionProvider, companyId, skill);
  }

  private async refreshCompanyBranchCommits(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<SkillRepositoryUpdateResult> {
    const result = this.emptyResult(false);
    const repositorySkills = (await this.skillService.listSkills(transactionProvider, companyId))
      .filter((skill) => this.isRepositoryBackedSkill(skill));

    for (const skill of repositorySkills) {
      result.checkedSkills += 1;
      try {
        const branchCommit = await this.skillGithubCatalog.resolveBranchCommitSha(transactionProvider, {
          branchName: this.requireRepositoryField(skill.branchName, skill.name, "branch name"),
          companyId,
          source: this.toGitSource(skill),
        });
        if (branchCommit.commitSha !== skill.branchCommitSha) {
          await this.skillService.updateRepositorySkillBranchCommitSha(transactionProvider, {
            branchCommitSha: branchCommit.commitSha,
            companyId,
            skillId: skill.id,
          });
          result.refreshedBranchCommits += 1;
        }
      } catch (error) {
        result.failedSkills += 1;
        this.logSkillUpdateFailure(skill, error, "failed to refresh skill branch commit sha");
      }
    }

    return result;
  }

  private async autoUpdateCompanySkills(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<SkillRepositoryUpdateResult> {
    const result = this.emptyResult(false);
    const repositorySkills = (await this.skillService.listSkills(transactionProvider, companyId))
      .filter((skill) =>
        this.isRepositoryBackedSkill(skill)
        && Boolean(skill.autoUpdate)
        && Boolean(skill.branchCommitSha)
        && skill.branchCommitSha !== skill.trackedCommitSha
      );

    for (const skill of repositorySkills) {
      try {
        await this.updateRepositoryBackedSkillFromCurrentBranch(transactionProvider, companyId, skill);
        result.autoUpdatedSkills += 1;
      } catch (error) {
        result.failedSkills += 1;
        this.logSkillUpdateFailure(skill, error, "failed to auto-update skill metadata");
      }
    }

    return result;
  }

  private async updateRepositoryBackedSkillFromCurrentBranch(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    skill: SkillRecord,
  ): Promise<SkillRecord> {
    if (!this.isRepositoryBackedSkill(skill)) {
      throw new Error("Only repository-backed skills can be refreshed.");
    }

    const skillPackage = await this.skillGithubCatalog.resolveSkillPackage(transactionProvider, {
      branchName: this.requireRepositoryField(skill.branchName, skill.name, "branch name"),
      companyId,
      skillDirectory: this.requireRepositoryField(skill.skillDirectory, skill.name, "skill directory"),
      source: this.toGitSource(skill),
    });

    return this.skillService.updateRepositorySkillMetadata(transactionProvider, {
      branchCommitSha: skillPackage.commitSha,
      branchName: skillPackage.branchName,
      companyId,
      description: skillPackage.description,
      fileList: skillPackage.fileList,
      instructions: skillPackage.instructions,
      name: skillPackage.name,
      skillDirectory: skillPackage.skillDirectory,
      skillId: skill.id,
      trackedCommitSha: skillPackage.commitSha,
    });
  }

  private async acquireUpdateLock(): Promise<boolean> {
    const [row] = await this.adminDatabase.getSqlClient()<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_lock(hashtext(${SkillRepositoryUpdateService.ADVISORY_LOCK_KEY})) AS "acquired"
    `;

    return Boolean(row?.acquired);
  }

  private async releaseUpdateLock(): Promise<void> {
    await this.adminDatabase.getSqlClient()`
      SELECT pg_advisory_unlock(hashtext(${SkillRepositoryUpdateService.ADVISORY_LOCK_KEY}))
    `;
  }

  private async listCompanyIds(): Promise<string[]> {
    const companies = await this.adminDatabase.getSqlClient()<CompanyRow[]>`
      SELECT "id"
      FROM "companies"
      ORDER BY "id" ASC
    `;

    return companies.map((company) => company.id);
  }

  private emptyResult(skippedBecauseLocked: boolean): SkillRepositoryUpdateResult {
    return {
      autoUpdatedSkills: 0,
      checkedSkills: 0,
      failedSkills: 0,
      refreshedBranchCommits: 0,
      skippedBecauseLocked,
    };
  }

  private isRepositoryBackedSkill(skill: SkillRecord): boolean {
    return skill.sourceType === "public_git" || skill.sourceType === "github_installation";
  }

  private logSkillUpdateFailure(skill: SkillRecord, error: unknown, message: string): void {
    this.logger.getLogger().warn({
      error: error instanceof Error ? error.message : "Unknown skill repository update failure.",
      skillId: skill.id,
      skillName: skill.name,
    }, message);
  }

  private requireRepositoryField(value: string | null | undefined, skillName: string, fieldName: string): string {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      throw new Error(`Skill ${skillName} is missing repository ${fieldName}.`);
    }

    return normalizedValue;
  }

  private toGitSource(skill: SkillRecord): SkillGitSourceInput {
    if (skill.sourceType === "github_installation") {
      return {
        githubRepositoryId: this.requireRepositoryField(skill.githubRepositoryId, skill.name, "id"),
        repository: null,
        sourceType: "github_installation",
      };
    }

    return {
      githubRepositoryId: null,
      repository: this.requireRepositoryField(skill.repository, skill.name, "name"),
      sourceType: "public_git",
    };
  }

  private static mergeResults(
    left: SkillRepositoryUpdateResult,
    right: SkillRepositoryUpdateResult,
  ): SkillRepositoryUpdateResult {
    return {
      autoUpdatedSkills: left.autoUpdatedSkills + right.autoUpdatedSkills,
      checkedSkills: left.checkedSkills + right.checkedSkills,
      failedSkills: left.failedSkills + right.failedSkills,
      refreshedBranchCommits: left.refreshedBranchCommits + right.refreshedBranchCommits,
      skippedBecauseLocked: left.skippedBecauseLocked || right.skippedBecauseLocked,
    };
  }
}
