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
    description: "List company skill groups and skills, including system skills.",
    id: "skill.list",
    inputSchema: {
      additionalProperties: false,
      properties: {},
      type: "object",
    },
    systemSkillKey: "manage_skills",
  }, {
    description: "Create a manual company skill with instructions stored directly in CompanyHelm.",
    id: "skill.create",
    inputSchema: {
      additionalProperties: false,
      properties: {
        description: { type: "string" },
        instructions: { type: "string" },
        name: { type: "string" },
        skillGroupId: { type: ["string", "null"] },
      },
      required: ["name", "description", "instructions"],
      type: "object",
    },
    systemSkillKey: "manage_skills",
  }, {
    description: "Import one or more Git-backed skill packages from a public repository branch.",
    id: "skill.github.import",
    inputSchema: {
      additionalProperties: false,
      properties: {
        skillGroupId: { type: ["string", "null"] },
        skills: {
          items: {
            additionalProperties: false,
            properties: {
              branchName: { type: "string" },
              repository: { type: "string" },
              skillDirectory: { type: "string" },
            },
            required: ["repository", "branchName", "skillDirectory"],
            type: "object",
          },
          type: "array",
        },
      },
      required: ["skills"],
      type: "object",
    },
    systemSkillKey: "manage_skills",
  }, {
    description: "Update an editable company skill's metadata, instructions, or group.",
    id: "skill.update",
    inputSchema: {
      additionalProperties: false,
      properties: {
        description: { type: ["string", "null"] },
        instructions: { type: ["string", "null"] },
        name: { type: ["string", "null"] },
        skillGroupId: { type: ["string", "null"] },
        skillId: { type: "string" },
      },
      required: ["skillId"],
      type: "object",
    },
    systemSkillKey: "manage_skills",
  }, {
    description: "Delete one custom company skill from the catalog.",
    id: "skill.delete",
    inputSchema: {
      additionalProperties: false,
      properties: {
        skillId: { type: "string" },
      },
      required: ["skillId"],
      type: "object",
    },
    systemSkillKey: "manage_skills",
  }, {
    description: "Create a reusable company skill group.",
    id: "skill.group.create",
    inputSchema: {
      additionalProperties: false,
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
      type: "object",
    },
    systemSkillKey: "manage_skills",
  }, {
    description: "Rename one reusable company skill group.",
    id: "skill.group.update",
    inputSchema: {
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        skillGroupId: { type: "string" },
      },
      required: ["skillGroupId", "name"],
      type: "object",
    },
    systemSkillKey: "manage_skills",
  }, {
    description: "Delete one reusable company skill group and ungroup its skills.",
    id: "skill.group.delete",
    inputSchema: {
      additionalProperties: false,
      properties: {
        skillGroupId: { type: "string" },
      },
      required: ["skillGroupId"],
      type: "object",
    },
    systemSkillKey: "manage_skills",
  }, {
    description: "List enabled workflows available to the current agent session, including launch inputs.",
    id: "workflow.list",
    inputSchema: {
      additionalProperties: false,
      properties: {},
      type: "object",
    },
    systemSkillKey: "manage_workflows",
  }, {
    description: "Start a workflow run for the current agent session.",
    id: "workflow.start",
    inputSchema: {
      additionalProperties: false,
      properties: {
        input: { additionalProperties: true, type: "object" },
        workflowDefinitionId: { type: "string" },
      },
      required: ["workflowDefinitionId"],
      type: "object",
    },
    systemSkillKey: "manage_workflows",
  }, {
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
  }, {
    description: "List company agents and the option catalogs needed to create or update them.",
    id: "agent.list",
    inputSchema: {
      additionalProperties: false,
      properties: {},
      type: "object",
    },
    systemSkillKey: "manage_agents",
  }, {
    description: "Create a company agent with model, compute provider, environment template, and secret defaults.",
    id: "agent.create",
    inputSchema: {
      additionalProperties: false,
      properties: {
        defaultComputeProviderDefinitionId: { type: "string" },
        defaultEnvironmentTemplateId: { type: "string" },
        modelProviderCredentialId: { type: ["string", "null"] },
        modelProviderCredentialModelId: { type: "string" },
        name: { type: "string" },
        reasoningLevel: { type: ["string", "null"] },
        secretIds: { items: { type: "string" }, type: ["array", "null"] },
        systemPrompt: { type: ["string", "null"] },
      },
      required: [
        "defaultComputeProviderDefinitionId",
        "defaultEnvironmentTemplateId",
        "modelProviderCredentialModelId",
        "name",
      ],
      type: "object",
    },
    systemSkillKey: "manage_agents",
  }, {
    description: "Update a company agent while leaving omitted fields unchanged.",
    id: "agent.update",
    inputSchema: {
      additionalProperties: false,
      properties: {
        defaultComputeProviderDefinitionId: { type: ["string", "null"] },
        defaultEnvironmentTemplateId: { type: ["string", "null"] },
        id: { type: "string" },
        modelProviderCredentialId: { type: ["string", "null"] },
        modelProviderCredentialModelId: { type: ["string", "null"] },
        name: { type: ["string", "null"] },
        reasoningLevel: { type: ["string", "null"] },
        secretIds: { items: { type: "string" }, type: ["array", "null"] },
        systemPrompt: { type: ["string", "null"] },
      },
      required: ["id"],
      type: "object",
    },
    systemSkillKey: "manage_agents",
  }, {
    description: "List artifacts for the current company, one task, or this session.",
    id: "artifact.list",
    inputSchema: {
      additionalProperties: false,
      properties: {
        scopeType: { enum: ["company", "task", "session"], type: "string" },
        taskId: { type: ["string", "null"] },
      },
      required: ["scopeType"],
      type: "object",
    },
    systemSkillKey: "manage_artifacts",
  }, {
    description: "Load one artifact including its type-specific content.",
    id: "artifact.get",
    inputSchema: {
      additionalProperties: false,
      properties: {
        artifactId: { type: "string" },
      },
      required: ["artifactId"],
      type: "object",
    },
    systemSkillKey: "manage_artifacts",
  }, {
    description: "Create a markdown artifact for a company, task, or this session.",
    id: "artifact.markdown.create",
    inputSchema: {
      additionalProperties: false,
      properties: {
        contentMarkdown: { type: "string" },
        description: { type: ["string", "null"] },
        name: { type: "string" },
        scopeType: { enum: ["company", "task", "session"], type: "string" },
        state: { enum: ["draft", "active", "archived", null] },
        taskId: { type: ["string", "null"] },
      },
      required: ["contentMarkdown", "name", "scopeType"],
      type: "object",
    },
    systemSkillKey: "manage_artifacts",
  }, {
    description: "Create an external-link artifact for a company, task, or this session.",
    id: "artifact.external_link.create",
    inputSchema: {
      additionalProperties: false,
      properties: {
        description: { type: ["string", "null"] },
        name: { type: "string" },
        scopeType: { enum: ["company", "task", "session"], type: "string" },
        state: { enum: ["draft", "active", "archived", null] },
        taskId: { type: ["string", "null"] },
        url: { type: "string" },
      },
      required: ["name", "scopeType", "url"],
      type: "object",
    },
    systemSkillKey: "manage_artifacts",
  }, {
    description: "Create a pull-request artifact for a company, task, or this session.",
    id: "artifact.pull_request.create",
    inputSchema: {
      additionalProperties: false,
      properties: {
        description: { type: ["string", "null"] },
        name: { type: "string" },
        provider: { enum: ["github", null] },
        pullRequestNumber: { type: ["integer", "null"] },
        repository: { type: ["string", "null"] },
        scopeType: { enum: ["company", "task", "session"], type: "string" },
        state: { enum: ["draft", "active", "archived", null] },
        taskId: { type: ["string", "null"] },
        url: { type: "string" },
      },
      required: ["name", "scopeType", "url"],
      type: "object",
    },
    systemSkillKey: "manage_artifacts",
  }, {
    description: "Update an artifact's shared metadata such as name, description, or state.",
    id: "artifact.metadata.update",
    inputSchema: {
      additionalProperties: false,
      properties: {
        artifactId: { type: "string" },
        description: { type: ["string", "null"] },
        name: { type: ["string", "null"] },
        state: { enum: ["draft", "active", "archived", null] },
      },
      required: ["artifactId"],
      type: "object",
    },
    systemSkillKey: "manage_artifacts",
  }, {
    description: "Replace the markdown content for one markdown artifact.",
    id: "artifact.markdown.update",
    inputSchema: {
      additionalProperties: false,
      properties: {
        artifactId: { type: "string" },
        contentMarkdown: { type: "string" },
      },
      required: ["artifactId", "contentMarkdown"],
      type: "object",
    },
    systemSkillKey: "manage_artifacts",
  }, {
    description: "Replace the URL for one external-link artifact.",
    id: "artifact.external_link.update",
    inputSchema: {
      additionalProperties: false,
      properties: {
        artifactId: { type: "string" },
        url: { type: "string" },
      },
      required: ["artifactId", "url"],
      type: "object",
    },
    systemSkillKey: "manage_artifacts",
  }, {
    description: "Archive one artifact without deleting it.",
    id: "artifact.archive",
    inputSchema: {
      additionalProperties: false,
      properties: {
        artifactId: { type: "string" },
      },
      required: ["artifactId"],
      type: "object",
    },
    systemSkillKey: "manage_artifacts",
  }, {
    description: "List company agents from the read-only company directory.",
    id: "company_directory.agents.list",
    inputSchema: {
      additionalProperties: false,
      properties: {},
      type: "object",
    },
    systemSkillKey: "company_directory",
  }, {
    description: "List company members from the read-only company directory.",
    id: "company_directory.members.list",
    inputSchema: {
      additionalProperties: false,
      properties: {},
      type: "object",
    },
    systemSkillKey: "company_directory",
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
