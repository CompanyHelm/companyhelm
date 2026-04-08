import { ArtifactService } from "../../../../artifact_service.ts";
import type { AgentToolProviderInterface } from "../../../tools/provider_interface.ts";
import { AgentArtifactToolProvider } from "../../../tools/artifacts/provider.ts";
import { AgentArtifactToolService } from "../../../tools/artifacts/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Wraps artifact browsing and mutation behind one module so PI Mono can attach artifact tools
 * without the session manager manually constructing the underlying scoped artifact service.
 */
export class ArtifactsSessionModule extends AgentSessionModuleInterface {
  private readonly artifactService: ArtifactService;

  constructor(artifactService: ArtifactService = new ArtifactService()) {
    super();
    this.artifactService = artifactService;
  }

  getName(): string {
    return "artifacts";
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentArtifactToolProvider(
        new AgentArtifactToolService(
          context.transactionProvider,
          context.companyId,
          context.agentId,
          this.artifactService,
        ),
      ),
    ];
  }
}
