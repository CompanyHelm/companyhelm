import path from "node:path";

export class ProjectPaths {
  public constructor(private readonly root: string = process.cwd()) {}

  public companyhelmRootPath(): string {
    return path.join(this.root, ".companyhelm");
  }

  public apiDirectoryPath(): string {
    return path.join(this.companyhelmRootPath(), "api");
  }

  public apiEnvPath(): string {
    return path.join(this.apiDirectoryPath(), ".env");
  }
}
