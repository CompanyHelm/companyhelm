import { inject, injectable } from "inversify";
import { SkillService } from "../../services/skills/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSkillPresenter, type GraphqlSkillRecord } from "../skill_presenter.ts";

type AgentSkillsQueryArguments = {
  agentId: string;
};

/**
 * Lists the individual skills explicitly attached to one agent so the web app can manage those
 * defaults without expanding skill groups implicitly.
 */
@injectable()
export class AgentSkillsQueryResolver {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    this.skillService = skillService;
  }

  execute = async (
    _root: unknown,
    arguments_: AgentSkillsQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const skills = await this.skillService.listAgentSkills(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.agentId,
    );

    return skills.map((skill) => GraphqlSkillPresenter.presentSkill(skill));
  };
}
