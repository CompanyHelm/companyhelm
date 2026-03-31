import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type CreateSecretMutationArguments = {
  input: {
    description?: string | null;
    envVarName?: string | null;
    name: string;
    value: string;
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
      userId: context.authSession.user.id,
      value: arguments_.input.value,
    });

    return CreateSecretMutation.serializeRecord(secret);
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
