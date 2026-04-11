import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillGithubCatalog } from "../../services/skills/github/catalog.ts";

type GithubSkillBranchesQueryArguments = {
  repositoryUrl: string;
};

type GraphqlGithubSkillBranchRecord = {
  commitSha: string;
  isDefault: boolean;
  name: string;
  repository: string;
};

/**
 * Lists public GitHub branches for one repository so the import flow can let the user pick which
 * branch to inspect before the app discovers any skill packages.
 */
@injectable()
export class GithubSkillBranchesQueryResolver {
  private readonly skillGithubCatalog: SkillGithubCatalog;

  constructor(@inject(SkillGithubCatalog) skillGithubCatalog: SkillGithubCatalog) {
    this.skillGithubCatalog = skillGithubCatalog;
  }

  execute = async (
    _root: unknown,
    arguments_: GithubSkillBranchesQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlGithubSkillBranchRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }

    return this.skillGithubCatalog.discoverBranches(arguments_.repositoryUrl);
  };
}
