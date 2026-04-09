import { inject, injectable } from "inversify";
import { SkillService } from "../../services/skills/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSkillPresenter, type GraphqlSkillGroupRecord } from "../skill_presenter.ts";
import { Mutation } from "./mutation.ts";

type DetachSkillGroupFromAgentMutationArguments = {
  input: {
    agentId: string;
    skillGroupId: string;
  };
};

/**
 * Removes one attached skill group from an agent while leaving any direct skill selections in
 * place.
 */
@injectable()
export class DetachSkillGroupFromAgentMutation extends Mutation<
  DetachSkillGroupFromAgentMutationArguments,
  GraphqlSkillGroupRecord
> {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    super();
    this.skillService = skillService;
  }

  protected resolve = async (
    arguments_: DetachSkillGroupFromAgentMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillGroupRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const group = await this.skillService.detachSkillGroupFromAgent(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.agentId,
      arguments_.input.skillGroupId,
    );

    return GraphqlSkillPresenter.presentSkillGroup(group);
  };
}
