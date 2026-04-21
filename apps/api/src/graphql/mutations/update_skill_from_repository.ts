import { inject, injectable } from "inversify";
import { SkillRepositoryUpdateService } from "../../services/skills/repository_update_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSkillPresenter, type GraphqlSkillRecord } from "../skill_presenter.ts";
import { Mutation } from "./mutation.ts";

type UpdateSkillFromRepositoryMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Forces one repository-backed skill to refresh from its configured branch immediately, regardless
 * of the skill's scheduled auto-update preference.
 */
@injectable()
export class UpdateSkillFromRepositoryMutation extends Mutation<
  UpdateSkillFromRepositoryMutationArguments,
  GraphqlSkillRecord
> {
  private readonly skillRepositoryUpdateService: SkillRepositoryUpdateService;

  constructor(
    @inject(SkillRepositoryUpdateService)
    skillRepositoryUpdateService: SkillRepositoryUpdateService,
  ) {
    super();
    this.skillRepositoryUpdateService = skillRepositoryUpdateService;
  }

  protected resolve = async (
    arguments_: UpdateSkillFromRepositoryMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const skill = await this.skillRepositoryUpdateService.updateSkillNow(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.id,
    );

    return GraphqlSkillPresenter.presentSkill(skill);
  };
}
