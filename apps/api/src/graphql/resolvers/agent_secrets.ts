import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type AgentSecretsQueryArguments = {
  agentId: string;
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
 * Lists the secret defaults configured on one agent so the web app can show the exact reusable
 * company secrets that will be copied into future sessions created from that agent.
 */
@injectable()
export class AgentSecretsQueryResolver {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    this.secretService = secretService;
  }

  execute = async (
    _root: unknown,
    arguments_: AgentSecretsQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSecretRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const secrets = await this.secretService.listAgentSecrets(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.agentId,
    );

    return secrets.map((secret) => AgentSecretsQueryResolver.serializeRecord(secret));
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
