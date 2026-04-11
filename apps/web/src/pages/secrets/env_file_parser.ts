import { EnvVarNameResolver } from "./env_var_name_resolver";

export type ParsedEnvSecretDraft = {
  envVarName: string;
  name: string;
  sourceEnvVarName: string;
  value: string;
};

export type ParsedEnvRejectedEntry = {
  reason: string;
  sourceEnvVarName: string;
};

export type ParsedEnvFile = {
  rejectedEntries: ParsedEnvRejectedEntry[];
  secretDrafts: ParsedEnvSecretDraft[];
};

const ENV_FILE_LINE_PATTERN =
  /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;

/**
 * Parses `.env` file contents in the browser and resolves every entry into the secret shape used
 * by the secrets page. The parser mirrors the multiline quoting behavior users expect from dotenv
 * files without depending on a Node-only runtime in the browser bundle.
 */
export class EnvFileParser {
  private readonly envVarNameResolver: EnvVarNameResolver;

  constructor(envVarNameResolver?: EnvVarNameResolver) {
    this.envVarNameResolver = envVarNameResolver ?? new EnvVarNameResolver();
  }

  parseFileContents(fileContents: string): ParsedEnvFile {
    const parsedEnvironmentVariables = this.parseEnvironmentVariables(fileContents);
    const secretDraftsByEnvVarName = new Map<string, ParsedEnvSecretDraft>();
    const rejectedEntries: ParsedEnvRejectedEntry[] = [];

    for (const [sourceEnvVarName, value] of Object.entries(parsedEnvironmentVariables)) {
      const resolvedEnvVarName = this.envVarNameResolver.resolveDefaultEnvVarName(sourceEnvVarName);
      if (resolvedEnvVarName === null) {
        rejectedEntries.push({
          reason: "Cannot be converted into a valid secret environment variable name.",
          sourceEnvVarName,
        });
        continue;
      }

      // Later definitions win so duplicate keys behave like a normal `.env` load.
      secretDraftsByEnvVarName.delete(resolvedEnvVarName);
      secretDraftsByEnvVarName.set(resolvedEnvVarName, {
        envVarName: resolvedEnvVarName,
        name: sourceEnvVarName.trim(),
        sourceEnvVarName,
        value,
      });
    }

    return {
      rejectedEntries,
      secretDrafts: [...secretDraftsByEnvVarName.values()],
    };
  }

  private parseEnvironmentVariables(fileContents: string): Record<string, string> {
    const parsedEnvironmentVariables: Record<string, string> = {};
    const normalizedContents = fileContents.replace(/\r\n?/gm, "\n");
    const envFileLinePattern = new RegExp(ENV_FILE_LINE_PATTERN);

    for (const nextMatch of normalizedContents.matchAll(envFileLinePattern)) {
      const sourceEnvVarName = nextMatch[1];
      let value = (nextMatch[2] ?? "").trim();
      const quoteCharacter = value[0];

      value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");

      if (quoteCharacter === "\"") {
        value = value.replace(/\\n/g, "\n");
        value = value.replace(/\\r/g, "\r");
      }

      parsedEnvironmentVariables[sourceEnvVarName] = value;
    }

    return parsedEnvironmentVariables;
  }
}
