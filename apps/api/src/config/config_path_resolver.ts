import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

export class ConfigPathResolver {
  static resolve(
    configPath: string,
    cwd: string,
  ): string {
    const resolvedConfigPath = ConfigPathResolver.resolveExplicitPath(configPath, cwd);

    if (!existsSync(resolvedConfigPath)) {
      throw new Error(`No config file found at path "${resolvedConfigPath}".`);
    }

    return resolvedConfigPath;
  }
  private static resolveExplicitPath(configPath: string, cwd: string): string {
    if (!configPath.trim()) {
      throw new Error("Config path cannot be empty.");
    }

    return isAbsolute(configPath) ? configPath : resolve(cwd, configPath);
  }
}
