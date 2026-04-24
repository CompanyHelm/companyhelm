import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentImageGenerationToolProvider } from "../tools/image_generation/provider.ts";
import { AgentImageGenerationToolService } from "../tools/image_generation/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";
import { ImageGenerationProviderService } from "../../../../ai_providers/image_generation/provider_service.ts";

/**
 * Injects the image generation tool only when the current agent has a default image model assigned.
 */
export class ImageGenerationSessionModule extends AgentSessionModuleInterface {
  getName(): string {
    return "image_generation";
  }

  async shouldApply(context: AgentSessionBootstrapContext): Promise<boolean> {
    return this.createToolService(context).hasConfiguredImageModel();
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [new AgentImageGenerationToolProvider(this.createToolService(context))];
  }

  private createToolService(context: AgentSessionBootstrapContext): AgentImageGenerationToolService {
    return new AgentImageGenerationToolService(
      context.transactionProvider,
      context.companyId,
      context.agentId,
      new ImageGenerationProviderService(),
    );
  }
}
