import "reflect-metadata";
import { pathToFileURL } from "node:url";
import pino, { type Logger as PinoLogger } from "pino";
import { ApiContainer } from "./api_container.ts";
import { ApiCli } from "./cli/api_cli.ts";
import { ConfigLoader } from "./config/config_loader.ts";
import { Config, ConfigDocument } from "./config/schema.ts";
import { DbBootstrap } from "./db/bootstrap/bootstrap.ts";
import { ApiLogger } from "./log/api_logger.ts";
import { CompanyHelmLlmProviderService } from "./services/ai_providers/companyhelm_service.ts";
import { ModelService } from "./services/ai_providers/model_service.ts";
import { ApiServer } from "./server/api_server.ts";

export type StartedApiProcess = {
  config: Config;
  server: ApiServer;
};

export type ShutdownSignal = "SIGINT" | "SIGTERM";

export async function startApiProcess(argv: string[] = process.argv): Promise<StartedApiProcess> {
  const argumentsDocument = new ApiCli().parse(argv);
  const config = new Config(ConfigLoader.load(argumentsDocument.configPath, ConfigDocument));
  const container = new ApiContainer().build(config);
  await container.get(CompanyHelmLlmProviderService).refreshAvailableSeedModels(
    container.get(ModelService),
    container.get(ApiLogger).child({
      component: "companyhelm_managed_model_catalog",
    }),
  );
  await container.get(DbBootstrap).run();
  const server = container.get(ApiServer);
  await server.start();
  return {
    config,
    server,
  };
}

export function registerShutdownHandlers(
  server: Pick<ApiServer, "stop">,
  logger: Pick<PinoLogger, "error" | "info">,
): void {
  let shutdownPromise: Promise<void> | null = null;
  const shutdown = (signal: ShutdownSignal) => {
    logger.info({
      signal,
    }, "shutdown signal received");

    shutdownPromise ??= server.stop().then(() => {
      logger.info({
        signal,
      }, "shutdown completed");
    }).catch((error) => {
      logger.error({
        error,
        signal,
      }, "shutdown failed");
      process.exitCode = 1;
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

export async function runMain(argv: string[] = process.argv): Promise<void> {
  try {
    const startedApiProcess = await startApiProcess(argv);
    registerShutdownHandlers(
      startedApiProcess.server,
      pino(ApiLogger.createOptions(startedApiProcess.config)),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start API.";
    pino(ApiLogger.createOptions({
      log: {
        level: "error",
        json: true,
      },
    } as Pick<Config, "log">)).error({
      error,
    }, message);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runMain(process.argv);
}
