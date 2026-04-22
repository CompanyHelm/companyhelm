import { inject, injectable } from "inversify";
import { ClerkOrganizationSlugResolver } from "../../auth/clerk/organization_slug_resolver.ts";
import { Config } from "../../config/schema.ts";
import { GithubClient } from "../../github/client.ts";
import { GithubInstallationStateService } from "../../github/installation_state_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type CreateGithubInstallationUrlMutationArguments = Record<string, never>;

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
  private readonly organizationSlugResolver: ClerkOrganizationSlugResolver;

  constructor(
    @inject(GithubClient) githubClient: GithubClient = new GithubClient({} as Config),
    @inject(GithubInstallationStateService)
    githubInstallationStateService: GithubInstallationStateService =
      new GithubInstallationStateService({} as Config),
    @inject(ClerkOrganizationSlugResolver)
    organizationSlugResolver: ClerkOrganizationSlugResolver =
      new ClerkOrganizationSlugResolver({} as Config),
  ) {
    super();
    this.githubClient = githubClient;
    this.githubInstallationStateService = githubInstallationStateService;
    this.organizationSlugResolver = organizationSlugResolver;
  }

  protected resolve = async (
    _arguments_: CreateGithubInstallationUrlMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlCreateGithubInstallationUrlPayload> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    const organizationSlug = await this.organizationSlugResolver.resolveForCompany(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
    );

    const state = this.githubInstallationStateService.createState({
      companyId: context.authSession.company.id,
      organizationSlug,
      returnPath: CreateGithubInstallationUrlMutation.createRepositoriesReturnPath(organizationSlug),
      sourceSessionId: null,
      userId: context.authSession.user.id,
    });

    return {
      url: this.githubClient.buildInstallationUrl(state),
    };
  };

  private static createRepositoriesReturnPath(organizationSlug: string): string {
    return `/orgs/${encodeURIComponent(organizationSlug)}/repositories`;
  }
}
