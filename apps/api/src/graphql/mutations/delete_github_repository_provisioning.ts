import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GithubRepositoryProvisioningService } from "../../services/repositories/provisioning_service.ts";
import { Mutation } from "./mutation.ts";

type DeleteGithubRepositoryProvisioningMutationArguments = {
  input: {
    id: string;
  };
};

type GraphqlDeleteGithubRepositoryProvisioningPayload = {
  deletedProvisioningId: string;
};

/**
 * Unpins one workspace repository provisioning without touching any already cloned environment
 * checkouts, so existing agent workspaces keep their files until users delete environments.
 */
@injectable()
export class DeleteGithubRepositoryProvisioningMutation extends Mutation<
  DeleteGithubRepositoryProvisioningMutationArguments,
  GraphqlDeleteGithubRepositoryProvisioningPayload
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
    arguments_: DeleteGithubRepositoryProvisioningMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlDeleteGithubRepositoryProvisioningPayload> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const deletedProvisioningId = await this.provisioningService.deleteProvisioning(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        provisioningId: arguments_.input.id,
      },
    );

    return {
      deletedProvisioningId,
    };
  };
}
