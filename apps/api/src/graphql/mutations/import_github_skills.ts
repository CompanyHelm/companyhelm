import { inject, injectable } from "inversify";
import { GraphqlSkillPresenter, type GraphqlSkillRecord } from "../skill_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillGithubCatalog } from "../../services/skills/github/catalog.ts";
import { Mutation } from "./mutation.ts";

type ImportGithubSkillsMutationArguments = {
  input: {
    skillGroupId?: string | null;
    skills: Array<{
      branchName: string;
      repository: string;
      skillDirectory: string;
    }>;
  };
};

/**
 * Persists the selected GitHub skills into the company catalog after reloading their canonical
 * repository contents on the server. This keeps the mutation payload small enough to avoid large
 * GraphQL request bodies when skill instructions are long.
 */
@injectable()
export class ImportGithubSkillsMutation extends Mutation<
  ImportGithubSkillsMutationArguments,
  GraphqlSkillRecord[]
> {
  private readonly skillGithubCatalog: SkillGithubCatalog;

  constructor(@inject(SkillGithubCatalog) skillGithubCatalog: SkillGithubCatalog) {
    super();
    this.skillGithubCatalog = skillGithubCatalog;
  }

  protected resolve = async (
    arguments_: ImportGithubSkillsMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSkillRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const skills = await this.skillGithubCatalog.importSkills(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        skillGroupId: arguments_.input.skillGroupId,
        skills: arguments_.input.skills,
      },
    );

    return skills.map((skill) => GraphqlSkillPresenter.presentSkill(skill));
  };
}
