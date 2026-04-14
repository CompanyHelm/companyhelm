import { Suspense, useEffect, useMemo, type ReactNode } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { CompanyHelmComputeProvider } from "@/companyhelm_compute_provider";
import { EditableField } from "@/components/editable_field";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page_tabs";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { cn } from "@/lib/utils";
import { AgentArchivedChatsTab } from "./agent_archived_chats_tab";
import { AgentSecretDefaultsCard } from "./agent_secret_defaults_card";
import { AgentMcpServerDefaultsCard } from "./agent_mcp_server_defaults_card";
import { AgentSkillDefaultsCard } from "./agent_skill_defaults_card";
import type {
  AgentCreateComputeProviderDefinitionOption,
  AgentCreateProviderOption,
  AgentCreateSecretGroupOption,
  AgentCreateSkillGroupOption,
  AgentCreateSkillOption,
  AgentCreateMcpServerOption,
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
    AgentSecretGroups(agentId: $agentId) {
      id
      name
    }
    AgentMcpServers(agentId: $agentId) {
      id
      name
      description
      url
    }
    AgentSkillGroups(agentId: $agentId) {
      id
      name
    }
    AgentSkills(agentId: $agentId) {
      id
      name
      description
      skillGroupId
    }
    Sessions {
      id
      agentId
      associatedTask {
        id
        name
        status
      }
      inferredTitle
      status
      createdAt
      updatedAt
      lastUserMessageAt
      userSetTitle
    }
    AgentCreateOptions {
      id
      modelProviderCredentialId
      isDefault
      label
      modelProvider
      defaultModelId
      defaultReasoningLevel
      models {
        id
        modelProviderCredentialModelId
        modelId
        name
        description
        reasoningSupported
        reasoningLevels
      }
    }
    Secrets {
      id
      name
      description
      envVarName
    }
    SecretGroups {
      id
      name
    }
    McpServers {
      id
      name
      description
      url
      enabled
    }
    SkillGroups {
      id
      name
    }
    Skills {
      id
      name
      description
      skillGroupId
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
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
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
  const providerOption = providerOptions.find((option) => option.modelProviderCredentialId === providerCredentialId);
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
    const exactMatch = providerOption.models.find((option) => option.modelProviderCredentialModelId === modelId);
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

function AgentOverviewSection(props: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="grid gap-4 border-t border-border/60 pt-6 first:border-t-0 first:pt-0">
      <div className="grid gap-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{props.title}</h2>
        <p className="text-sm text-muted-foreground">{props.description}</p>
      </div>
      {props.children}
    </section>
  );
}

function AgentDetailPageContent() {
  const params = useParams({ strict: false }) as { agentId?: string };
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const search = useSearch({ strict: false }) as { tab?: "archived" | "overview" };
  const normalizedAgentId = String(params.agentId || "").trim();
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
  const selectedTab = search.tab === "archived" ? "archived" : "overview";
  const agentSecrets = data.AgentSecrets.map((secret) => ({
    description: secret.description ?? null,
    envVarName: secret.envVarName,
    id: secret.id,
    name: secret.name,
  }));
  const agentSecretGroups = data.AgentSecretGroups.map((secretGroup) => ({
    id: secretGroup.id,
    name: secretGroup.name,
  }));
  const companySecrets = data.Secrets.map((secret) => ({
    description: secret.description ?? null,
    envVarName: secret.envVarName,
    id: secret.id,
    name: secret.name,
  }));
  const companySecretGroups: AgentCreateSecretGroupOption[] = data.SecretGroups.map((secretGroup) => ({
    id: secretGroup.id,
    name: secretGroup.name,
  }));
  const agentMcpServers = data.AgentMcpServers.map((server) => ({
    description: server.description ?? null,
    id: server.id,
    name: server.name,
    url: server.url,
  }));
  const companyMcpServers: AgentCreateMcpServerOption[] = data.McpServers
    .filter((server) => server.enabled)
    .map((server) => ({
      description: server.description ?? null,
      id: server.id,
      name: server.name,
      url: server.url,
    }));
  const agentSkillGroups = data.AgentSkillGroups.map((skillGroup) => ({
    id: skillGroup.id,
    name: skillGroup.name,
  }));
  const agentSkills = data.AgentSkills.map((skill) => ({
    description: skill.description,
    id: skill.id,
    name: skill.name,
    skillGroupId: skill.skillGroupId ?? null,
  }));
  const companySkillGroups: AgentCreateSkillGroupOption[] = data.SkillGroups.map((skillGroup) => ({
    id: skillGroup.id,
    name: skillGroup.name,
  }));
  const companySkills: AgentCreateSkillOption[] = data.Skills.map((skill) => ({
    description: skill.description,
    id: skill.id,
    name: skill.name,
    skillGroupId: skill.skillGroupId ?? null,
  }));
  const providerOptions: AgentCreateProviderOption[] = useMemo(() => {
    return data.AgentCreateOptions.map((providerOption) => ({
      id: providerOption.id,
      modelProviderCredentialId: providerOption.modelProviderCredentialId,
      isDefault: providerOption.isDefault,
      label: providerOption.label,
      modelProvider: providerOption.modelProvider,
      defaultModelId: providerOption.defaultModelId ?? null,
      defaultReasoningLevel: providerOption.defaultReasoningLevel ?? null,
      models: providerOption.models.map((modelOption) => ({
        id: modelOption.id,
        modelProviderCredentialModelId: modelOption.modelProviderCredentialModelId,
        modelId: modelOption.modelId,
        name: modelOption.name,
        reasoningSupported: modelOption.reasoningSupported,
        reasoningLevels: [...modelOption.reasoningLevels],
      })),
    }));
  }, [data.AgentCreateOptions]);
  const computeProviderDefinitionOptions: AgentCreateComputeProviderDefinitionOption[] = useMemo(() => {
    return data.ComputeProviderDefinitions.map((definition) => ({
      id: definition.id,
      isDefault: definition.isDefault,
      label: CompanyHelmComputeProvider.formatDefinitionOptionLabel(definition),
      provider: definition.provider as "e2b",
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
    ? providerOptions.find((option) => option.modelProviderCredentialId === agent.modelProviderCredentialId) ?? null
    : null;
  const selectedComputeProviderDefinitionOption = agent.defaultComputeProviderDefinitionId
    ? computeProviderDefinitionOptions.find((option) => option.id === agent.defaultComputeProviderDefinitionId) ?? null
    : null;
  const selectedModelOption = selectedProviderOption && agent.modelProviderCredentialModelId
    ? selectedProviderOption.models.find(
      (option) => option.modelProviderCredentialModelId === agent.modelProviderCredentialModelId,
    ) ?? null
    : null;
  const archivedChats = data.Sessions.filter((session) => {
    return session.agentId === agent.id && session.status.trim().toLowerCase() === "archived";
  }).map((session) => {
    return {
      ...session,
      associatedTask: session.associatedTask ?? null,
      inferredTitle: session.inferredTitle ?? null,
      lastUserMessageAt: session.lastUserMessageAt ?? null,
      userSetTitle: session.userSetTitle ?? null,
    };
  });
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
            modelProviderCredentialId: nextProviderOption.modelProviderCredentialId,
            modelProviderCredentialModelId: nextModelOption.modelProviderCredentialModelId,
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
      <PageTabs
        items={[
          {
            key: "overview" as const,
            label: "Overview",
          },
          {
            key: "archived" as const,
            label: "Archived chats",
          },
        ]}
        onSelect={(tab) => {
          void navigate({
            params: {
              agentId: agent.id,
              organizationSlug,
            },
            search: {
              tab,
            },
            to: OrganizationPath.route("/agents/$agentId"),
          });
        }}
        selectedKey={selectedTab}
      />

      {selectedTab === "overview" ? (
        <>
          <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
            <CardContent className="grid gap-8">
              <AgentOverviewSection
                description="Core model configuration for this agent. Keep these four settings together so the runtime profile is easy to scan."
                title="General"
              >
                <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
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
                    variant="plain"
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
                        modelProviderCredentialId: nextProviderOption.modelProviderCredentialId,
                        modelProviderCredentialModelId: nextModelOption?.modelProviderCredentialModelId,
                        reasoningLevel: resolveReasoningLevel(nextProviderOption, nextModelOption, null),
                      });
                    }}
                    options={providerOptions.map((option) => ({
                      label: option.label,
                      value: option.id,
                    }))}
                    value={selectedProviderOption?.id ?? ""}
                    variant="plain"
                  />

                  <EditableField
                    displayValue={selectedModelOption?.name ?? null}
                    emptyValueLabel="No model selected"
                    fieldType="select"
                    label="Model"
                    onSave={async (value) => {
                      const nextModelOption = selectedProviderOption?.models.find((option) => option.id === value) ?? null;
                      if (!nextModelOption) {
                        throw new Error("Selected model is not available.");
                      }

                      await saveAgent({
                        modelProviderCredentialModelId: nextModelOption.modelProviderCredentialModelId,
                      });
                    }}
                    options={(selectedProviderOption?.models ?? []).map((option) => ({
                      label: option.name,
                      value: option.id,
                    }))}
                    value={selectedModelOption?.id ?? null}
                    variant="plain"
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
                    value={agent.reasoningLevel ?? null}
                    variant="plain"
                  />
                </div>
              </AgentOverviewSection>

              <AgentOverviewSection
                description="The company prompt is applied first, then the agent-specific override. Edit the agent instructions here without leaving the page."
                title="Instructions"
              >
                <div className="grid gap-5">
                  <div className="grid gap-2">
                    <p className="text-sm font-medium text-muted-foreground">Company instructions</p>
                    <div className="rounded-lg bg-muted/20 px-4 py-3">
                      <p className="whitespace-pre-wrap text-sm text-foreground">
                        {companyBaseSystemPrompt && companyBaseSystemPrompt.length > 0
                          ? companyBaseSystemPrompt
                          : "No company base prompt configured"}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Manage this layer from Settings, on the Agents / AI tab.
                      </p>
                    </div>
                  </div>

                  <EditableField
                    emptyValueLabel="No agent-specific prompt override"
                    fieldType="textarea"
                    label="Agent instructions"
                    onSave={async (value) => {
                      await saveAgent({
                        systemPrompt: value,
                      });
                    }}
                    readOnlyFormat="markdown"
                    value={agent.systemPrompt ?? null}
                    variant="plain"
                  />
                </div>
              </AgentOverviewSection>

              <AgentOverviewSection
                description="Pick the compute provider, then choose the template card that best matches the environment shape this agent should use by default."
                title="Environment"
              >
                <div className="grid gap-5">
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
                    value={agent.defaultComputeProviderDefinitionId ?? null}
                    variant="plain"
                  />

                  {(selectedComputeProviderDefinitionOption?.templates ?? []).length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {(selectedComputeProviderDefinitionOption?.templates ?? []).map((template) => {
                        const isSelected = template.templateId === agent.defaultEnvironmentTemplateId;

                        return (
                          <button
                            key={template.templateId}
                            className={cn(
                              "rounded-xl border px-4 py-4 text-left transition",
                              isSelected
                                ? "border-foreground bg-muted/30"
                                : "border-border/60 bg-card/40 hover:border-border hover:bg-muted/20",
                            )}
                            onClick={() => {
                              if (isSelected) {
                                return;
                              }

                              void saveAgent({
                                defaultEnvironmentTemplateId: template.templateId,
                              });
                            }}
                            type="button"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">{template.name}</p>
                                <p className="mt-1 truncate text-sm text-muted-foreground">{template.templateId}</p>
                              </div>
                              {isSelected ? (
                                <span className="shrink-0 text-sm font-medium text-foreground">Current</span>
                              ) : null}
                            </div>

                            <div className="mt-4 grid gap-1.5 text-sm text-muted-foreground">
                              <p>{template.cpuCount} vCPU • {template.memoryGb} GB RAM</p>
                              <p>{template.diskSpaceGb} GB disk</p>
                              <p>Computer use {template.computerUse ? "enabled" : "disabled"}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                      No templates are available for this environment provider.
                    </div>
                  )}
                </div>
              </AgentOverviewSection>

              <AgentOverviewSection
                description="Record timestamps for this agent definition."
                title="Metadata"
              >
                <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
                  <div className="grid gap-2">
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="text-sm text-foreground">{formatTimestamp(agent.createdAt)}</p>
                  </div>
                  <div className="grid gap-2">
                    <p className="text-sm font-medium text-muted-foreground">Updated</p>
                    <p className="text-sm text-foreground">{formatTimestamp(agent.updatedAt)}</p>
                  </div>
                </div>
              </AgentOverviewSection>
            </CardContent>
          </Card>

          <AgentSecretDefaultsCard
            agentId={agent.id}
            agentSecretGroups={agentSecretGroups}
            agentSecrets={agentSecrets}
            companySecretGroups={companySecretGroups}
            companySecrets={companySecrets}
          />

          <AgentSkillDefaultsCard
            agentId={agent.id}
            agentSkillGroups={agentSkillGroups}
            agentSkills={agentSkills}
            companySkillGroups={companySkillGroups}
            companySkills={companySkills}
          />

          <AgentMcpServerDefaultsCard
            agentId={agent.id}
            agentMcpServers={agentMcpServers}
            companyMcpServers={companyMcpServers}
          />
        </>
      ) : (
        <AgentArchivedChatsTab sessions={archivedChats} />
      )}
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
