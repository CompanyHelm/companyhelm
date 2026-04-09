import { inject, injectable } from "inversify";
import { GraphqlSkillPresenter, type GraphqlSkillRecord } from "../skill_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillService } from "../../services/skills/service.ts";
import { Mutation } from "./mutation.ts";

type DeleteSkillMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Deletes one skill from the authenticated company's catalog and returns the removed record so the
 * client can evict it from the current list without an extra refetch.
 */
@injectable()
export class DeleteSkillMutation extends Mutation<DeleteSkillMutationArguments, GraphqlSkillRecord> {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    super();
    this.skillService = skillService;
  }

  protected resolve = async (
    arguments_: DeleteSkillMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const skill = await this.skillService.deleteSkill(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      skillId: arguments_.input.id,
    });

    return GraphqlSkillPresenter.presentSkill(skill);
  };
}
