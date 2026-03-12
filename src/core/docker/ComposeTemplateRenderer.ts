import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ImageCatalog } from "../runtime/ImageCatalog.js";

export interface ComposePorts {
  uiPort: number;
  runnerGrpcPort: number;
  agentCliGrpcPort: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ComposeTemplateRenderer {
  public render(ports: ComposePorts): string {
    const templatePath = path.resolve(__dirname, "../../templates/docker-compose.yaml.tpl");
    const template = fs.readFileSync(templatePath, "utf8");
    const images = new ImageCatalog().resolve();

    return template
      .replaceAll("{{API_IMAGE}}", images.api)
      .replaceAll("{{FRONTEND_IMAGE}}", images.frontend)
      .replaceAll("{{POSTGRES_IMAGE}}", images.postgres)
      .replaceAll("{{UI_PORT}}", String(ports.uiPort))
      .replaceAll("{{RUNNER_GRPC_PORT}}", String(ports.runnerGrpcPort))
      .replaceAll("{{AGENT_CLI_GRPC_PORT}}", String(ports.agentCliGrpcPort));
  }
}
