import { Suspense, useEffect, useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { EditableAgentField } from "./editable_agent_field";
import type { AgentCreateProviderOption } from "./create_agent_dialog";
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
      reasoningLevel
      systemPrompt
      createdAt
      updatedAt
    }
    AgentCreateOptions {
      id
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
  const providerOptions: AgentCreateProviderOption[] = useMemo(() => {
    return data.AgentCreateOptions.map((providerOption) => ({
      id: providerOption.id,
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

  useEffect(() => {
    setDetailLabel(agent.name);

    return () => {
      setDetailLabel(null);
    };
  }, [agent.name, setDetailLabel]);

  const selectedProviderOption = agent.modelProviderCredentialId
    ? providerOptions.find((option) => option.id === agent.modelProviderCredentialId) ?? null
    : null;
  const selectedModelOption = selectedProviderOption && agent.modelProviderCredentialModelId
    ? selectedProviderOption.models.find((option) => option.id === agent.modelProviderCredentialModelId) ?? null
    : null;

  const saveAgent = async (patch: {
    modelProviderCredentialId?: string;
    modelProviderCredentialModelId?: string;
    name?: string;
    reasoningLevel?: string | null;
    systemPrompt?: string;
  }) => {
    const nextProviderCredentialId = patch.modelProviderCredentialId ?? agent.modelProviderCredentialId;
    if (!nextProviderCredentialId) {
      throw new Error("Agent provider is required.");
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
            name: patch.name ?? agent.name,
            modelProviderCredentialId: nextProviderOption.id,
            modelProviderCredentialModelId: nextModelOption.id,
            reasoningLevel: nextReasoningLevel,
            systemPrompt: patch.systemPrompt ?? (agent.systemPrompt ?? ""),
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
            Update the agent name, provider, model, reasoning level, and system prompt inline.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <EditableAgentField
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

          <EditableAgentField
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

          <EditableAgentField
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

          <EditableAgentField
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

          <EditableAgentField
            emptyValueLabel="No system prompt configured"
            fieldType="textarea"
            label="System prompt"
            onSave={async (value) => {
              await saveAgent({
                systemPrompt: value,
              });
            }}
            value={agent.systemPrompt}
          />
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
