import { inject, injectable } from "inversify";
import { GraphqlSkillPresenter, type GraphqlSkillGroupRecord } from "../skill_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillService } from "../../services/skills/service.ts";
import { Mutation } from "./mutation.ts";

type CreateSkillGroupMutationArguments = {
  input: {
    name: string;
  };
};

/**
 * Creates one reusable skill group for the authenticated company so manual and imported skills can
 * share the same folder-like organization model.
 */
@injectable()
export class CreateSkillGroupMutation extends Mutation<
  CreateSkillGroupMutationArguments,
  GraphqlSkillGroupRecord
> {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    super();
    this.skillService = skillService;
  }

  protected resolve = async (
    arguments_: CreateSkillGroupMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillGroupRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const group = await this.skillService.createSkillGroup(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      name: arguments_.input.name,
    });

    return GraphqlSkillPresenter.presentSkillGroup(group);
  };
}
