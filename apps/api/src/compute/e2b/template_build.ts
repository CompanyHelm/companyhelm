import { Template, type BuildInfo, type TemplateClass, defaultBuildLogger } from "e2b";
import type { Config } from "../../config/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import type { AgentEnvironmentTemplate } from "../../services/environments/providers/provider_interface.ts";
import { AgentComputeE2bComputerUseToolProvider } from "./tools/computer-use/provider.ts";
import { AgentComputeE2bComputerUseToolService } from "./tools/computer-use/service.ts";
import { AgentEnvironmentPromptScope } from "../../services/environments/prompt_scope.ts";
import { AgentComputeE2bDesktopSandboxService } from "../../services/environments/providers/e2b/desktop_sandbox_service.ts";
import { ComputeProviderDefinitionService } from "../../services/compute_provider_definitions/service.ts";
import type { AgentToolProviderInterface } from "../../services/agent/session/pi-mono/tools/provider_interface.ts";

/**
 * Encapsulates one CompanyHelm-managed E2B template definition and submits builds with the
 * runtime credentials loaded from the API config file. The same definition also exposes the
 * catalog metadata that the API returns to callers so provisioning does not depend on live E2B
 * template introspection.
 */
export class E2bTemplateBuild {
  private static readonly DEFAULT_DISK_SPACE_GB = 20;
  private readonly cpuCount: number;
  private readonly memoryMB: number;
  private readonly template: TemplateClass;
  private readonly templateId: string;
  private readonly computerUse: boolean;

  constructor(input: {
    cpuCount: number;
    memoryMB: number;
    template: TemplateClass;
    templateId: string;
    computerUse: boolean;
  }) {
    this.cpuCount = input.cpuCount;
    this.memoryMB = input.memoryMB;
    this.template = input.template;
    this.templateId = input.templateId;
    this.computerUse = input.computerUse;
  }

  isComputerUse(): boolean {
    return this.computerUse;
  }

  getTemplateId(): string {
    return this.templateId;
  }

  matchesTemplateId(templateId: string): boolean {
    return this.templateId === templateId;
  }

  toEnvironmentTemplate(): AgentEnvironmentTemplate {
    return {
      computerUse: this.computerUse,
      cpuCount: this.cpuCount,
      diskSpaceGb: E2bTemplateBuild.DEFAULT_DISK_SPACE_GB,
      memoryGb: this.convertMegabytesToGigabytes(this.memoryMB),
      name: this.templateId,
      templateId: this.templateId,
    };
  }

  /**
   * Builds the provider-specific tool providers that should be injected when a PI Mono session is
   * created for this template. Non-computer-use templates contribute no extra tools.
   */
  getTools(input: {
    config: Config;
    computeProviderDefinitionService: ComputeProviderDefinitionService;
    promptScope: AgentEnvironmentPromptScope;
    transactionProvider: TransactionProviderInterface;
  }): AgentToolProviderInterface[] {
    if (!this.computerUse) {
      return [];
    }

    return [
      new AgentComputeE2bComputerUseToolProvider(
        new AgentComputeE2bComputerUseToolService(
          input.transactionProvider,
          input.promptScope,
          new AgentComputeE2bDesktopSandboxService(
            input.config,
            input.computeProviderDefinitionService,
          ),
        ),
      ),
    ];
  }

  async build(apiKey: string, templatePrefix: string): Promise<BuildInfo> {
    return Template.build(this.template, this.resolveTemplateReference(templatePrefix), {
      apiKey,
      cpuCount: this.cpuCount,
      memoryMB: this.memoryMB,
      onBuildLogs: defaultBuildLogger(),
    });
  }

  resolveTemplateReference(templatePrefix: string): string {
    return `${templatePrefix}${this.templateId}`;
  }

  private convertMegabytesToGigabytes(valueInMegabytes: number): number {
    return Math.max(1, Math.ceil(valueInMegabytes / 1024));
  }
}
