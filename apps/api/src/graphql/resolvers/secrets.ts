import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

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
 * Lists company secrets without exposing plaintext values. The UI uses this to render the reusable
 * secret catalog and to pick secrets that can be attached to sessions.
 */
@injectable()
export class SecretsQueryResolver extends Resolver<GraphqlSecretRecord[]> {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    super();
    this.secretService = secretService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlSecretRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const secrets = await this.secretService.listSecrets(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
    );

    return secrets.map((secret) => SecretsQueryResolver.serializeRecord(secret));
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
