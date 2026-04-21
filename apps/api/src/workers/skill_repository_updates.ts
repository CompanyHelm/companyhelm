import { inject, injectable } from "inversify";
import { ApiLogger } from "../log/api_logger.ts";
import { SkillRepositoryUpdateService } from "../services/skills/repository_update_service.ts";
import { WorkerBase } from "./worker_base.ts";

/**
 * Runs the daily repository skill update pass. The worker only owns scheduling and logging; branch
 * inspection, auto-update decisions, and metadata writes stay in SkillRepositoryUpdateService.
 */
@injectable()
export class SkillRepositoryUpdateWorker extends WorkerBase {
  private static readonly INTERVAL_SECONDS = 24 * 60 * 60;
  private readonly skillRepositoryUpdateService: SkillRepositoryUpdateService;

  constructor(
    @inject(ApiLogger) logger: ApiLogger,
    @inject(SkillRepositoryUpdateService)
    skillRepositoryUpdateService: SkillRepositoryUpdateService = {
      async updateAllCompanies() {
        return {
          autoUpdatedSkills: 0,
          checkedSkills: 0,
          failedSkills: 0,
          refreshedBranchCommits: 0,
          skippedBecauseLocked: false,
        };
      },
    } as SkillRepositoryUpdateService,
  ) {
    super("skill_repository_updates", SkillRepositoryUpdateWorker.INTERVAL_SECONDS, logger);
    this.skillRepositoryUpdateService = skillRepositoryUpdateService;
  }

  protected async run(): Promise<void> {
    const result = await this.skillRepositoryUpdateService.updateAllCompanies();
    this.getLogger().info(result, "skill repository update pass completed");
  }
}
