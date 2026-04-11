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
      commitSha: string;
      description?: string | null;
      fileList: string[];
      instructions: string;
      name: string;
      repository: string;
      skillDirectory: string;
    }>;
  };
};

/**
 * Persists the selected GitHub discovery results into the company skill catalog without issuing a
 * second repository download during submit.
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
