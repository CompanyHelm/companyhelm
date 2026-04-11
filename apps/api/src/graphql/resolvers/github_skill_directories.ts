import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { SkillGithubCatalog } from "../../services/skills/github/catalog.ts";

type GithubSkillDirectoriesQueryArguments = {
  repositoryUrl: string;
};

type GraphqlGithubSkillDirectoryRecord = {
  fileList: string[];
  name: string;
  path: string;
};

/**
 * Lists the importable skill directories discovered from a public GitHub repository URL by
 * scanning for `SKILL.md` roots in the selected repository tree.
 */
@injectable()
export class GithubSkillDirectoriesQueryResolver {
  private readonly skillGithubCatalog: SkillGithubCatalog;

  constructor(@inject(SkillGithubCatalog) skillGithubCatalog: SkillGithubCatalog) {
    this.skillGithubCatalog = skillGithubCatalog;
  }

  execute = async (
    _root: unknown,
    arguments_: GithubSkillDirectoriesQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlGithubSkillDirectoryRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }

    const directories = await this.skillGithubCatalog.discoverSkills(arguments_.repositoryUrl);

    return directories
      .filter((directory) => directory.importable)
      .map((directory) => ({
        fileList: [...directory.fileList],
        name: directory.name,
        path: directory.skillDirectory,
      }));
  };
}
