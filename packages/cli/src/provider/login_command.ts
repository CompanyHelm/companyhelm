import type { CliIo } from "../cli_io_interface.js";
import { TerminalStyle } from "../terminal_style.js";
import { ProviderLoginClient } from "./login_client.js";
import { ProviderOauthLoginRunner } from "./oauth_login_runner.js";

export type ProviderLoginCommandOptions = {
  apiUrl: string;
  code: string;
};

/**
 * Implements `companyhelm provider login` by resolving the web-generated code, running the matching
 * local OAuth flow, and atomically completing the CompanyHelm credential request.
 */
export class ProviderLoginCommand {
  static readonly DEFAULT_API_URL = "https://api.companyhelm.com";

  private readonly clientFactory: (apiUrl: string) => ProviderLoginClient;
  private readonly io: CliIo;
  private readonly oauthLoginRunner: ProviderOauthLoginRunner;

  constructor(
    io: CliIo,
    clientFactory: (apiUrl: string) => ProviderLoginClient = (apiUrl) => new ProviderLoginClient(apiUrl),
    oauthLoginRunner: ProviderOauthLoginRunner = new ProviderOauthLoginRunner(io),
  ) {
    this.clientFactory = clientFactory;
    this.io = io;
    this.oauthLoginRunner = oauthLoginRunner;
  }

  async run(options: ProviderLoginCommandOptions): Promise<void> {
    const client = this.clientFactory(options.apiUrl);
    const request = await client.resolve(options.code);
    this.io.writeLine(TerminalStyle.info(`Adding ${request.providerName} credential to CompanyHelm.`));
    this.io.writeLine(TerminalStyle.detail("Credential", request.credentialName));
    this.io.writeLine(TerminalStyle.detail("Company", request.companyName));
    this.io.writeLine(TerminalStyle.detail("Requested by", request.requestedBy));
    this.io.writeLine(TerminalStyle.detail("Expires", request.expiresAt));
    const credentials = await this.oauthLoginRunner.login(request.piOauthProviderId);
    this.io.writeLine(TerminalStyle.progress("Saving credential in CompanyHelm..."));
    await client.complete({
      code: options.code,
      credentials: {
        ...credentials,
        access: credentials.access,
        expires: credentials.expires,
        refresh: credentials.refresh,
      },
    });
    this.io.writeLine(TerminalStyle.success(`Credential "${request.credentialName}" added to ${request.companyName}.`));
  }
}
