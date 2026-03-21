import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const DEFAULT_LOCAL_CONFIG_FILE_NAME = "local.yaml";

export class DotEnvLoader {
  static loadForConfigPath(configPath: string, localConfigFileName?: string) {
    const dotEnvPath = DotEnvLoader.resolveDotEnvPathForConfigPath(configPath, localConfigFileName);
    if (!dotEnvPath || !existsSync(dotEnvPath)) {
      return;
    }

    process.loadEnvFile(dotEnvPath);
  }

  private static resolveDotEnvPathForConfigPath(
    configPath: string,
    localConfigFileName?: string,
  ): string | undefined {
    const expectedLocalConfigFileName = localConfigFileName ?? DEFAULT_LOCAL_CONFIG_FILE_NAME;
    if (basename(configPath) !== expectedLocalConfigFileName) {
      return undefined;
    }

    return resolve(dirname(configPath), "..", ".env.local");
  }
}
