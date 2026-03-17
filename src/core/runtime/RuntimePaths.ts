import path from "node:path";

export class RuntimePaths {
  public constructor(private readonly root: string) {}

  public stateFilePath(): string {
    return path.join(this.root, "state.yaml");
  }

  public composeFilePath(): string {
    return path.join(this.root, "docker-compose.yaml");
  }

  public apiDirectoryPath(): string {
    return path.join(this.root, "api");
  }

  public apiEnvPath(): string {
    return path.join(this.apiDirectoryPath(), ".env");
  }

  public apiConfigPath(): string {
    return path.join(this.root, "api-config.yaml");
  }

  public frontendConfigPath(): string {
    return path.join(this.root, "frontend-config.yaml");
  }

  public seedFilePath(): string {
    return path.join(this.root, "seed.sql");
  }

  public runnerConfigPath(): string {
    return path.join(this.root, "runner");
  }

  public runnerStateDbPath(): string {
    return path.join(this.runnerConfigPath(), "state.db");
  }

  public runnerLogPath(): string {
    return path.join(this.runnerConfigPath(), "daemon.log");
  }

  public serviceRuntimePath(): string {
    return path.join(this.root, "services");
  }

  public serviceLogPath(service: "api" | "frontend"): string {
    return path.join(this.serviceRuntimePath(), `${service}.log`);
  }
}
