import { inject, injectable } from "inversify";
import { SkillService } from "../../services/skills/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSkillPresenter, type GraphqlSkillGroupRecord } from "../skill_presenter.ts";
import { Mutation } from "./mutation.ts";

type AttachSkillGroupToAgentMutationArguments = {
  input: {
    agentId: string;
    skillGroupId: string;
  };
};

/**
 * Attaches one skill group to an agent so future session assembly can reason about grouped skills
 * separately from individually selected skills.
 */
@injectable()
export class AttachSkillGroupToAgentMutation extends Mutation<
  AttachSkillGroupToAgentMutationArguments,
  GraphqlSkillGroupRecord
> {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    super();
    this.skillService = skillService;
  }

  protected resolve = async (
    arguments_: AttachSkillGroupToAgentMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillGroupRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const group = await this.skillService.attachSkillGroupToAgent(context.app_runtime_transaction_provider, {
      agentId: arguments_.input.agentId,
      companyId: context.authSession.company.id,
      skillGroupId: arguments_.input.skillGroupId,
      userId: context.authSession.user.id,
    });

    return GraphqlSkillPresenter.presentSkillGroup(group);
  };
}
