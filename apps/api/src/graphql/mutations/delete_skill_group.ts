import { inject, injectable } from "inversify";
import { GraphqlSkillPresenter, type GraphqlSkillGroupRecord } from "../skill_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillService } from "../../services/skills/service.ts";
import { Mutation } from "./mutation.ts";

type DeleteSkillGroupMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Deletes one skill group for the authenticated company. Skills remain intact because the foreign
 * key is defined with `onDelete: set null`, so they fall back to the ungrouped bucket.
 */
@injectable()
export class DeleteSkillGroupMutation extends Mutation<
  DeleteSkillGroupMutationArguments,
  GraphqlSkillGroupRecord
> {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    super();
    this.skillService = skillService;
  }

  protected resolve = async (
    arguments_: DeleteSkillGroupMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillGroupRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const group = await this.skillService.deleteSkillGroup(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      skillGroupId: arguments_.input.id,
    });

    return GraphqlSkillPresenter.presentSkillGroup(group);
  };
}
