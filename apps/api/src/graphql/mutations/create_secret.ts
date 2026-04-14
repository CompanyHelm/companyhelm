import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSecretPresenter, type GraphqlSecretRecord } from "../secret_presenter.ts";
import { Mutation } from "./mutation.ts";

type CreateSecretMutationArguments = {
  input: {
    description?: string | null;
    envVarName?: string | null;
    name: string;
    secretGroupId?: string | null;
    value: string;
  };
};

/**
 * Creates one encrypted company secret. The plaintext value is encrypted before persistence and is
 * never returned to the caller.
 */
@injectable()
export class CreateSecretMutation extends Mutation<CreateSecretMutationArguments, GraphqlSecretRecord> {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    super();
    this.secretService = secretService;
  }

  protected resolve = async (
    arguments_: CreateSecretMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSecretRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const secret = await this.secretService.createSecret(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      description: arguments_.input.description,
      envVarName: arguments_.input.envVarName,
      name: arguments_.input.name,
      secretGroupId: arguments_.input.secretGroupId,
      userId: context.authSession.user.id,
      value: arguments_.input.value,
    });

    return GraphqlSecretPresenter.presentSecret(secret);
  };
}
