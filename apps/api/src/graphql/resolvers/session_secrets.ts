import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import { SessionReadService } from "../../services/agent/session/read_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type SessionSecretsQueryArguments = {
  sessionId: string;
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
 * Lists the secrets attached to one chat session so the UI can manage which values are available
 * to command execution without ever retrieving plaintext secret data.
 */
@injectable()
export class SessionSecretsQueryResolver {
  private readonly secretService: SecretService;
  private readonly sessionReadService: SessionReadService;

  constructor(
    @inject(SecretService) secretService: SecretService,
    @inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService(),
  ) {
    this.secretService = secretService;
    this.sessionReadService = sessionReadService;
  }

  execute = async (
    _root: unknown,
    arguments_: SessionSecretsQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSecretRecord[]> => {
    if (!context.authSession?.company || !context.authSession.user || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const sessionRecord = await this.sessionReadService.getSession(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.sessionId,
      context.authSession.user.id,
    );
    if (!sessionRecord) {
      throw new Error("Session not found.");
    }

    const secrets = await this.secretService.listSessionSecrets(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.sessionId,
    );

    return secrets.map((secret) => SessionSecretsQueryResolver.serializeRecord(secret));
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
