import type { CliIo } from "../cli_io_interface.js";
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
    this.io.writeLine(`Adding ${request.providerName} credential "${request.credentialName}" to ${request.companyName}.`);
    this.io.writeLine(`Requested by ${request.requestedBy}. Expires at ${request.expiresAt}.`);
    const credentials = await this.oauthLoginRunner.login(request.piOauthProviderId);
    const result = await client.complete({
      code: options.code,
      credentials: {
        ...credentials,
        access: credentials.access,
        expires: credentials.expires,
        refresh: credentials.refresh,
      },
    });
    this.io.writeLine(`Credential added successfully: ${result.credentialId}`);
  }
}
