import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSecretPresenter, type GraphqlSecretGroupRecord } from "../secret_presenter.ts";
import { Mutation } from "./mutation.ts";

type CreateSecretGroupMutationArguments = {
  input: {
    name: string;
  };
};

/**
 * Creates one reusable secret group for the authenticated company so manual and imported secrets
 * can share the same folder-like organization model.
 */
@injectable()
export class CreateSecretGroupMutation extends Mutation<
  CreateSecretGroupMutationArguments,
  GraphqlSecretGroupRecord
> {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    super();
    this.secretService = secretService;
  }

  protected resolve = async (
    arguments_: CreateSecretGroupMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSecretGroupRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const group = await this.secretService.createSecretGroup(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      name: arguments_.input.name,
    });

    return GraphqlSecretPresenter.presentSecretGroup(group);
  };
}
