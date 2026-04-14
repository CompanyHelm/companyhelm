import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSecretPresenter, type GraphqlSecretGroupRecord } from "../secret_presenter.ts";

type AgentSecretGroupsQueryArguments = {
  agentId: string;
};

/**
 * Lists the secret groups explicitly attached to one agent so grouped defaults can be managed
 * separately from direct individual secret attachments.
 */
@injectable()
export class AgentSecretGroupsQueryResolver {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    this.secretService = secretService;
  }

  execute = async (
    _root: unknown,
    arguments_: AgentSecretGroupsQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSecretGroupRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const groups = await this.secretService.listAgentSecretGroups(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.agentId,
    );

    return groups.map((group) => GraphqlSecretPresenter.presentSecretGroup(group));
  };
}
