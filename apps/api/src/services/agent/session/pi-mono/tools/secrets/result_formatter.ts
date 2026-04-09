import type { AgentSecretSummary, AgentSecretValue } from "./service.ts";

/**
 * Formats secret metadata for transcript persistence without ever including secret plaintext.
 * These text blocks are intentionally compact so the agent can inspect what is available while
 * keeping the actual values undisclosed.
 */
export class AgentSecretResultFormatter {
  static formatAssignedSecrets(secrets: AgentSecretSummary[]): string {
    if (secrets.length === 0) {
      return "No secrets are attached to this chat session.";
    }

    return AgentSecretResultFormatter.formatSecretList(secrets);
  }

  static formatAvailableSecrets(secrets: AgentSecretSummary[]): string {
    if (secrets.length === 0) {
      return "No reusable company secrets are available.";
    }

    return AgentSecretResultFormatter.formatSecretList(secrets);
  }

  static formatReadSecret(secret: AgentSecretValue): string {
    return [
      `Read secret metadata for ${secret.name}.`,
      `envVarName: ${secret.envVarName}`,
      "Prefer using this secret through environment variables in pty_exec, bash_exec, or gh_exec instead of reading plaintext directly.",
    ].join("\n");
  }

  private static formatSecretList(secrets: AgentSecretSummary[]): string {
    return secrets.map((secret) => {
      const description = secret.description ?? "(no description)";
      return [
        `name: ${secret.name}`,
        `envVarName: ${secret.envVarName}`,
        `description: ${description}`,
      ].join("\n");
    }).join("\n\n");
  }
}
