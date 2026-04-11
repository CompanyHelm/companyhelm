import { inject, injectable } from "inversify";
import { GraphqlSkillPresenter, type GraphqlSkillGroupRecord } from "../skill_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillService } from "../../services/skills/service.ts";
import { Mutation } from "./mutation.ts";

type UpdateSkillGroupMutationArguments = {
  input: {
    id: string;
    name?: string | null;
  };
};

/**
 * Renames one existing skill group without disturbing the skills already attached to it.
 */
@injectable()
export class UpdateSkillGroupMutation extends Mutation<
  UpdateSkillGroupMutationArguments,
  GraphqlSkillGroupRecord
> {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    super();
    this.skillService = skillService;
  }

  protected resolve = async (
    arguments_: UpdateSkillGroupMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillGroupRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const group = await this.skillService.updateSkillGroup(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      name: arguments_.input.name,
      skillGroupId: arguments_.input.id,
    });

    return GraphqlSkillPresenter.presentSkillGroup(group);
  };
}
