import { ExaWebClient } from "../../../../web_search/exa_client.ts";
import type { AgentToolProviderInterface } from "../../../tools/provider_interface.ts";
import { AgentWebToolProvider } from "../../../tools/web/provider.ts";
import { AgentWebToolService } from "../../../tools/web/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Wraps the Exa-backed research tools so web search and fetch stay modular and can later grow
 * prompt guidance without pushing more logic back into the session manager.
 */
export class WebSessionModule extends AgentSessionModuleInterface {
  private readonly exaWebClient: ExaWebClient;

  constructor(exaWebClient: ExaWebClient) {
    super();
    this.exaWebClient = exaWebClient;
  }

  getName(): string {
    return "web";
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    void context;
    return [
      new AgentWebToolProvider(new AgentWebToolService(this.exaWebClient)),
    ];
  }
}
