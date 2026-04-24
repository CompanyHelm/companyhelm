import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { parseEnv } from "node:util";

const DEFAULT_LOCAL_CONFIG_FILE_NAME = "local.yaml";

export class DotEnvLoader {
  private static readonly loadedVariableNames = new Set<string>();

  static loadForConfigPath(configPath: string, localConfigFileName?: string) {
    const dotEnvPath = DotEnvLoader.resolveDotEnvPathForConfigPath(configPath, localConfigFileName);
    if (!dotEnvPath || !existsSync(dotEnvPath)) {
      return;
    }

    const parsedVariables = parseEnv(readFileSync(dotEnvPath, "utf8"));
    for (const [variableName, value] of Object.entries(parsedVariables)) {
      if (variableName in process.env && !DotEnvLoader.loadedVariableNames.has(variableName)) {
        continue;
      }

      process.env[variableName] = value;
      DotEnvLoader.loadedVariableNames.add(variableName);
    }
  }

  private static resolveDotEnvPathForConfigPath(
    configPath: string,
    localConfigFileName?: string,
  ): string | undefined {
    const dotEnvFileName = DotEnvLoader.resolveDotEnvFileName(
      basename(configPath),
      localConfigFileName ?? DEFAULT_LOCAL_CONFIG_FILE_NAME,
    );
    if (!dotEnvFileName) {
      return undefined;
    }

    return resolve(dirname(configPath), "..", dotEnvFileName);
  }

  private static resolveDotEnvFileName(
    configFileName: string,
    expectedLocalConfigFileName: string,
  ): string | undefined {
    const expectedExtension = extname(expectedLocalConfigFileName);
    const expectedBaseName = expectedLocalConfigFileName.slice(0, -expectedExtension.length);
    if (configFileName === expectedLocalConfigFileName) {
      return `.env.${expectedBaseName}`;
    }

    if (!configFileName.startsWith(`${expectedBaseName}-`) || !configFileName.endsWith(expectedExtension)) {
      return undefined;
    }

    return `.env.${configFileName.slice(0, -expectedExtension.length)}`;
  }
}
