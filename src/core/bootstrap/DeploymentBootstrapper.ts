import fs from "node:fs";
import path from "node:path";

import type { LogLevel } from "../../commands/dependencies.js";
import type { RuntimeState } from "../runtime/RuntimeState.js";
import { RuntimePaths } from "../runtime/RuntimePaths.js";
import { SeedSqlRenderer } from "./SeedSqlRenderer.js";

export class DeploymentBootstrapper {
  private readonly renderer = new SeedSqlRenderer();

  public writeSeedSql(root: string, state: RuntimeState, passwordHash: string, passwordSalt: string): string {
    const runtimePaths = new RuntimePaths(root);
    const outputPath = runtimePaths.seedFilePath();
    const sql = this.renderer.render({
      companyId: state.company.id,
      companyName: state.company.name,
      username: state.auth.username,
      passwordHash,
      passwordSalt,
      runnerName: state.runner.name,
      runnerSecret: state.runner.secret
    });

    fs.writeFileSync(outputPath, sql, "utf8");
    return outputPath;
  }

  public writeApiConfig(root: string, state: RuntimeState, logLevel: LogLevel = "info"): string {
    const runtimePaths = new RuntimePaths(root);
    const outputPath = runtimePaths.apiConfigPath();
    const yaml = [
      "app:",
      '  host: "0.0.0.0"',
      '  port: 4000',
      '  graphqlEndpoint: "/graphql"',
      "  graphiql: true",
      "  grpc:",
      '    host: "0.0.0.0"',
      "    port: 50051",
      "    heartbeat:",
      "      intervalMs: 20000",
      "      jitterMs: 10000",
      "agent:",
      "  grpc:",
      '    host: "0.0.0.0"',
      "    port: 50052",
      "database:",
      '  name: "companyhelm"',
      '  host: "postgres"',
      "  port: 5432",
      "  roles:",
      "    app_runtime:",
      '      username: "app-runtime"',
      '      password: "companyhelm-local-app-runtime-role-password"',
      "    admin:",
      '      username: "postgres"',
      '      password: "postgres"',
      "github:",
      '  app_client_id: "${GITHUB_APP_CLIENT_ID}"',
      '  app_private_key_pem: "${GITHUB_APP_PRIVATE_KEY_PEM}"',
      '  app_link: "${GITHUB_APP_URL}"',
      'authProvider: "companyhelm"',
      "auth:",
      "  companyhelm:",
      "    jwt_private_key_pem: |-",
      this.indentBlock(state.auth.jwtPrivateKeyPem, 6),
      "    jwt_public_key_pem: |-",
      this.indentBlock(state.auth.jwtPublicKeyPem, 6),
      '    jwt_issuer: "companyhelm.local"',
      '    jwt_audience: "companyhelm-web"',
      "    jwt_expiration_seconds: 86400",
      "security:",
      "  encryption:",
      '    key: "companyhelm-local-encryption-key"',
      `log_level: "${logLevel}"`,
      "log_pretty: false",
      ""
    ].join("\n");

    fs.writeFileSync(outputPath, yaml, "utf8");
    return outputPath;
  }

  public writeFrontendConfig(root: string, state: RuntimeState): string {
    const runtimePaths = new RuntimePaths(root);
    const outputPath = runtimePaths.frontendConfigPath();
    const yaml = [
      "api:",
      `  graphqlApiUrl: "http://127.0.0.1:${state.ports.apiHttp}/graphql"`,
      `  runnerGrpcTarget: "localhost:${state.ports.runnerGrpc}"`,
      "auth:",
      '  provider: "companyhelm"',
      "  companyhelm:",
      '    tokenStorageKey: "companyhelm.auth.token"',
      ""
    ].join("\n");

    fs.writeFileSync(outputPath, yaml, "utf8");
    return outputPath;
  }

  private indentBlock(value: string, spaces: number): string {
    const prefix = " ".repeat(spaces);
    return value
      .trimEnd()
      .split("\n")
      .map((line) => `${prefix}${line}`)
      .join("\n");
  }
}
