import { inject, injectable } from "inversify";
import { GraphqlSkillPresenter, type GraphqlSkillRecord } from "../skill_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GithubSkillService } from "../../services/skills/github_service.ts";
import { Mutation } from "./mutation.ts";

type ImportGithubSkillMutationArguments = {
  input: {
    repositoryId: string;
    skillDirectory: string;
    skillGroupId?: string | null;
  };
};

/**
 * Imports a skill from a linked GitHub repository by reading the selected `SKILL.md` package and
 * persisting the resulting skill metadata into the company catalog.
 */
@injectable()
export class ImportGithubSkillMutation extends Mutation<
  ImportGithubSkillMutationArguments,
  GraphqlSkillRecord
> {
  private readonly githubSkillService: GithubSkillService;

  constructor(@inject(GithubSkillService) githubSkillService: GithubSkillService) {
    super();
    this.githubSkillService = githubSkillService;
  }

  protected resolve = async (
    arguments_: ImportGithubSkillMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const skill = await this.githubSkillService.importSkill(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        repositoryId: arguments_.input.repositoryId,
        skillDirectory: arguments_.input.skillDirectory,
        skillGroupId: arguments_.input.skillGroupId,
      },
    );

    return GraphqlSkillPresenter.presentSkill(skill);
  };
}
