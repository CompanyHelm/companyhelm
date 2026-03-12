import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ComposeTemplateRenderer {
  public render(ports: ComposePorts, paths: ComposePaths): string {
    const templatePath = path.resolve(__dirname, "../../templates/docker-compose.yaml.tpl");
    const template = fs.readFileSync(templatePath, "utf8");
    const images = new ImageCatalog().resolve();

    return template
      .replaceAll("{{API_IMAGE}}", images.api)
      .replaceAll("{{FRONTEND_IMAGE}}", images.frontend)
      .replaceAll("{{POSTGRES_IMAGE}}", images.postgres)
      .replaceAll("{{API_CONFIG_PATH}}", paths.apiConfigPath)
      .replaceAll("{{FRONTEND_CONFIG_PATH}}", paths.frontendConfigPath)
      .replaceAll("{{SEED_FILE_PATH}}", paths.seedFilePath)
      .replaceAll("{{API_HTTP_PORT}}", String(ports.apiHttpPort))
      .replaceAll("{{UI_PORT}}", String(ports.uiPort))
      .replaceAll("{{RUNNER_GRPC_PORT}}", String(ports.runnerGrpcPort))
      .replaceAll("{{AGENT_CLI_GRPC_PORT}}", String(ports.agentCliGrpcPort));
  }
}
