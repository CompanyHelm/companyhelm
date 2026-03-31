import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteSecretMutationArguments = {
  input: {
    id: string;
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
 * Deletes one company secret and cascades away any session attachments that referenced it.
 */
@injectable()
export class DeleteSecretMutation extends Mutation<DeleteSecretMutationArguments, GraphqlSecretRecord> {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    super();
    this.secretService = secretService;
  }

  protected resolve = async (
    arguments_: DeleteSecretMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSecretRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const secret = await this.secretService.deleteSecret(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.id,
    );

    return DeleteSecretMutation.serializeRecord(secret);
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
