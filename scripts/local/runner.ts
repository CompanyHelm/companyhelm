import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";

export type LocalRunnerMode = "dev" | "e2b";

type LocalRunnerInput = {
  apiPublicUrl: string;
  mode: LocalRunnerMode;
  verifyReadiness?: boolean;
  webPublicUrl: string;
};

/**
 * Orchestrates the full local stack so developers do not need to remember separate Docker,
 * migration, seed, API, and web commands for the common development profiles.
 */
export class LocalRunner {
  private readonly childProcesses: ChildProcess[] = [];
  private readonly input: LocalRunnerInput;

  constructor(input: LocalRunnerInput) {
    this.input = input;
  }

  async run(): Promise<void> {
    this.registerShutdownHandlers();
    await this.ensureDockerServices();
    await this.runCommand("npm", this.resolveSeedCommandArguments());
    const workspaceScriptName = this.input.mode === "dev" ? "dev:local" : "dev:e2b";
    this.startPersistentCommand("npm", ["run", workspaceScriptName, "-w", "@companyhelm/api"], {
      COMPANYHELM_API_PUBLIC_URL: this.input.apiPublicUrl,
      COMPANYHELM_WEB_PUBLIC_URL: this.input.webPublicUrl,
    });
    this.startPersistentCommand("npm", ["run", workspaceScriptName, "-w", "@companyhelm/web"], {
      VITE_AUTH_PROVIDER: "dev",
      VITE_GRAPHQL_URL: `${this.input.apiPublicUrl}/graphql`,
      VITE_AMPLITUDE_ENABLED: "false",
      VITE_AMPLITUDE_ID: "",
    });
    if (this.input.verifyReadiness) {
      await this.verifyReadiness();
    }
    this.printReadyMessage();
  }

  private async ensureDockerServices(): Promise<void> {
    if (await this.areDataServicesReachable()) {
      return;
    }

    try {
      await this.runCommand("docker", ["compose", "up", "-d", "postgres", "redis", "pgadmin"]);
    } catch (error) {
      if (!await this.areDataServicesReachable()) {
        throw error;
      }
      console.warn("Docker Compose failed, but Postgres and Redis are already reachable; continuing.");
    }

    await this.waitForPort("127.0.0.1", 15432, "Postgres");
    await this.waitForPort("127.0.0.1", 16379, "Redis");
  }

  private async areDataServicesReachable(): Promise<boolean> {
    return await this.canConnect("127.0.0.1", 15432) && await this.canConnect("127.0.0.1", 16379);
  }

  private resolveSeedCommandArguments(): string[] {
    return ["run", "seed:local-dev", "-w", "@companyhelm/api"];
  }

  private async waitForPort(host: string, port: number, label: string): Promise<void> {
    const startedAt = Date.now();
    const timeoutMilliseconds = 60_000;
    while (Date.now() - startedAt < timeoutMilliseconds) {
      if (await this.canConnect(host, port)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`${label} did not become reachable at ${host}:${port}.`);
  }

  private async verifyReadiness(): Promise<void> {
    await this.waitForHttpSuccess(`${this.input.apiPublicUrl}/health`, "API health endpoint");
    await this.waitForGraphqlHealth();
    await this.waitForHttpSuccess(this.input.webPublicUrl, "web app");
    await this.waitForHttpSuccess(`${this.input.apiPublicUrl}/auth/dev/users`, "dev auth users endpoint");
  }

  private async waitForHttpSuccess(url: string, label: string): Promise<void> {
    const startedAt = Date.now();
    const timeoutMilliseconds = 120_000;
    while (Date.now() - startedAt < timeoutMilliseconds) {
      if (await this.isHttpSuccess(url)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`${label} did not become ready at ${url}.`);
  }

  private async waitForGraphqlHealth(): Promise<void> {
    const startedAt = Date.now();
    const timeoutMilliseconds = 120_000;
    while (Date.now() - startedAt < timeoutMilliseconds) {
      if (await this.isGraphqlHealthy()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`GraphQL health query did not become ready at ${this.input.apiPublicUrl}/graphql.`);
  }

  private async isHttpSuccess(url: string): Promise<boolean> {
    try {
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async isGraphqlHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.input.apiPublicUrl}/graphql`, {
        body: JSON.stringify({
          query: "query DemoHealth { health }",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      if (!response.ok) {
        return false;
      }

      const payload = await response.json() as {
        data?: {
          health?: string;
        };
      };
      return typeof payload.data?.health === "string" && payload.data.health.length > 0;
    } catch {
      return false;
    }
  }

  private canConnect(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = net.createConnection({ host, port });
      socket.setTimeout(1000);
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
      socket.once("timeout", () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  private runCommand(command: string, args: string[], environment: NodeJS.ProcessEnv = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, {
        env: {
          ...process.env,
          ...environment,
        },
        stdio: "inherit",
      });
      childProcess.once("error", reject);
      childProcess.once("exit", (code, signal) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`${command} ${args.join(" ")} failed with ${signal ?? `exit code ${code}`}.`));
      });
    });
  }

  private startPersistentCommand(command: string, args: string[], environment: NodeJS.ProcessEnv): void {
    const childProcess = spawn(command, args, {
      env: {
        ...process.env,
        ...environment,
      },
      stdio: "inherit",
    });
    this.childProcesses.push(childProcess);
    childProcess.once("exit", (code, signal) => {
      if (code === 0 || signal) {
        return;
      }

      this.stopChildProcesses();
      process.exitCode = code ?? 1;
    });
  }

  private registerShutdownHandlers(): void {
    let isShuttingDown = false;
    const shutdown = () => {
      if (isShuttingDown) {
        return;
      }
      isShuttingDown = true;
      this.stopChildProcesses();
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  }

  private stopChildProcesses(): void {
    for (const childProcess of this.childProcesses) {
      if (!childProcess.killed) {
        childProcess.kill("SIGTERM");
      }
    }
  }

  private printReadyMessage(): void {
    console.log(`\nCompanyHelm local-${this.input.mode} is starting.\n`);
    console.log(`Web:      ${this.input.webPublicUrl}`);
    console.log(`API:      ${this.input.apiPublicUrl}`);
    console.log(`GraphQL:  ${this.input.apiPublicUrl}/graphql`);
    if (this.input.verifyReadiness) {
      console.log("Readiness: API, GraphQL, web, and dev auth verified");
    }
    console.log("Auth:     dev");
    console.log("Seeded:   Andrea Local / CompanyHelm Local / CEO agent");
    console.log("Models:   Add company-owned LLM credentials in the app before running real agent prompts\n");
  }
}
