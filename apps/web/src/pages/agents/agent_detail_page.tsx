import { Suspense, useEffect, useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { CompanyHelmComputeProvider } from "@/companyhelm_compute_provider";
import { EditableField } from "@/components/editable_field";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { AgentSecretDefaultsCard } from "./agent_secret_defaults_card";
import type {
  AgentCreateComputeProviderDefinitionOption,
  AgentCreateProviderOption,
} from "./create_agent_dialog";
import type { agentDetailPageQuery } from "./__generated__/agentDetailPageQuery.graphql";
import type { agentDetailPageUpdateAgentMutation } from "./__generated__/agentDetailPageUpdateAgentMutation.graphql";

const agentDetailPageQueryNode = graphql`
  query agentDetailPageQuery($agentId: ID!) {
    Agent(id: $agentId) {
      id
      name
      modelProviderCredentialId
      modelProviderCredentialModelId
      modelProvider
      modelName
      defaultComputeProvider
      defaultComputeProviderDefinitionId
      defaultComputeProviderDefinitionName
      defaultEnvironmentTemplateId
      reasoningLevel
      systemPrompt
      environmentTemplate {
        computerUse
        cpuCount
        diskSpaceGb
        memoryGb
        name
        templateId
      }
      createdAt
      updatedAt
    }
    CompanySettings {
      companyId
      baseSystemPrompt
    }
    AgentSecrets(agentId: $agentId) {
      id
      name
      description
      envVarName
    }
    AgentCreateOptions {
      id
      isDefault
      label
      modelProvider
      defaultModelId
      defaultReasoningLevel
      models {
        id
        modelId
        name
        description
        reasoningLevels
      }
    }
    Secrets {
      id
      name
      description
      envVarName
    }
    ComputeProviderDefinitions {
      id
      isDefault
      name
      provider
      templates {
        computerUse
        cpuCount
        diskSpaceGb
        memoryGb
        name
        templateId
      }
    }
  }
`;

const agentDetailPageUpdateAgentMutationNode = graphql`
  mutation agentDetailPageUpdateAgentMutation($input: UpdateAgentInput!) {
    UpdateAgent(input: $input) {
      id
      name
      modelProviderCredentialId
      modelProviderCredentialModelId
      modelProvider
      modelName
      defaultComputeProvider
      defaultComputeProviderDefinitionId
      defaultComputeProviderDefinitionName
      defaultEnvironmentTemplateId
      environmentTemplate {
        computerUse
        cpuCount
        diskSpaceGb
        memoryGb
        name
        templateId
      }
      reasoningLevel
      systemPrompt
      createdAt
      updatedAt
    }
  }
`;

function AgentDetailPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>Loading agent configuration…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading agent…
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function formatTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function resolveProviderOption(
  providerOptions: AgentCreateProviderOption[],
  providerCredentialId: string,
): AgentCreateProviderOption {
  const providerOption = providerOptions.find((option) => option.id === providerCredentialId);
  if (!providerOption) {
    throw new Error("Provider option not found.");
  }

  return providerOption;
}

function resolveModelOption(
  providerOption: AgentCreateProviderOption,
  modelId: string | null | undefined,
) {
  if (modelId) {
    const exactMatch = providerOption.models.find((option) => option.id === modelId);
    if (exactMatch) {
      return exactMatch;
    }
  }

  const defaultModelOption = providerOption.models.find(
    (option) => option.modelId === providerOption.defaultModelId,
  );
  return defaultModelOption ?? providerOption.models[0] ?? null;
}

function resolveReasoningLevel(
  providerOption: AgentCreateProviderOption,
  modelOption: AgentCreateProviderOption["models"][number] | null,
  requestedReasoningLevel: string | null | undefined,
) {
  const supportedLevels = modelOption?.reasoningLevels ?? [];
  if (supportedLevels.length === 0) {
    return null;
  }

  if (requestedReasoningLevel && supportedLevels.includes(requestedReasoningLevel)) {
    return requestedReasoningLevel;
  }

  if (
    providerOption.defaultReasoningLevel
    && supportedLevels.includes(providerOption.defaultReasoningLevel)
  ) {
    return providerOption.defaultReasoningLevel;
  }

  return supportedLevels[0] ?? null;
}

function AgentDetailPageContent() {
  const { agentId } = useParams({ strict: false });
  const normalizedAgentId = String(agentId || "").trim();
  const { setDetailLabel } = useApplicationBreadcrumb();
  if (!normalizedAgentId) {
    throw new Error("Agent ID is required.");
  }

  const data = useLazyLoadQuery<agentDetailPageQuery>(
    agentDetailPageQueryNode,
    {
      agentId: normalizedAgentId,
    },
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitUpdateAgent] = useMutation<agentDetailPageUpdateAgentMutation>(
    agentDetailPageUpdateAgentMutationNode,
  );

  const agent = data.Agent;
  const agentSecrets = data.AgentSecrets.map((secret) => ({
    description: secret.description,
    envVarName: secret.envVarName,
    id: secret.id,
    name: secret.name,
  }));
  const companySecrets = data.Secrets.map((secret) => ({
    description: secret.description,
    envVarName: secret.envVarName,
    id: secret.id,
    name: secret.name,
  }));
  const providerOptions: AgentCreateProviderOption[] = useMemo(() => {
    return data.AgentCreateOptions.map((providerOption) => ({
      id: providerOption.id,
      isDefault: providerOption.isDefault,
      label: providerOption.label,
      modelProvider: providerOption.modelProvider,
      defaultModelId: providerOption.defaultModelId,
      defaultReasoningLevel: providerOption.defaultReasoningLevel,
      models: providerOption.models.map((modelOption) => ({
        id: modelOption.id,
        modelId: modelOption.modelId,
        name: modelOption.name,
        reasoningLevels: [...modelOption.reasoningLevels],
      })),
    }));
  }, [data.AgentCreateOptions]);
  const computeProviderDefinitionOptions: AgentCreateComputeProviderDefinitionOption[] = useMemo(() => {
    return data.ComputeProviderDefinitions.map((definition) => ({
      id: definition.id,
      isDefault: definition.isDefault,
      label: CompanyHelmComputeProvider.formatDefinitionOptionLabel(definition),
      provider: definition.provider as "daytona" | "e2b",
      templates: definition.templates.map((template) => ({
        computerUse: template.computerUse,
        cpuCount: template.cpuCount,
        diskSpaceGb: template.diskSpaceGb,
        memoryGb: template.memoryGb,
        name: template.name,
        templateId: template.templateId,
      })),
    }));
  }, [data.ComputeProviderDefinitions]);

  useEffect(() => {
    setDetailLabel(agent.name);

    return () => {
      setDetailLabel(null);
    };
  }, [agent.name, setDetailLabel]);

  const selectedProviderOption = agent.modelProviderCredentialId
    ? providerOptions.find((option) => option.id === agent.modelProviderCredentialId) ?? null
    : null;
  const selectedComputeProviderDefinitionOption = agent.defaultComputeProviderDefinitionId
    ? computeProviderDefinitionOptions.find((option) => option.id === agent.defaultComputeProviderDefinitionId) ?? null
    : null;
  const selectedEnvironmentTemplateOption = selectedComputeProviderDefinitionOption?.templates.find((template) => {
    return template.templateId === agent.defaultEnvironmentTemplateId;
  }) ?? null;
  const selectedModelOption = selectedProviderOption && agent.modelProviderCredentialModelId
    ? selectedProviderOption.models.find((option) => option.id === agent.modelProviderCredentialModelId) ?? null
    : null;
  const companyBaseSystemPrompt = data.CompanySettings.baseSystemPrompt;

  const saveAgent = async (patch: {
    defaultComputeProviderDefinitionId?: string;
    defaultEnvironmentTemplateId?: string;
    modelProviderCredentialId?: string;
    modelProviderCredentialModelId?: string;
    name?: string;
    reasoningLevel?: string | null;
    systemPrompt?: string | null;
  }) => {
    const nextProviderCredentialId = patch.modelProviderCredentialId ?? agent.modelProviderCredentialId;
    if (!nextProviderCredentialId) {
      throw new Error("Agent provider is required.");
    }
    const nextComputeProviderDefinitionId = patch.defaultComputeProviderDefinitionId
      ?? agent.defaultComputeProviderDefinitionId;
    if (!nextComputeProviderDefinitionId) {
      throw new Error("Agent environment provider is required.");
    }
    const nextComputeProviderDefinition = computeProviderDefinitionOptions.find((option) => {
      return option.id === nextComputeProviderDefinitionId;
    }) ?? null;
    if (!nextComputeProviderDefinition) {
      throw new Error("Selected environment provider is not available.");
    }
    const nextEnvironmentTemplateId = patch.defaultEnvironmentTemplateId
      ?? (
        patch.defaultComputeProviderDefinitionId === undefined
          ? agent.defaultEnvironmentTemplateId
          : (nextComputeProviderDefinition.templates[0]?.templateId ?? null)
      );
    if (!nextEnvironmentTemplateId) {
      throw new Error("Agent environment template is required.");
    }

    const nextProviderOption = resolveProviderOption(providerOptions, nextProviderCredentialId);
    const nextModelOption = resolveModelOption(
      nextProviderOption,
      patch.modelProviderCredentialModelId ?? agent.modelProviderCredentialModelId,
    );
    if (!nextModelOption) {
      throw new Error("Selected provider does not have any models.");
    }

    const nextReasoningLevel = resolveReasoningLevel(
      nextProviderOption,
      nextModelOption,
      patch.reasoningLevel ?? agent.reasoningLevel,
    );

    await new Promise<void>((resolve, reject) => {
      commitUpdateAgent({
        variables: {
          input: {
            id: agent.id,
            defaultComputeProviderDefinitionId: nextComputeProviderDefinitionId,
            defaultEnvironmentTemplateId: nextEnvironmentTemplateId,
            name: patch.name ?? agent.name,
            modelProviderCredentialId: nextProviderOption.id,
            modelProviderCredentialModelId: nextModelOption.id,
            reasoningLevel: nextReasoningLevel,
            systemPrompt: patch.systemPrompt === undefined
              ? agent.systemPrompt
              : (patch.systemPrompt === "" ? null : patch.systemPrompt),
          },
        },
        onCompleted: (_response, errors) => {
          const errorMessage = String(errors?.[0]?.message || "").trim();
          if (errorMessage) {
            reject(new Error(errorMessage));
            return;
          }

          resolve();
        },
        onError: reject,
      });
    });
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>
            Update the agent name, environment provider, model provider, model, reasoning level,
            and agent prompt override inline. Sessions apply the static CompanyHelm prompt first,
            then the inherited company prompt, then this agent prompt override.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <EditableField
            emptyValueLabel="Unnamed agent"
            fieldType="text"
            label="Name"
            onSave={async (value) => {
              await saveAgent({
                name: value,
              });
            }}
            value={agent.name}
          />

          <EditableField
            displayValue={selectedComputeProviderDefinitionOption?.label ?? agent.defaultComputeProviderDefinitionName ?? null}
            emptyValueLabel="No environment provider selected"
            fieldType="select"
            label="Environment provider"
            onSave={async (value) => {
              await saveAgent({
                defaultComputeProviderDefinitionId: value,
              });
            }}
            options={computeProviderDefinitionOptions.map((option) => ({
              label: option.label,
              value: option.id,
            }))}
            value={agent.defaultComputeProviderDefinitionId}
          />

          <EditableField
            displayValue={selectedEnvironmentTemplateOption?.name ?? agent.environmentTemplate.name}
            emptyValueLabel="No environment template selected"
            fieldType="select"
            label="Environment template"
            onSave={async (value) => {
              await saveAgent({
                defaultEnvironmentTemplateId: value,
              });
            }}
            options={(selectedComputeProviderDefinitionOption?.templates ?? []).map((option) => ({
              label: option.name,
              value: option.templateId,
            }))}
            value={agent.defaultEnvironmentTemplateId}
          />

          <EditableField
            displayValue={selectedProviderOption?.label ?? null}
            emptyValueLabel="No provider selected"
            fieldType="select"
            label="Provider"
            onSave={async (value) => {
              const nextProviderOption = resolveProviderOption(providerOptions, value);
              const nextModelOption = resolveModelOption(nextProviderOption, null);
              await saveAgent({
                modelProviderCredentialId: value,
                modelProviderCredentialModelId: nextModelOption?.id,
                reasoningLevel: resolveReasoningLevel(nextProviderOption, nextModelOption, null),
              });
            }}
            options={providerOptions.map((option) => ({
              label: option.label,
              value: option.id,
            }))}
            value={agent.modelProviderCredentialId}
          />

          <EditableField
            displayValue={selectedModelOption?.name ?? null}
            emptyValueLabel="No model selected"
            fieldType="select"
            label="Model"
            onSave={async (value) => {
              await saveAgent({
                modelProviderCredentialModelId: value,
              });
            }}
            options={(selectedProviderOption?.models ?? []).map((option) => ({
              label: option.name,
              value: option.id,
            }))}
            value={agent.modelProviderCredentialModelId}
          />

          <EditableField
            displayValue={agent.reasoningLevel}
            emptyValueLabel="Not supported by this model"
            fieldType="select"
            label="Reasoning level"
            onSave={async (value) => {
              await saveAgent({
                reasoningLevel: value,
              });
            }}
            options={(selectedModelOption?.reasoningLevels ?? []).map((level) => ({
              label: level,
              value: level,
            }))}
            value={agent.reasoningLevel}
          />

          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Inherited company prompt
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
              {companyBaseSystemPrompt && companyBaseSystemPrompt.length > 0
                ? companyBaseSystemPrompt
                : "No company base prompt configured"}
            </p>
            <p className="mt-3 text-xs/relaxed text-muted-foreground">
              Manage this layer from Settings, on the Agents / AI tab. It is applied before this
              agent prompt override.
            </p>
          </div>

          <EditableField
            emptyValueLabel="No agent-specific prompt override"
            fieldType="textarea"
            label="Agent prompt override"
            onSave={async (value) => {
              await saveAgent({
                systemPrompt: value,
              });
            }}
            readOnlyFormat="markdown"
            value={agent.systemPrompt}
          />
        </CardContent>
      </Card>

      <AgentSecretDefaultsCard
        agentId={agent.id}
        agentSecrets={agentSecrets}
        companySecrets={companySecrets}
      />

      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>
            Future environments for this agent use the selected provider template instead of custom CPU and memory overrides.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Template</p>
            <p className="mt-3 text-sm text-foreground">{agent.environmentTemplate.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{agent.environmentTemplate.templateId}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Resources</p>
            <p className="mt-3 text-sm text-foreground">
              {agent.environmentTemplate.cpuCount} vCPU • {agent.environmentTemplate.memoryGb} GB RAM
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {agent.environmentTemplate.diskSpaceGb} GB disk • Computer use {agent.environmentTemplate.computerUse ? "enabled" : "disabled"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>Metadata for this agent record.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Created</p>
            <p className="mt-3 text-sm text-foreground">{formatTimestamp(agent.createdAt)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Updated</p>
            <p className="mt-3 text-sm text-foreground">{formatTimestamp(agent.updatedAt)}</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export function AgentDetailPage() {
  return (
    <Suspense fallback={<AgentDetailPageFallback />}>
      <AgentDetailPageContent />
    </Suspense>
  );
}
