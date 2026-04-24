import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentGenerateImageTool } from "./generate_image.ts";
import { AgentImageGenerationToolService } from "./service.ts";

/**
 * Groups image-generation tools behind one provider so PI Mono can expose multimodal image output
 * only when the current agent has a configured image model.
 */
export class AgentImageGenerationToolProvider extends AgentToolProviderInterface {
  private readonly imageGenerationToolService: AgentImageGenerationToolService;

  constructor(imageGenerationToolService: AgentImageGenerationToolService) {
    super();
    this.imageGenerationToolService = imageGenerationToolService;
  }

  createToolDefinitions(): unknown[] {
    return [new AgentGenerateImageTool(this.imageGenerationToolService).createDefinition()];
  }
}
