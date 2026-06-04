import { getOAuthProvider, type OAuthCredentials, type OAuthPrompt } from "@mariozechner/pi-ai/oauth";
import type { CliIo } from "../cli_io_interface.js";

/**
 * Runs the provider OAuth flow supplied by Pi Mono and adapts its terminal callbacks to CompanyHelm's
 * small CLI IO interface. This keeps provider-specific login mechanics outside command parsing.
 */
export class ProviderOauthLoginRunner {
  private readonly io: CliIo;

  constructor(io: CliIo) {
    this.io = io;
  }

  async login(providerId: string): Promise<OAuthCredentials> {
    const provider = getOAuthProvider(providerId);
    if (!provider) {
      throw new Error(`Pi OAuth provider is not registered: ${providerId}`);
    }

    return provider.login({
      onAuth: (info) => {
        if (info.instructions) {
          this.io.writeLine(info.instructions);
        }
        this.io.writeLine(info.url);
      },
      onManualCodeInput: async () => this.io.readLine("Paste the authorization code or redirect URL: "),
      onProgress: (message) => {
        this.io.writeLine(message);
      },
      onPrompt: async (prompt: OAuthPrompt) => this.io.readLine(ProviderOauthLoginRunner.promptLabel(prompt)),
    });
  }

  private static promptLabel(prompt: OAuthPrompt): string {
    if (prompt.placeholder) {
      return `${prompt.message} (${prompt.placeholder}): `;
    }

    return `${prompt.message}: `;
  }
}
