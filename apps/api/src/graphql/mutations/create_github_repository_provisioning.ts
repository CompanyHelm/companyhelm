import { inject, injectable } from "inversify";
import { GithubRepositoryProvisioningPresenter, type GraphqlGithubRepositoryProvisioningRecord } from "../github_repository_provisioning_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GithubRepositoryProvisioningService } from "../../services/repositories/provisioning_service.ts";
import { Mutation } from "./mutation.ts";

type CreateGithubRepositoryProvisioningMutationArguments = {
  input: {
    githubRepositoryId: string;
  };
};

/**
 * Pins one cached GitHub repository so future agent environments clone it into the shared workspace.
 */
@injectable()
export class CreateGithubRepositoryProvisioningMutation extends Mutation<
  CreateGithubRepositoryProvisioningMutationArguments,
  GraphqlGithubRepositoryProvisioningRecord
> {
  private readonly provisioningService: GithubRepositoryProvisioningService;

  constructor(
    @inject(GithubRepositoryProvisioningService)
    provisioningService: GithubRepositoryProvisioningService = new GithubRepositoryProvisioningService(),
  ) {
    super();
    this.provisioningService = provisioningService;
  }

  protected resolve = async (
    arguments_: CreateGithubRepositoryProvisioningMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlGithubRepositoryProvisioningRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const provisioning = await this.provisioningService.createProvisioning(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        githubRepositoryId: arguments_.input.githubRepositoryId,
      },
    );

    return GithubRepositoryProvisioningPresenter.presentProvisioning(provisioning);
  };
}
