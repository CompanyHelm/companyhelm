import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { ImageCatalog, type RuntimeImages } from "./ImageCatalog.js";

export interface RuntimeVersions {
  cliPackage: string;
  runnerPackage: string;
  images: RuntimeImages;
}

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class VersionCatalog {
  public resolve(): RuntimeVersions {
    return {
      cliPackage: this.readPackageVersion(path.resolve(__dirname, "../../../package.json")),
      runnerPackage: this.readPackageVersion(require.resolve("@companyhelm/runner/package.json")),
      images: new ImageCatalog().resolve()
    };
  }

  private readPackageVersion(packageJsonPath: string): string {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      name: string;
      version: string;
    };
    return `${packageJson.name}@${packageJson.version}`;
  }
}
