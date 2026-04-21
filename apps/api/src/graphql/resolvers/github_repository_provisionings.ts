import { inject, injectable } from "inversify";
import { GithubRepositoryProvisioningPresenter, type GraphqlGithubRepositoryProvisioningRecord } from "../github_repository_provisioning_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";
import { GithubRepositoryProvisioningService } from "../../services/repositories/provisioning_service.ts";

/**
 * Lists the GitHub repositories pinned for automatic checkout in every company environment.
 */
@injectable()
export class GithubRepositoryProvisioningsQueryResolver extends Resolver<GraphqlGithubRepositoryProvisioningRecord[]> {
  private readonly provisioningService: GithubRepositoryProvisioningService;

  constructor(
    @inject(GithubRepositoryProvisioningService)
    provisioningService: GithubRepositoryProvisioningService = new GithubRepositoryProvisioningService(),
  ) {
    super();
    this.provisioningService = provisioningService;
  }

  protected resolve = async (
    context: GraphqlRequestContext,
  ): Promise<GraphqlGithubRepositoryProvisioningRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const provisionings = await this.provisioningService.listProvisionings(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
    );

    return provisionings.map((provisioning) =>
      GithubRepositoryProvisioningPresenter.presentProvisioning(provisioning)
    );
  };
}
