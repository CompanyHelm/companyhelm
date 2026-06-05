import { getOAuthProvider, type OAuthCredentials } from "@mariozechner/pi-ai/oauth";
import type { CliIo } from "../cli_io_interface.js";
import { TerminalStyle } from "../terminal_style.js";

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
        this.io.writeLine(TerminalStyle.info("Complete the provider login in your browser."));
        this.io.writeLine(TerminalStyle.detail("Login URL", info.url));
      },
      onProgress: (message) => {
        this.io.writeLine(TerminalStyle.progress(message));
      },
      onPrompt: async () => {
        throw new Error(
          "CompanyHelm CLI did not receive the provider browser callback. Open the login URL on this machine and try again.",
        );
      },
    });
  }
}
