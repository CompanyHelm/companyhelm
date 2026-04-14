import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSecretPresenter, type GraphqlSecretRecord } from "../secret_presenter.ts";
import { Mutation } from "./mutation.ts";

type UpdateSecretMutationArguments = {
  input: {
    envVarName?: string | null;
    id: string;
    name?: string | null;
    secretGroupId?: string | null;
    value?: string | null;
  };
};

/**
 * Updates one company secret without ever returning its plaintext value. Callers can rotate the
 * encrypted value or rename the secret independently.
 */
@injectable()
export class UpdateSecretMutation extends Mutation<UpdateSecretMutationArguments, GraphqlSecretRecord> {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    super();
    this.secretService = secretService;
  }

  protected resolve = async (
    arguments_: UpdateSecretMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSecretRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const secret = await this.secretService.updateSecret(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      envVarName: arguments_.input.envVarName,
      name: arguments_.input.name,
      secretGroupId: arguments_.input.secretGroupId,
      secretId: arguments_.input.id,
      userId: context.authSession.user.id,
      value: arguments_.input.value,
    });

    return GraphqlSecretPresenter.presentSecret(secret);
  };
}
