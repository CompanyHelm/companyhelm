import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { GithubClient } from "../../github/client.ts";
import { Resolver } from "./resolver.ts";

type GraphqlGithubAppConfigRecord = {
  appClientId: string;
  appLink: string;
};

/**
 * Exposes the safe GitHub App metadata the authenticated web UI needs to launch installation setup.
 */
@injectable()
export class GithubAppConfigQueryResolver extends Resolver<GraphqlGithubAppConfigRecord> {
  private readonly githubClient: GithubClient;

  constructor(@inject(GithubClient) githubClient: GithubClient = new GithubClient({} as Config)) {
    super();
    this.githubClient = githubClient;
  }

  protected resolve = async (): Promise<GraphqlGithubAppConfigRecord> => {
    return {
      appClientId: this.githubClient.getAppClientId(),
      appLink: this.githubClient.getAppLink(),
    };
  };
}
