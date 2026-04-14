import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSecretPresenter, type GraphqlSecretGroupRecord } from "../secret_presenter.ts";
import { Resolver } from "./resolver.ts";

/**
 * Lists the company secret groups so the web UI can render the secret catalog as grouped folders
 * without exposing any plaintext secret values.
 */
@injectable()
export class SecretGroupsQueryResolver extends Resolver<GraphqlSecretGroupRecord[]> {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    super();
    this.secretService = secretService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlSecretGroupRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const groups = await this.secretService.listSecretGroups(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
    );

    return groups.map((group) => GraphqlSecretPresenter.presentSecretGroup(group));
  };
}
