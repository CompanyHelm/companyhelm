import { inject, injectable } from "inversify";
import { SecretService } from "../../services/secrets/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlSecretPresenter, type GraphqlSecretGroupRecord } from "../secret_presenter.ts";
import { Mutation } from "./mutation.ts";

type AttachSecretGroupToAgentMutationArguments = {
  input: {
    agentId: string;
    secretGroupId: string;
  };
};

/**
 * Attaches one secret group to an agent so grouped secret defaults can be managed separately from
 * individually attached secrets.
 */
@injectable()
export class AttachSecretGroupToAgentMutation extends Mutation<
  AttachSecretGroupToAgentMutationArguments,
  GraphqlSecretGroupRecord
> {
  private readonly secretService: SecretService;

  constructor(@inject(SecretService) secretService: SecretService) {
    super();
    this.secretService = secretService;
  }

  protected resolve = async (
    arguments_: AttachSecretGroupToAgentMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlSecretGroupRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const group = await this.secretService.attachSecretGroupToAgent(context.app_runtime_transaction_provider, {
      agentId: arguments_.input.agentId,
      companyId: context.authSession.company.id,
      secretGroupId: arguments_.input.secretGroupId,
      userId: context.authSession.user.id,
    });

    return GraphqlSecretPresenter.presentSecretGroup(group);
  };
}
