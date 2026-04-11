import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import { SessionReadService } from "../../services/agent/session/read_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type AttachSecretToSessionMutationArguments = {
  input: {
    secretId: string;
    sessionId: string;
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
 * Attaches one reusable company secret to a chat session so future command execution can inject it
 * as an environment variable without persisting plaintext into the session itself.
 */
@injectable()
export class AttachSecretToSessionMutation extends Mutation<
  AttachSecretToSessionMutationArguments,
  GraphqlSecretRecord
> {
  private readonly secretService: SecretService;
  private readonly sessionReadService: SessionReadService;

  constructor(
    @inject(SecretService) secretService: SecretService,
    @inject(SessionReadService) sessionReadService: SessionReadService = new SessionReadService(),
  ) {
    super();
    this.secretService = secretService;
    this.sessionReadService = sessionReadService;
  }

  protected resolve = async (
    arguments_: AttachSecretToSessionMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSecretRecord> => {
    if (!context.authSession?.company || !context.authSession.user || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const sessionRecord = await this.sessionReadService.getSession(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.sessionId,
      context.authSession.user.id,
    );
    if (!sessionRecord) {
      throw new Error("Session not found.");
    }

    const secret = await this.secretService.attachSecretToSession(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      secretId: arguments_.input.secretId,
      sessionId: arguments_.input.sessionId,
      userId: context.authSession.user.id,
    });

    return AttachSecretToSessionMutation.serializeRecord(secret);
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
