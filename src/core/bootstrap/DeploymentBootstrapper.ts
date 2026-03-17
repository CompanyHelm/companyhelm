import fs from "node:fs";
import path from "node:path";

import type { LogLevel } from "../../commands/dependencies.js";
import type { GithubAppConfig } from "../config/GithubAppConfig.js";
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

  public writeApiConfig(
    root: string,
    state: RuntimeState,
    logLevel: LogLevel = "info",
    options: {
      databaseHost?: string;
      appPort?: number;
      runnerGrpcPort?: number;
      agentGrpcPort?: number;
      githubAppConfig?: GithubAppConfig | null;
    } = {}
  ): string {
    const runtimePaths = new RuntimePaths(root);
    const outputPath = runtimePaths.apiConfigPath();
    const appPort = options.appPort ?? state.ports.apiHttp;
    const runnerGrpcPort = options.runnerGrpcPort ?? state.ports.runnerGrpc;
    const agentGrpcPort = options.agentGrpcPort ?? state.ports.agentCliGrpc;
    const databaseHost = options.databaseHost ?? "postgres";
    const githubConfigLines = options.githubAppConfig
      ? [
          '  app_client_id: "${GITHUB_APP_CLIENT_ID}"',
          '  app_private_key_pem: "${GITHUB_APP_PRIVATE_KEY_PEM}"',
          '  app_link: "${GITHUB_APP_URL}"'
        ]
      : [
          '  app_client_id: "companyhelm-local-github-disabled"',
          '  app_private_key_pem: "companyhelm-local-github-disabled"',
          '  app_link: "https://github.com/apps/companyhelm-local-disabled"'
        ];
    const yaml = [
      "app:",
      '  host: "0.0.0.0"',
      `  port: ${appPort}`,
      '  graphqlEndpoint: "/graphql"',
      "  graphiql: true",
      "  grpc:",
      '    host: "0.0.0.0"',
      `    port: ${runnerGrpcPort}`,
      "    heartbeat:",
      "      intervalMs: 20000",
      "      jitterMs: 10000",
      "  workers:",
      "    agentHeartbeats:",
      "      intervalSeconds: 60",
      "      jitterSeconds: 60",
      "      batchSize: 10",
      "      leaseSeconds: 120",
      "    taskWorker:",
      "      intervalSeconds: 60",
      "      jitterSeconds: 60",
      "      batchSize: 10",
      "      leaseSeconds: 120",
      "agent:",
      "  grpc:",
      '    host: "0.0.0.0"',
      `    port: ${agentGrpcPort}`,
      "database:",
      '  name: "companyhelm"',
      `  host: "${databaseHost}"`,
      "  port: 5432",
      "  roles:",
      "    app_runtime:",
      '      username: "app-runtime"',
      '      password: "companyhelm-local-app-runtime-role-password"',
      "    admin:",
      '      username: "postgres"',
      '      password: "postgres"',
      "github:",
      ...githubConfigLines,
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
