import { inject, injectable } from "inversify";
import { GraphqlSkillPresenter, type GraphqlSkillGroupRecord } from "../skill_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillService } from "../../services/skills/service.ts";
import { Resolver } from "./resolver.ts";

/**
 * Lists the company skill groups so the web UI can render the catalog as expandable directories.
 */
@injectable()
export class SkillGroupsQueryResolver extends Resolver<GraphqlSkillGroupRecord[]> {
  private readonly skillService: SkillService;

  constructor(@inject(SkillService) skillService: SkillService) {
    super();
    this.skillService = skillService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlSkillGroupRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const groups = await this.skillService.listSkillGroups(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
    );

    return groups.map((group) => GraphqlSkillPresenter.presentSkillGroup(group));
  };
}
