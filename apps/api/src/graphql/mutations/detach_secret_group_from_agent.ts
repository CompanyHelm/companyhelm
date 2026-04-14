import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSecretPresenter, type GraphqlSecretGroupRecord } from "../secret_presenter.ts";
import { Mutation } from "./mutation.ts";

type DetachSecretGroupFromAgentMutationArguments = {
  input: {
    agentId: string;
    secretGroupId: string;
  };
};

/**
 * Removes one attached secret group from an agent while leaving any direct secret selections in
 * place.
 */
@injectable()
export class DetachSecretGroupFromAgentMutation extends Mutation<
  DetachSecretGroupFromAgentMutationArguments,
  GraphqlSecretGroupRecord
> {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    super();
    this.secretService = secretService;
  }

  protected resolve = async (
    arguments_: DetachSecretGroupFromAgentMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSecretGroupRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const group = await this.secretService.detachSecretGroupFromAgent(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.agentId,
      arguments_.input.secretGroupId,
    );

    return GraphqlSecretPresenter.presentSecretGroup(group);
  };
}
