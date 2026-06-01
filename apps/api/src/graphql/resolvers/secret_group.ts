import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSecretPresenter, type GraphqlSecretGroupRecord } from "../secret_presenter.ts";

type SecretGroupQueryArguments = {
  id: string;
};

/**
 * Loads one secret group by id so group detail screens can deep-link into the catalog organizer
 * without relying on the broader list query having already populated Relay state.
 */
@injectable()
export class SecretGroupQueryResolver {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    this.secretService = secretService;
  }

  execute = async (
    _root: unknown,
    arguments_: SecretGroupQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSecretGroupRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const group = await this.secretService.getSecretGroup(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        secretGroupId: arguments_.id,
      },
    );

    return GraphqlSecretPresenter.presentSecretGroup(group);
  };
}
