import { Template, type BuildInfo, type TemplateClass, defaultBuildLogger } from "e2b";

/**
 * Encapsulates one CompanyHelm-managed E2B template definition and submits builds with the
 * runtime credentials loaded from the API config file.
 */
export class E2bTemplateBuild {
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

  async build(apiKey: string): Promise<BuildInfo> {
    return Template.build(this.template, this.templateId, {
      apiKey,
      cpuCount: this.cpuCount,
      memoryMB: this.memoryMB,
      onBuildLogs: defaultBuildLogger(),
    });
  }
}
