import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";

/**
 * Exposes the bootstrap facts that module-owned prompt templates may interpolate. Keeping this
 * object flat avoids leaking live runtime objects into nunjucks rendering while still letting
 * templates mention the active model and environment configuration when that adds clarity.
 */
export class AgentSessionModulePromptContext {
  readonly agentId: string;
  readonly agentName: string;
  readonly companyId: string;
  readonly companyName: string;
  readonly computeProviderDefinitionId: string;
  readonly environmentComputerUse: boolean;
  readonly environmentCpuCount: number;
  readonly environmentDiskSpaceGb: number;
  readonly environmentMemoryGb: number;
  readonly environmentProvider: string;
  readonly environmentTemplateId: string;
  readonly environmentTemplateName: string;
  readonly modelId: string;
  readonly modelProviderId: string;
  readonly reasoningLevel: string | null;
  readonly sessionId: string;

  constructor(context: AgentSessionBootstrapContext) {
    this.agentId = context.agentId;
    this.agentName = context.agentName;
    this.companyId = context.companyId;
    this.companyName = context.companyName;
    this.computeProviderDefinitionId = context.computeProviderDefinitionId;
    this.environmentComputerUse = context.environmentTemplate.computerUse;
    this.environmentCpuCount = context.environmentTemplate.cpuCount;
    this.environmentDiskSpaceGb = context.environmentTemplate.diskSpaceGb;
    this.environmentMemoryGb = context.environmentTemplate.memoryGb;
    this.environmentProvider = context.environmentProvider;
    this.environmentTemplateId = context.environmentTemplate.templateId;
    this.environmentTemplateName = context.environmentTemplate.name;
    this.modelId = context.modelId;
    this.modelProviderId = context.modelProviderId;
    this.reasoningLevel = context.reasoningLevel;
    this.sessionId = context.sessionId;
  }
}
