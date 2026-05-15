import type { TransactionProviderInterface } from "../../../../../../db/transaction_provider_interface.ts";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentEnvironmentSkillPathService } from "../../../../../environments/skills/path_service.ts";
import { SessionSkillService } from "../../../../../skills/session_service.ts";
import { type SkillType, SkillService } from "../../../../../skills/service.ts";
import type { SystemCommandDefinition } from "../../../../../skills/system_command_catalog.ts";

export type AgentSkillSummary = {
  active: boolean;
  description: string;
  files: string[];
  trackedCommitSha: string | null;
  instructions: string;
  name: string;
  repository: string | null;
  skillDirectory: string | null;
  skillType: SkillType;
  systemCommands: SystemCommandDefinition[];
  systemKey: string | null;
};

export type AgentSkillActivationResult = {
  alreadyActive: boolean;
  skill: AgentSkillSummary;
};

export type AgentSkillSearchResult = AgentSkillSummary;

/**
 * Adapts the broader company skill catalog and session-active skill state into the narrow reads
 * and writes needed by the PI Mono skill tools.
 */
export class AgentSkillToolService {
  private readonly companyId: string;
  private readonly agentId: string;
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
    this.agentId = agentId;
    this.promptScope = promptScope;
    this.skillPathService = new AgentEnvironmentSkillPathService();
    this.skillService = skillService;
    this.sessionSkillService = sessionSkillService;
  }

  async activateSkill(skillName: string): Promise<AgentSkillActivationResult> {
    await this.requireAvailableSkill(skillName);
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
      this.skillService.listAgentAvailableSkills(this.transactionProvider, this.companyId, this.agentId),
      this.sessionSkillService.listActiveSkills(this.transactionProvider, this.companyId, this.sessionId),
    ]);
    const activeSkillIds = new Set(activeSkills.map((skill) => skill.id));
    const activeSystemKeys = new Set(activeSkills.flatMap((skill) => skill.systemKey ? [skill.systemKey] : []));

    return availableSkills.map((skill) => this.toSkillSummary(skill, this.isActiveSkill(skill, activeSkillIds, activeSystemKeys)));
  }

  async searchSkills(query: string, limit: number): Promise<AgentSkillSearchResult[]> {
    const searchQuery = query.trim();
    if (searchQuery.length === 0) {
      return [];
    }

    const normalizedLimit = Math.max(1, Math.min(10, limit));
    const [availableSkills, activeSkills] = await Promise.all([
      this.skillService.listAgentAvailableSkills(this.transactionProvider, this.companyId, this.agentId),
      this.sessionSkillService.listActiveSkills(this.transactionProvider, this.companyId, this.sessionId),
    ]);
    const activeSkillIds = new Set(activeSkills.map((skill) => skill.id));
    const activeSystemKeys = new Set(activeSkills.flatMap((skill) => skill.systemKey ? [skill.systemKey] : []));

    return availableSkills
      .map((skill) => ({
        score: this.calculateSearchScore(searchQuery, skill),
        summary: this.toSkillSummary(skill, this.isActiveSkill(skill, activeSkillIds, activeSystemKeys)),
      }))
      .filter((match) => match.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.summary.name.localeCompare(right.summary.name);
      })
      .slice(0, normalizedLimit)
      .map((match) => match.summary);
  }

  private async requireAvailableSkill(skillName: string): Promise<void> {
    const availableSkills = await this.skillService.listAgentAvailableSkills(
      this.transactionProvider,
      this.companyId,
      this.agentId,
    );
    if (availableSkills.some((skill) => skill.name === skillName)) {
      return;
    }

    throw new Error(`Skill ${skillName} is not available to this agent.`);
  }

  private isActiveSkill(
    skill: Awaited<ReturnType<SkillService["getSkill"]>>,
    activeSkillIds: Set<string>,
    activeSystemKeys: Set<string>,
  ): boolean {
    if (skill.systemKey) {
      return activeSystemKeys.has(skill.systemKey);
    }

    return activeSkillIds.has(skill.id);
  }

  private toSkillSummary(
    skill: Awaited<ReturnType<SkillService["getSkill"]>>,
    active: boolean,
  ): AgentSkillSummary {
    return {
      active,
      description: typeof skill.description === "string" ? skill.description : "",
      files: this.toSkillFiles(skill),
      trackedCommitSha: skill.trackedCommitSha,
      instructions: typeof skill.instructions === "string" ? skill.instructions : "",
      name: typeof skill.name === "string" ? skill.name : "",
      repository: skill.repository,
      skillDirectory: skill.skillDirectory,
      skillType: skill.skillType ?? "custom",
      systemCommands: skill.systemCommands ?? [],
      systemKey: skill.systemKey ?? null,
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

  /**
   * Mirrors the cloud tool's ranking shape with OSS-safe string matching so the agent can find
   * the right skill name without relying on database-only search extensions.
   */
  private calculateSearchScore(
    query: string,
    skill: Awaited<ReturnType<SkillService["getSkill"]>>,
  ): number {
    const normalizedQuery = query.toLowerCase();
    const normalizedName = skill.name.toLowerCase();
    const normalizedDescription = skill.description.toLowerCase();
    const descriptionTerms = this.buildDescriptionTerms(query);
    const exactNameBoost = normalizedName === normalizedQuery ? 100 : 0;
    const prefixNameBoost = normalizedName.startsWith(normalizedQuery) ? 20 : 0;
    const substringNameBoost = exactNameBoost === 0 && prefixNameBoost === 0 && normalizedName.includes(normalizedQuery)
      ? 10
      : 0;
    const descriptionBoost = descriptionTerms.reduce((score, term) => {
      if (normalizedDescription.includes(term)) {
        return score + 12;
      }

      return score;
    }, 0);

    return exactNameBoost + prefixNameBoost + substringNameBoost + descriptionBoost;
  }

  /**
   * Drops short connector words so description matching prefers the meaningful capability words
   * the agent is usually searching for.
   */
  private buildDescriptionTerms(query: string): string[] {
    const stopWords = new Set(["a", "an", "and", "for", "i", "in", "me", "my", "of", "or", "so", "the", "them", "to"]);

    return [...new Set(
      query.match(/[A-Za-z0-9_]+/g)?.map((term) => term.toLowerCase()).filter((term) => !stopWords.has(term)) ?? [],
    )];
  }
}
