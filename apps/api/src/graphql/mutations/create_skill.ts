import { inject, injectable } from "inversify";
import { GraphqlSkillPresenter, type GraphqlSkillRecord } from "../skill_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillService } from "../../services/skills/service.ts";
import { Mutation } from "./mutation.ts";

type CreateSkillMutationArguments = {
  input: {
    description: string;
    instructions: string;
    name: string;
    skillGroupId?: string | null;
  };
};

/**
 * Creates one manual skill entry. Repository-backed import is intentionally not part of this
 * mutation because that flow is still mocked on the web side.
 */
@injectable()
export class CreateSkillMutation extends Mutation<CreateSkillMutationArguments, GraphqlSkillRecord> {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    super();
    this.skillService = skillService;
  }

  protected resolve = async (
    arguments_: CreateSkillMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const skill = await this.skillService.createSkill(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      description: arguments_.input.description,
      instructions: arguments_.input.instructions,
      name: arguments_.input.name,
      skillGroupId: arguments_.input.skillGroupId,
    });

    return GraphqlSkillPresenter.presentSkill(skill);
  };
}
