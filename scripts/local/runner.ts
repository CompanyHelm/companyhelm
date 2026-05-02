import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";

export type LocalRunnerMode = "dev" | "e2b";

type LocalRunnerInput = {
  apiPublicUrl: string;
  mode: LocalRunnerMode;
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
    this.assertRequiredEnvironment();
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
    this.printReadyMessage();
  }

  private assertRequiredEnvironment(): void {
    const requiredVariableNames = [
      "EXA_API_KEY",
      "E2B_API_KEY",
      "GITHUB_APP_CLIENT_ID",
      "GITHUB_APP_PRIVATE_KEY_PEM",
      "GITHUB_APP_URL",
    ];
    if (this.input.mode === "e2b") {
      requiredVariableNames.push("COMPANYHELM_API_PUBLIC_URL", "COMPANYHELM_WEB_PUBLIC_URL");
    }

    const missingVariableNames = requiredVariableNames.filter((variableName) => !process.env[variableName]);
    if (missingVariableNames.length > 0) {
      throw new Error(`Missing required local ${this.input.mode} environment variables: ${missingVariableNames.join(", ")}.`);
    }
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

    await this.waitForPort("127.0.0.1", 5432, "Postgres");
    await this.waitForPort("127.0.0.1", 6379, "Redis");
  }

  private async areDataServicesReachable(): Promise<boolean> {
    return await this.canConnect("127.0.0.1", 5432) && await this.canConnect("127.0.0.1", 6379);
  }

  private resolveSeedCommandArguments(): string[] {
    const seedArguments = ["run", "seed:local-dev", "-w", "@companyhelm/api"];
    if (process.env.COMPANYHELM_LOCAL_OPENAI_API_KEY) {
      seedArguments.push("--", "--seed-openai-from-env");
    }

    return seedArguments;
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
    console.log("Auth:     dev");
    console.log("Seeded:   Andrea Local / CompanyHelm Local / Operator onboarding agent with CompanyHelm provider");
    console.log("Models:   Set COMPANYHELM_LOCAL_OPENAI_API_KEY to validate and seed a local OpenAI route\n");
  }
}
