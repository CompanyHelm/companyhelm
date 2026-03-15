import { readFileSync } from "node:fs";

type PackageManifest = {
  version: string;
};

export class CliPackageMetadata {
  version(): string {
    const manifestPath = new URL("../../../package.json", import.meta.url);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;
    return manifest.version;
  }
}
