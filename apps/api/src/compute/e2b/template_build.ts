import { Template, type BuildInfo, type TemplateClass, defaultBuildLogger } from "e2b";
import type { AgentEnvironmentTemplate } from "../../services/agent/compute/provider_interface.ts";

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
