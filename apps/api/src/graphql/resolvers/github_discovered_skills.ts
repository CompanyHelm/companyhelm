import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillGithubCatalog } from "../../services/skills/github/catalog.ts";

type GithubDiscoveredSkillsQueryArguments = {
  branchName: string;
  repositoryUrl: string;
};

type GraphqlGithubDiscoveredSkillRecord = {
  branchName: string;
  commitSha: string;
  description: string | null;
  fileList: string[];
  instructions: string;
  name: string;
  repository: string;
  skillDirectory: string;
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
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }

    const discoveredSkills = await this.skillGithubCatalog.discoverSkills({
      branchName: arguments_.branchName,
      repository: arguments_.repositoryUrl,
    });

    return discoveredSkills
      .filter((skill) => skill.importable && skill.instructions)
      .map((skill) => ({
        branchName: skill.branchName,
        commitSha: skill.commitSha,
        description: skill.description,
        fileList: [...skill.fileList],
        instructions: skill.instructions ?? "",
        name: skill.name,
        repository: skill.repository,
        skillDirectory: skill.skillDirectory,
      }));
  };
}
