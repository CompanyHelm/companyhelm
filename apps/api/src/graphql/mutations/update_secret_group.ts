import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSecretPresenter, type GraphqlSecretGroupRecord } from "../secret_presenter.ts";
import { Mutation } from "./mutation.ts";

type UpdateSecretGroupMutationArguments = {
  input: {
    id: string;
    name?: string | null;
  };
};

/**
 * Renames one existing secret group without disturbing the secrets already assigned to it.
 */
@injectable()
export class UpdateSecretGroupMutation extends Mutation<
  UpdateSecretGroupMutationArguments,
  GraphqlSecretGroupRecord
> {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    super();
    this.secretService = secretService;
  }

  protected resolve = async (
    arguments_: UpdateSecretGroupMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSecretGroupRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const group = await this.secretService.updateSecretGroup(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      name: arguments_.input.name,
      secretGroupId: arguments_.input.id,
    });

    return GraphqlSecretPresenter.presentSecretGroup(group);
  };
}
