import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdateSecretMutationArguments = {
  input: {
    envVarName?: string | null;
    id: string;
    name?: string | null;
    value?: string | null;
  };
};

type SecretRecord = {
  companyId: string;
  createdAt: Date;
  description: string | null;
  envVarName: string;
  id: string;
  name: string;
  updatedAt: Date;
};

type GraphqlSecretRecord = {
  companyId: string;
  createdAt: string;
  description: string | null;
  envVarName: string;
  id: string;
  name: string;
  updatedAt: string;
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
      secretId: arguments_.input.id,
      userId: context.authSession.user.id,
      value: arguments_.input.value,
    });

    return UpdateSecretMutation.serializeRecord(secret);
  };

  private static serializeRecord(secret: SecretRecord): GraphqlSecretRecord {
    return {
      companyId: secret.companyId,
      createdAt: secret.createdAt.toISOString(),
      description: secret.description,
      envVarName: secret.envVarName,
      id: secret.id,
      name: secret.name,
      updatedAt: secret.updatedAt.toISOString(),
    };
  }
}
