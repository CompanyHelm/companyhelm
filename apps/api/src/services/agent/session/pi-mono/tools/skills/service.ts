import type { TransactionProviderInterface } from "../../../../../../db/transaction_provider_interface.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentEnvironmentSkillPathService } from "../../../../../environments/skills/path_service.ts";
import { SessionSkillService } from "../../../../../skills/session_service.ts";
import { SkillService } from "../../../../../skills/service.ts";

export type AgentSkillSummary = {
  active: boolean;
  description: string;
  files: string[];
  githubTrackedCommitSha: string | null;
  name: string;
  repository: string | null;
  skillDirectory: string | null;
};

export type AgentSkillActivationResult = {
  alreadyActive: boolean;
  skill: AgentSkillSummary;
};

/**
 * Adapts the broader company skill catalog and session-active skill state into the narrow reads
 * and writes needed by the PI Mono skill tools.
 */
export class AgentSkillToolService {
  private readonly companyId: string;
  private readonly promptScope: AgentEnvironmentPromptScope;
  private readonly sessionId: string;
  private readonly sessionSkillService: SessionSkillService;
  private readonly skillPathService: AgentEnvironmentSkillPathService;
  private readonly skillService: SkillService;
  private readonly transactionProvider: TransactionProviderInterface;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    agentId: string,
    promptScope: AgentEnvironmentPromptScope,
    skillService: SkillService = new SkillService(),
    sessionSkillService: SessionSkillService = new SessionSkillService(),
  ) {
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
    this.sessionId = sessionId;
    void agentId;
    this.promptScope = promptScope;
    this.skillPathService = new AgentEnvironmentSkillPathService();
    this.skillService = skillService;
    this.sessionSkillService = sessionSkillService;
  }

  async activateSkill(skillName: string): Promise<AgentSkillActivationResult> {
    const activation = await this.sessionSkillService.activateSkill(this.transactionProvider, {
      companyId: this.companyId,
      sessionId: this.sessionId,
      skillName,
    });
    try {
      await this.promptScope.syncSkillIfEnvironmentLeased(activation.skill);
    } catch (error) {
      if (activation.inserted) {
        await this.sessionSkillService.deactivateSkill(this.transactionProvider, {
          companyId: this.companyId,
          sessionId: this.sessionId,
          skillId: activation.skill.id,
        });
      }
      throw new Error(
        `Failed to materialize skill ${activation.skill.name} into the currently leased environment. The activation was rolled back.`,
        {
          cause: error,
        },
      );
    }

    return {
      alreadyActive: !activation.inserted,
      skill: this.toSkillSummary(activation.skill, true),
    };
  }

  async listAvailableSkills(): Promise<AgentSkillSummary[]> {
    const [availableSkills, activeSkills] = await Promise.all([
      this.skillService.listSkills(this.transactionProvider, this.companyId),
      this.sessionSkillService.listActiveSkills(this.transactionProvider, this.companyId, this.sessionId),
    ]);
    const activeSkillNames = new Set(activeSkills.map((skill) => skill.name));

    return availableSkills.map((skill) => this.toSkillSummary(skill, activeSkillNames.has(skill.name)));
  }

  private toSkillSummary(
    skill: Awaited<ReturnType<SkillService["getSkill"]>>,
    active: boolean,
  ): AgentSkillSummary {
    return {
      active,
      description: typeof skill.description === "string" ? skill.description : "",
      files: this.toSkillFiles(skill),
      githubTrackedCommitSha: skill.githubTrackedCommitSha,
      name: typeof skill.name === "string" ? skill.name : "",
      repository: skill.repository,
      skillDirectory: skill.skillDirectory,
    };
  }

  private toSkillFiles(skill: Awaited<ReturnType<SkillService["getSkill"]>>): string[] {
    if (!Array.isArray(skill.fileList) || skill.fileList.length === 0) {
      return [];
    }

    const fileBackedSkill = this.skillPathService.resolveFileBackedSkill(skill);
    if (!fileBackedSkill) {
      return [];
    }

    return skill.fileList.map((repositoryPath) => this.skillPathService.toSkillRelativePath(fileBackedSkill, repositoryPath));
  }
}
