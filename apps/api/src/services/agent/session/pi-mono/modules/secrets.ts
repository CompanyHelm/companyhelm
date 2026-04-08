import { SecretService } from "../../../../secrets/service.ts";
import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentSecretToolProvider } from "../tools/secrets/provider.ts";
import { AgentSecretToolService } from "../tools/secrets/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Owns the company and session secret browsing tools for one prompt run. The module binds the
 * current company, session, and transaction scope so secret tools stay stateless at call time.
 */
export class SecretsSessionModule extends AgentSessionModuleInterface {
  private readonly secretService: SecretService;

  constructor(secretService: SecretService) {
    super();
    this.secretService = secretService;
  }

  getName(): string {
    return "secrets";
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentSecretToolProvider(
        new AgentSecretToolService(
          context.transactionProvider,
          context.companyId,
          context.sessionId,
          this.secretService,
        ),
      ),
    ];
  }
}
