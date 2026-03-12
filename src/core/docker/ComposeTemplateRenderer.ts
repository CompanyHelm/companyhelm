import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { LogLevel } from "../../commands/dependencies.js";
import { ImageCatalog } from "../runtime/ImageCatalog.js";

export interface ComposePorts {
  apiHttpPort: number;
  uiPort: number;
  runnerGrpcPort: number;
  agentCliGrpcPort: number;
}

export interface ComposePaths {
  apiConfigPath: string;
  frontendConfigPath: string;
  seedFilePath: string;
}

export interface ComposeRenderOptions {
  frontendLogLevel?: LogLevel;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ComposeTemplateRenderer {
  public render(ports: ComposePorts, paths: ComposePaths, options: ComposeRenderOptions = {}): string {
    const templatePath = path.resolve(__dirname, "../../templates/docker-compose.yaml.tpl");
    const template = fs.readFileSync(templatePath, "utf8");
    const images = new ImageCatalog().resolve();
    const frontendLogLevel = options.frontendLogLevel ?? "info";
    const frontendBlock = [
      "  frontend:",
      `    image: ${images.frontend}`,
      "    depends_on:",
      "      - api",
      "    environment:",
      "      COMPANYHELM_CONFIG_PATH: /run/companyhelm/config.yaml",
      `      COMPANYHELM_LOG_LEVEL: "${frontendLogLevel}"`,
      `      PORT: "${ports.uiPort}"`,
      `      npm_config_loglevel: "${frontendLogLevel}"`,
      "    ports:",
      `      - "${ports.uiPort}:${ports.uiPort}"`,
      "    volumes:",
      `      - "${paths.frontendConfigPath}:/run/companyhelm/config.yaml:ro"`,
      "    networks:",
      "      - companyhelm"
    ].join("\n");

    return template
      .replaceAll("{{API_IMAGE}}", images.api)
      .replaceAll("{{POSTGRES_IMAGE}}", images.postgres)
      .replaceAll("{{API_CONFIG_PATH}}", paths.apiConfigPath)
      .replaceAll("{{SEED_FILE_PATH}}", paths.seedFilePath)
      .replaceAll("{{API_HTTP_PORT}}", String(ports.apiHttpPort))
      .replaceAll("{{UI_PORT}}", String(ports.uiPort))
      .replaceAll("{{RUNNER_GRPC_PORT}}", String(ports.runnerGrpcPort))
      .replaceAll("{{AGENT_CLI_GRPC_PORT}}", String(ports.agentCliGrpcPort))
      .replace("{{FRONTEND_SERVICE_BLOCK}}", frontendBlock);
  }
}
