import path from "node:path";

export class RuntimePaths {
  public constructor(private readonly root: string) {}

  public stateFilePath(): string {
    return path.join(this.root, "state.json");
  }
}
