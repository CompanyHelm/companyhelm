import { inject, injectable } from "inversify";
import { ApiLogger } from "../log/api_logger.ts";
import { EnvironmentMetricsCollectionService } from "../services/environments/metrics/collection_service.ts";
import { WorkerBase } from "./worker_base.ts";

/**
 * Polls environment metrics once per minute so CompanyHelm keeps a rolling one-hour history for
 * trend charts while also refreshing the latest usage snapshot on each environment row.
 */
@injectable()
export class EnvironmentMetricsWorker extends WorkerBase {
  private static readonly INTERVAL_SECONDS = 60;

  private readonly collectionService: EnvironmentMetricsCollectionService;

  constructor(
    @inject(ApiLogger) logger: ApiLogger,
    @inject(EnvironmentMetricsCollectionService)
    collectionService: EnvironmentMetricsCollectionService,
  ) {
    super("environment_metrics", EnvironmentMetricsWorker.INTERVAL_SECONDS, logger);
    this.collectionService = collectionService;
  }

  protected async run(): Promise<void> {
    const result = await this.collectionService.collectAllEnvironments();
    this.getLogger().info(result, "environment metrics collection pass completed");
  }
}
