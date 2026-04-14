import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSecretPresenter, type GraphqlSecretGroupRecord } from "../secret_presenter.ts";
import { Mutation } from "./mutation.ts";

type DeleteSecretGroupMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Deletes one secret group for the authenticated company. Secrets remain intact because the
 * foreign key is defined with `onDelete: set null`, so they fall back to the ungrouped bucket.
 */
@injectable()
export class DeleteSecretGroupMutation extends Mutation<
  DeleteSecretGroupMutationArguments,
  GraphqlSecretGroupRecord
> {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    super();
    this.secretService = secretService;
  }

  protected resolve = async (
    arguments_: DeleteSecretGroupMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSecretGroupRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const group = await this.secretService.deleteSecretGroup(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      secretGroupId: arguments_.input.id,
    });

    return GraphqlSecretPresenter.presentSecretGroup(group);
  };
}
