import { inject, injectable } from "inversify";
import { GraphqlSkillPresenter, type GraphqlSkillRecord } from "../skill_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillService } from "../../services/skills/service.ts";
import { Resolver } from "./resolver.ts";

/**
 * Lists the current company skill catalog for the skills index page.
 */
@injectable()
export class SkillsQueryResolver extends Resolver<GraphqlSkillRecord[]> {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    super();
    this.skillService = skillService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlSkillRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const skills = await this.skillService.listSkills(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
    );

    return skills.map((skill) => GraphqlSkillPresenter.presentSkill(skill));
  };
}
