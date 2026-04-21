import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { GithubClient } from "../../github/client.ts";
import { GithubInstallationStateService } from "../../github/installation_state_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type CreateGithubInstallationUrlMutationArguments = {
  input: {
    organizationSlug: string;
    returnPath: string;
    sourceSessionId?: string | null;
  };
};

type GraphqlCreateGithubInstallationUrlPayload = {
  url: string;
};

/**
 * Mints a GitHub App installation URL with an encrypted callback state so the static setup URL can
 * safely restore the intended company and organization slug after GitHub redirects back.
 */
@injectable()
export class CreateGithubInstallationUrlMutation extends Mutation<
  CreateGithubInstallationUrlMutationArguments,
  GraphqlCreateGithubInstallationUrlPayload
> {
  private readonly githubClient: GithubClient;
  private readonly githubInstallationStateService: GithubInstallationStateService;

  constructor(
    @inject(GithubClient) githubClient: GithubClient = new GithubClient({} as Config),
    @inject(GithubInstallationStateService)
    githubInstallationStateService: GithubInstallationStateService =
      new GithubInstallationStateService({} as Config),
  ) {
    super();
    this.githubClient = githubClient;
    this.githubInstallationStateService = githubInstallationStateService;
  }

  protected resolve = async (
    arguments_: CreateGithubInstallationUrlMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlCreateGithubInstallationUrlPayload> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }

    const state = this.githubInstallationStateService.createState({
      companyId: context.authSession.company.id,
      organizationSlug: this.requireOrganizationSlug(arguments_.input.organizationSlug),
      returnPath: this.requireReturnPath(arguments_.input.returnPath),
      sourceSessionId: this.normalizeSourceSessionId(arguments_.input.sourceSessionId),
      userId: context.authSession.user.id,
    });

    return {
      url: this.githubClient.buildInstallationUrl(state),
    };
  };

  private requireOrganizationSlug(organizationSlug: string): string {
    const normalizedOrganizationSlug = String(organizationSlug || "").trim();
    if (!normalizedOrganizationSlug) {
      throw new Error("organizationSlug is required.");
    }

    return normalizedOrganizationSlug;
  }

  private requireReturnPath(returnPath: string): string {
    const normalizedReturnPath = String(returnPath || "").trim();
    if (!normalizedReturnPath) {
      throw new Error("returnPath is required.");
    }

    return normalizedReturnPath;
  }

  private normalizeSourceSessionId(sourceSessionId: string | null | undefined): string | null {
    const normalizedSourceSessionId = String(sourceSessionId || "").trim();
    return normalizedSourceSessionId || null;
  }
}
