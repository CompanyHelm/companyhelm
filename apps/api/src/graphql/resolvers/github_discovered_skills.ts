import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillGithubCatalog, type SkillGitSourceInput } from "../../services/skills/github/catalog.ts";

type GithubDiscoveredSkillsQueryArguments = {
  branchName: string;
  source: SkillGitSourceInput;
};

type GraphqlGithubDiscoveredSkillRecord = {
  name: string;
  skillDirectory: string;
  trackedFileCount: number;
};

/**
 * Lists the importable skill packages discovered on one GitHub branch so the web UI can present
 * exactly what will be created before submit.
 */
@injectable()
export class GithubDiscoveredSkillsQueryResolver {
  private readonly skillGithubCatalog: SkillGithubCatalog;

  constructor(@inject(SkillGithubCatalog) skillGithubCatalog: SkillGithubCatalog) {
    this.skillGithubCatalog = skillGithubCatalog;
  }

  execute = async (
    _root: unknown,
    arguments_: GithubDiscoveredSkillsQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlGithubDiscoveredSkillRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const discoveredSkills = await this.skillGithubCatalog.discoverSkills(context.app_runtime_transaction_provider, {
      branchName: arguments_.branchName,
      companyId: context.authSession.company.id,
      source: arguments_.source,
    });

    return discoveredSkills
      .filter((skill) => skill.importable)
      .map((skill) => ({
        name: skill.name,
        skillDirectory: skill.skillDirectory,
        trackedFileCount: skill.fileList.length,
      }));
  };
}
