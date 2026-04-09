import { inject, injectable } from "inversify";
import { SkillService } from "../../services/skills/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSkillPresenter, type GraphqlSkillRecord } from "../skill_presenter.ts";
import { Mutation } from "./mutation.ts";

type DetachSkillFromAgentMutationArguments = {
  input: {
    agentId: string;
    skillId: string;
  };
};

/**
 * Removes one explicitly attached skill from an agent while leaving any attached skill groups
 * untouched.
 */
@injectable()
export class DetachSkillFromAgentMutation extends Mutation<
  DetachSkillFromAgentMutationArguments,
  GraphqlSkillRecord
> {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    super();
    this.skillService = skillService;
  }

  protected resolve = async (
    arguments_: DetachSkillFromAgentMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const skill = await this.skillService.detachSkillFromAgent(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.agentId,
      arguments_.input.skillId,
    );

    return GraphqlSkillPresenter.presentSkill(skill);
  };
}
