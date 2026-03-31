import { inject, injectable } from "inversify";
import { AgentEnvironmentRequirementsService } from "../../services/agent/environment/requirements_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdateAgentEnvironmentRequirementsMutationArguments = {
  input: {
    agentId: string;
    minCpuCount: number;
    minDiskSpaceGb: number;
    minMemoryGb: number;
  };
};

type GraphqlAgentEnvironmentRequirements = {
  minCpuCount: number;
  minDiskSpaceGb: number;
  minMemoryGb: number;
};

/**
 * Persists one agent's minimum compute requirements so future environment provisioning requests can
 * size new environments from the agent configuration instead of falling back to global defaults.
 */
@injectable()
export class UpdateAgentEnvironmentRequirementsMutation extends Mutation<
  UpdateAgentEnvironmentRequirementsMutationArguments,
  GraphqlAgentEnvironmentRequirements
> {
  private readonly requirementsService: AgentEnvironmentRequirementsService;

  constructor(
    @inject(AgentEnvironmentRequirementsService)
    requirementsService: AgentEnvironmentRequirementsService,
  ) {
    super();
    this.requirementsService = requirementsService;
  }

  protected resolve = async (
    arguments_: UpdateAgentEnvironmentRequirementsMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlAgentEnvironmentRequirements> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.agentId.length === 0) {
      throw new Error("agentId is required.");
    }

    return this.requirementsService.updateRequirements(
      context.app_runtime_transaction_provider,
      {
        agentId: arguments_.input.agentId,
        companyId: context.authSession.company.id,
        minCpuCount: arguments_.input.minCpuCount,
        minDiskSpaceGb: arguments_.input.minDiskSpaceGb,
        minMemoryGb: arguments_.input.minMemoryGb,
      },
    );
  };
}
