export type SystemCommandDefinition = {
  description: string;
  id: string;
  inputSchema: Record<string, unknown>;
  systemSkillKey: string;
};

/**
 * Describes platform-owned commands that are progressively revealed by system skills. The catalog
 * is metadata-only so skill prompts and command dispatch can share one allowlist without binding to
 * workflow services or session state.
 */
export class SystemCommandCatalog {
  private readonly commands: SystemCommandDefinition[] = [{
    description: "Create a new workflow definition with its initial inputs and ordered steps.",
    id: "workflow.create",
    inputSchema: {
      additionalProperties: false,
      properties: {
        description: { type: ["string", "null"] },
        inputs: { items: { type: "object" }, type: "array" },
        instructions: { type: ["string", "null"] },
        isEnabled: { type: "boolean" },
        name: { type: "string" },
        steps: { items: { type: "object" }, type: "array" },
      },
      required: ["name", "inputs", "steps"],
      type: "object",
    },
    systemSkillKey: "manage_workflows",
  }, {
    description: "Edit workflow metadata, top-level instructions, or enabled state without replacing inputs or steps.",
    id: "workflow.update",
    inputSchema: {
      additionalProperties: false,
      properties: {
        description: { type: ["string", "null"] },
        instructions: { type: ["string", "null"] },
        isEnabled: { type: "boolean" },
        name: { type: "string" },
        workflowDefinitionId: { type: "string" },
      },
      required: ["workflowDefinitionId"],
      type: "object",
    },
    systemSkillKey: "manage_workflows",
  }, {
    description: "Add one ordered step to an existing workflow definition.",
    id: "workflow.steps.add",
    inputSchema: {
      additionalProperties: false,
      properties: {
        instructions: { type: ["string", "null"] },
        name: { type: "string" },
        position: { type: "number" },
        workflowDefinitionId: { type: "string" },
      },
      required: ["workflowDefinitionId", "name"],
      type: "object",
    },
    systemSkillKey: "manage_workflows",
  }, {
    description: "Delete one step from an existing workflow definition.",
    id: "workflow.steps.delete",
    inputSchema: {
      additionalProperties: false,
      properties: {
        stepId: { type: "string" },
        workflowDefinitionId: { type: "string" },
      },
      required: ["workflowDefinitionId", "stepId"],
      type: "object",
    },
    systemSkillKey: "manage_workflows",
  }, {
    description: "Add one launch input to an existing workflow definition.",
    id: "workflow.inputs.add",
    inputSchema: {
      additionalProperties: false,
      properties: {
        defaultValue: { type: ["string", "null"] },
        description: { type: ["string", "null"] },
        isRequired: { type: "boolean" },
        name: { type: "string" },
        workflowDefinitionId: { type: "string" },
      },
      required: ["workflowDefinitionId", "name"],
      type: "object",
    },
    systemSkillKey: "manage_workflows",
  }, {
    description: "Delete one launch input from an existing workflow definition.",
    id: "workflow.inputs.delete",
    inputSchema: {
      additionalProperties: false,
      properties: {
        inputId: { type: "string" },
        workflowDefinitionId: { type: "string" },
      },
      required: ["workflowDefinitionId", "inputId"],
      type: "object",
    },
    systemSkillKey: "manage_workflows",
  }];

  listCommandDefinitions(systemSkillKey: string): SystemCommandDefinition[] {
    return this.commands
      .filter((command) => command.systemSkillKey === systemSkillKey)
      .map((command) => ({
        ...command,
        inputSchema: { ...command.inputSchema },
      }));
  }

  requireCommandDefinition(commandId: string): SystemCommandDefinition {
    const command = this.commands.find((definition) => definition.id === commandId);
    if (!command) {
      throw new Error(`System command ${commandId} is not available.`);
    }

    return {
      ...command,
      inputSchema: { ...command.inputSchema },
    };
  }
}
