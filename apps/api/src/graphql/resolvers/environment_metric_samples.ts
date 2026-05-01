import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { AgentEnvironmentDetailService } from "../../services/environments/detail_service.ts";

type EnvironmentMetricSamplesQueryArguments = {
  endTime: string;
  environmentId: string;
  startTime: string;
};

type GraphqlEnvironmentMetricSampleRecord = {
  cpuUsedPct: number | null;
  diskUsedBytes: number | null;
  memUsedBytes: number | null;
  sampledAt: string;
};

/**
 * Resolves the minute-bucketed metric history for one environment inside a requested time window.
 */
@injectable()
export class EnvironmentMetricSamplesQueryResolver {
  private readonly detailService: AgentEnvironmentDetailService;

  constructor(@inject(AgentEnvironmentDetailService) detailService: AgentEnvironmentDetailService) {
    this.detailService = detailService;
  }

  execute = async (
    _root: unknown,
    arguments_: EnvironmentMetricSamplesQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlEnvironmentMetricSampleRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const startTime = new Date(arguments_.startTime);
    const endTime = new Date(arguments_.endTime);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      throw new Error("Invalid metrics time range.");
    }

    const samples = await this.detailService.listMetricSamples(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.environmentId,
      startTime,
      endTime,
    );

    return samples.map((sample) => ({
      cpuUsedPct: sample.cpuUsedPct,
      diskUsedBytes: sample.diskUsedBytes,
      memUsedBytes: sample.memUsedBytes,
      sampledAt: sample.sampledAt.toISOString(),
    }));
  };
}
