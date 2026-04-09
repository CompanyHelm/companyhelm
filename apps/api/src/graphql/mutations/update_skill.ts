import { inject, injectable } from "inversify";
import { GraphqlSkillPresenter, type GraphqlSkillRecord } from "../skill_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillService } from "../../services/skills/service.ts";
import { Mutation } from "./mutation.ts";

type UpdateSkillMutationArguments = {
  input: {
    description?: string | null;
    id: string;
    instructions?: string | null;
    name?: string | null;
    skillGroupId?: string | null;
  };
};

/**
 * Updates the editable skill fields, including its group assignment.
 */
@injectable()
export class UpdateSkillMutation extends Mutation<UpdateSkillMutationArguments, GraphqlSkillRecord> {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    super();
    this.skillService = skillService;
  }

  protected resolve = async (
    arguments_: UpdateSkillMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const skill = await this.skillService.updateSkill(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      description: arguments_.input.description,
      instructions: arguments_.input.instructions,
      name: arguments_.input.name,
      skillGroupId: arguments_.input.skillGroupId,
      skillId: arguments_.input.id,
    });

    return GraphqlSkillPresenter.presentSkill(skill);
  };
}
