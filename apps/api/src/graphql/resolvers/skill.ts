import { inject, injectable } from "inversify";
import { GraphqlSkillPresenter, type GraphqlSkillRecord } from "../skill_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillService } from "../../services/skills/service.ts";

type SkillQueryArguments = {
  id: string;
};

/**
 * Resolves one skill record for the skill detail page.
 */
@injectable()
export class SkillQueryResolver {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    this.skillService = skillService;
  }

  execute = async (
    _root: unknown,
    arguments_: SkillQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const skill = await this.skillService.getSkill(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.id,
    );

    return GraphqlSkillPresenter.presentSkill(skill);
  };
}
