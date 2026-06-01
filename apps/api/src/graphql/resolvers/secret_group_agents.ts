import { inject, injectable } from "inversify";
import { SecretService, type SecretGroupAgentRecord } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type SecretGroupAgentsQueryArguments = {
  secretGroupId: string;
};

/**
 * Lists agents that directly inherit a secret group. Group detail pages use this inverse lookup to
 * manage the default group attachment from the group side instead of visiting each agent.
 */
@injectable()
export class SecretGroupAgentsQueryResolver {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    this.secretService = secretService;
  }

  execute = async (
    _root: unknown,
    arguments_: SecretGroupAgentsQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<SecretGroupAgentRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return this.secretService.listSecretGroupAgents(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        secretGroupId: arguments_.secretGroupId,
      },
    );
  };
}
