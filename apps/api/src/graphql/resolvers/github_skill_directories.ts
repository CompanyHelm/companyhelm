import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GithubSkillService } from "../../services/skills/github_service.ts";

type GithubSkillDirectoriesQueryArguments = {
  repositoryId: string;
};

type GraphqlGithubSkillDirectoryRecord = {
  fileList: string[];
  name: string;
  path: string;
};

/**
 * Lists the skill directories discovered from a linked GitHub repository by scanning for
 * `SKILL.md` roots in the selected repository tree.
 */
@injectable()
export class GithubSkillDirectoriesQueryResolver {
  private readonly githubSkillService: GithubSkillService;

  constructor(@inject(GithubSkillService) githubSkillService: GithubSkillService) {
    this.githubSkillService = githubSkillService;
  }

  execute = async (
    _root: unknown,
    arguments_: GithubSkillDirectoriesQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlGithubSkillDirectoryRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const directories = await this.githubSkillService.listSkillDirectories(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        repositoryId: arguments_.repositoryId,
      },
    );

    return directories.map((directory) => ({
      fileList: [...directory.fileList],
      name: directory.name,
      path: directory.path,
    }));
  };
}
