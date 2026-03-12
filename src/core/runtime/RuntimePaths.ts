import path from "node:path";

export class RuntimePaths {
  public constructor(private readonly root: string) {}

  public stateFilePath(): string {
    return path.join(this.root, "state.json");
  }

  public composeFilePath(): string {
    return path.join(this.root, "docker-compose.yaml");
  }

  public apiConfigPath(): string {
    return path.join(this.root, "api-config.yaml");
  }

  public frontendConfigPath(): string {
    return path.join(this.root, "frontend-config.yaml");
  }

  public frontendRuntimePath(): string {
    return path.join(this.root, "frontend");
  }

  public frontendLogPath(): string {
    return path.join(this.frontendRuntimePath(), "preview.log");
  }

  public frontendPidPath(): string {
    return path.join(this.frontendRuntimePath(), "preview.pid");
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
}
