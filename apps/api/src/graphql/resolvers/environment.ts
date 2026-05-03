import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { AgentEnvironmentDetailService } from "../../services/environments/detail_service.ts";

type EnvironmentQueryArguments = {
  id: string;
};

type GraphqlEnvironmentRecord = {
  agentId: string;
  agentName: string | null;
  cpuCount: number;
  cpuUsedPct: number | null;
  createdAt: string;
  diskSpaceGb: number;
  diskUsedBytes: number | null;
  displayName: string | null;
  id: string;
  lastSeenAt: string | null;
  memoryGb: number;
  memUsedBytes: number | null;
  metricsSampledAt: string | null;
  platform: "linux" | "macos" | "windows";
  provider: "e2b";
  providerDefinitionId: string | null;
  providerDefinitionName: string | null;
  providerEnvironmentId: string;
  statusErrorMessage: string | null;
  status: string;
  templateId: string;
  updatedAt: string;
};

/**
 * Resolves one company-scoped environment for the environment detail page.
 */
@injectable()
export class EnvironmentQueryResolver {
  private readonly detailService: AgentEnvironmentDetailService;

  constructor(@inject(AgentEnvironmentDetailService) detailService: AgentEnvironmentDetailService) {
    this.detailService = detailService;
  }

  execute = async (
    _root: unknown,
    arguments_: EnvironmentQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlEnvironmentRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const environment = await this.detailService.getEnvironment(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.id,
    );

    return {
      agentId: environment.agentId,
      agentName: environment.agentName,
      cpuCount: environment.cpuCount,
      cpuUsedPct: environment.cpuUsedPct,
      createdAt: environment.createdAt.toISOString(),
      diskSpaceGb: environment.diskSpaceGb,
      diskUsedBytes: environment.diskUsedBytes,
      displayName: environment.displayName,
      id: environment.id,
      lastSeenAt: environment.lastSeenAt?.toISOString() ?? null,
      memoryGb: environment.memoryGb,
      memUsedBytes: environment.memUsedBytes,
      metricsSampledAt: environment.metricsSampledAt?.toISOString() ?? null,
      platform: environment.platform,
      provider: environment.provider,
      providerDefinitionId: environment.providerDefinitionId,
      providerDefinitionName: environment.providerDefinitionName,
      providerEnvironmentId: environment.providerEnvironmentId,
      statusErrorMessage: environment.statusErrorMessage,
      status: environment.status,
      templateId: environment.templateId,
      updatedAt: environment.updatedAt.toISOString(),
    };
  };
}
