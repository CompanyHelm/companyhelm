import { inject, injectable } from "inversify";
import { SkillService } from "../../services/skills/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSkillPresenter, type GraphqlSkillRecord } from "../skill_presenter.ts";
import { Mutation } from "./mutation.ts";

type AttachSkillToAgentMutationArguments = {
  input: {
    agentId: string;
    skillId: string;
  };
};

/**
 * Attaches one individual company skill to an agent as a stored default for future session skill
 * activation work.
 */
@injectable()
export class AttachSkillToAgentMutation extends Mutation<
  AttachSkillToAgentMutationArguments,
  GraphqlSkillRecord
> {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    super();
    this.skillService = skillService;
  }

  protected resolve = async (
    arguments_: AttachSkillToAgentMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const skill = await this.skillService.attachSkillToAgent(context.app_runtime_transaction_provider, {
      agentId: arguments_.input.agentId,
      companyId: context.authSession.company.id,
      skillId: arguments_.input.skillId,
      userId: context.authSession.user.id,
    });

    return GraphqlSkillPresenter.presentSkill(skill);
  };
}
