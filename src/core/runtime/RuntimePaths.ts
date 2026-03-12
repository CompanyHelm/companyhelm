import path from "node:path";

export class RuntimePaths {
  public constructor(private readonly root: string) {}

  public stateFilePath(): string {
    return path.join(this.root, "state.json");
  }

  public composeFilePath(): string {
    return path.join(this.root, "docker-compose.yaml");
  }

  public seedFilePath(): string {
    return path.join(this.root, "seed.sql");
  }

  public runnerConfigPath(): string {
    return path.join(this.root, "runner");
  }

  public runnerLogPath(): string {
    return path.join(this.root, "runner.log");
  }
}
