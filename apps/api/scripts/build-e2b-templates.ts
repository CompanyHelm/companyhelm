import pino from "pino";
import { ApiCli } from "../src/cli/api_cli.ts";
import { ConfigLoader } from "../src/config/config_loader.ts";
import { Config, ConfigDocument } from "../src/config/schema.ts";
import { E2bTemplatesManager } from "../src/compute/e2b/templates_manager.ts";
import { ApiLogger } from "../src/log/api_logger.ts";

/**
 * Builds the CompanyHelm-managed E2B templates using the credentials from the selected config
 * document so local and CI runs target the same E2B account.
 */
export class BuildE2bTemplatesScript {
  async run(argv: string[]): Promise<void> {
    const argumentsDocument = new ApiCli().parse(argv);
    const config = new Config(ConfigLoader.load(argumentsDocument.configPath, ConfigDocument));
    const templates = new E2bTemplatesManager();

    for (const template of templates.builds()) {
      await template.build(config.companyhelm.e2b.api_key);
    }
  }
}

try {
  await new BuildE2bTemplatesScript().run(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : "Failed to build E2B templates.";
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
