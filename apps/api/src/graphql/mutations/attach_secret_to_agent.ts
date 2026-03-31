import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type AttachSecretToAgentMutationArguments = {
  input: {
    agentId: string;
    secretId: string;
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
 * Attaches one reusable company secret to an agent as a default so future sessions start with the
 * same environment variable available without mutating any existing session attachments.
 */
@injectable()
export class AttachSecretToAgentMutation extends Mutation<
  AttachSecretToAgentMutationArguments,
  GraphqlSecretRecord
> {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    super();
    this.secretService = secretService;
  }

  protected resolve = async (
    arguments_: AttachSecretToAgentMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSecretRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const secret = await this.secretService.attachSecretToAgent(context.app_runtime_transaction_provider, {
      agentId: arguments_.input.agentId,
      companyId: context.authSession.company.id,
      secretId: arguments_.input.secretId,
      userId: context.authSession.user.id,
    });

    return AttachSecretToAgentMutation.serializeRecord(secret);
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
