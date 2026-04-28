import type { AgentCreateEnvironmentTemplateOption } from "./create_agent_dialog";

/**
 * Chooses the environment template that should be preselected for new agents while still falling
 * back to provider order when a provider does not expose the CompanyHelm medium template.
 */
export class EnvironmentTemplateDefaultSelector {
  private static readonly DEFAULT_TEMPLATE_ID = "medium";

  selectTemplateId(templates: AgentCreateEnvironmentTemplateOption[]): string {
    const preferredTemplate = templates.find(
      (template) => template.templateId === EnvironmentTemplateDefaultSelector.DEFAULT_TEMPLATE_ID,
    );

    return preferredTemplate?.templateId ?? templates[0]?.templateId ?? "";
  }
}
