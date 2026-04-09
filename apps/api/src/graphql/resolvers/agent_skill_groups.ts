import { inject, injectable } from "inversify";
import { SkillService } from "../../services/skills/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSkillPresenter, type GraphqlSkillGroupRecord } from "../skill_presenter.ts";

type AgentSkillGroupsQueryArguments = {
  agentId: string;
};

/**
 * Lists the skill groups explicitly attached to one agent so the web app can manage reusable
 * bundles separately from direct individual skill attachments.
 */
@injectable()
export class AgentSkillGroupsQueryResolver {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    this.skillService = skillService;
  }

  execute = async (
    _root: unknown,
    arguments_: AgentSkillGroupsQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillGroupRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const groups = await this.skillService.listAgentSkillGroups(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.agentId,
    );

    return groups.map((group) => GraphqlSkillPresenter.presentSkillGroup(group));
  };
}
