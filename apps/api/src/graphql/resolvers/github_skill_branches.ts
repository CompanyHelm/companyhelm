import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillGithubCatalog, type SkillGitSourceInput } from "../../services/skills/github/catalog.ts";

type GithubSkillBranchesQueryArguments = {
  source: SkillGitSourceInput;
};

type GraphqlGithubSkillBranchRecord = {
  commitSha: string;
  isDefault: boolean;
  name: string;
  repository: string;
};

/**
 * Lists branches for one Git skill source so the import flow can inspect a pinned branch before
 * discovering any skill packages.
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
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return this.skillGithubCatalog.discoverBranches(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      source: arguments_.source,
    });
  };
}
