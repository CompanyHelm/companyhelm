import { Suspense, useState } from "react";
import { PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { CompanyHelmComputeProvider } from "@/companyhelm_compute_provider";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { AgentsTable, type AgentsTableRecord } from "./agents_table";
import {
  CreateAgentDialog,
  type AgentCreateComputeProviderDefinitionOption,
  type AgentCreateSecretOption,
  type AgentCreateSkillGroupOption,
  type AgentCreateSkillOption,
  type AgentCreateProviderOption,
} from "./create_agent_dialog";
import type { agentsPageAddAgentMutation } from "./__generated__/agentsPageAddAgentMutation.graphql";
import type { agentsPageDeleteAgentMutation } from "./__generated__/agentsPageDeleteAgentMutation.graphql";
import type { agentsPageQuery } from "./__generated__/agentsPageQuery.graphql";

const agentsPageQueryNode = graphql`
  query agentsPageQuery {
    Agents {
      id
      name
      modelProvider
      modelName
      reasoningLevel
      systemPrompt
      createdAt
      updatedAt
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

const agentsPageAddAgentMutationNode = graphql`
  mutation agentsPageAddAgentMutation($input: AddAgentInput!) {
    AddAgent(input: $input) {
      id
      name
      modelProvider
      modelName
      reasoningLevel
      systemPrompt
      createdAt
      updatedAt
    }
  }
`;

const agentsPageDeleteAgentMutationNode = graphql`
  mutation agentsPageDeleteAgentMutation($input: DeleteAgentInput!) {
    DeleteAgent(input: $input) {
      id
    }
  }
`;

function AgentsPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Configure company agents with a default environment provider, model provider, model, reasoning level, system prompt, and optional advanced defaults.
            </CardDescription>
          </div>
          <CardAction>
            <Button disabled size="sm">
              <PlusIcon />
              Create agent
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <AgentsTable
            agents={[]}
            deletingAgentId={null}
            isLoading
            onDelete={async () => undefined}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function AgentsPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const data = useLazyLoadQuery<agentsPageQuery>(
    agentsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitAddAgent, isCreateAgentInFlight] = useMutation<agentsPageAddAgentMutation>(
    agentsPageAddAgentMutationNode,
  );
  const [commitDeleteAgent, isDeleteAgentInFlight] = useMutation<agentsPageDeleteAgentMutation>(
    agentsPageDeleteAgentMutationNode,
  );
  const agents: AgentsTableRecord[] = data.Agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    modelProvider: agent.modelProvider,
    modelName: agent.modelName,
    reasoningLevel: agent.reasoningLevel,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  }));
  const providerOptions: AgentCreateProviderOption[] = data.AgentCreateOptions.map((providerOption) => ({
    id: providerOption.id,
    modelProviderCredentialId: providerOption.modelProviderCredentialId,
    isDefault: providerOption.isDefault,
    label: providerOption.label,
    modelProvider: providerOption.modelProvider,
    defaultModelId: providerOption.defaultModelId,
    defaultReasoningLevel: providerOption.defaultReasoningLevel,
    models: providerOption.models.map((modelOption) => ({
      id: modelOption.id,
      modelProviderCredentialModelId: modelOption.modelProviderCredentialModelId,
      modelId: modelOption.modelId,
      name: modelOption.name,
      reasoningSupported: modelOption.reasoningSupported,
      reasoningLevels: [...modelOption.reasoningLevels],
    })),
  }));
  const secretOptions: AgentCreateSecretOption[] = data.Secrets.map((secret) => ({
    description: secret.description,
    envVarName: secret.envVarName,
    id: secret.id,
    name: secret.name,
  }));
  const skillGroupOptions: AgentCreateSkillGroupOption[] = data.SkillGroups.map((skillGroup) => ({
    id: skillGroup.id,
    name: skillGroup.name,
  }));
  const skillOptions: AgentCreateSkillOption[] = data.Skills.map((skill) => ({
    description: skill.description,
    id: skill.id,
    name: skill.name,
    skillGroupId: skill.skillGroupId,
  }));
  const computeProviderDefinitionOptions: AgentCreateComputeProviderDefinitionOption[] =
    data.ComputeProviderDefinitions.map((definition) => ({
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
  const filterStoreRecords = (
    records: ReadonlyArray<unknown>,
  ): Array<{ getDataID(): string }> => {
    return records.filter((record): record is { getDataID(): string } => {
      return typeof record === "object"
        && record !== null
        && "getDataID" in record
        && typeof record.getDataID === "function";
    });
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Configure company agents with a default environment provider, model provider, model, reasoning level, system prompt, and optional advanced defaults.
            </CardDescription>
          </div>
          <CardAction>
            <Button
              disabled={providerOptions.length === 0 || computeProviderDefinitionOptions.length === 0}
              onClick={() => {
                setCreateDialogOpen(true);
              }}
              size="sm"
            >
              <PlusIcon />
              Create agent
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage && !isCreateDialogOpen ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {providerOptions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No provider models available</p>
              <p className="mt-2 text-xs/relaxed text-muted-foreground">
                Add an LLM credential and refresh its models before creating an agent.
              </p>
            </div>
          ) : null}

          {computeProviderDefinitionOptions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No compute providers available</p>
              <p className="mt-2 text-xs/relaxed text-muted-foreground">
                Add a compute provider definition before assigning an environment backend to an agent.
              </p>
            </div>
          ) : null}

          <AgentsTable
            agents={agents}
            deletingAgentId={deletingAgentId}
            isLoading={false}
            onDelete={async (agentId) => {
              if (isDeleteAgentInFlight) {
                return;
              }

              setErrorMessage(null);
              setDeletingAgentId(agentId);

              await new Promise<void>((resolve, reject) => {
                commitDeleteAgent({
                  variables: {
                    input: {
                      id: agentId,
                    },
                  },
                  updater: (store) => {
                    const deletedAgent = store.getRootField("DeleteAgent");
                    if (!deletedAgent) {
                      return;
                    }

                    const deletedId = deletedAgent.getDataID();
                    const rootRecord = store.getRoot();
                    const currentAgents = filterStoreRecords(rootRecord.getLinkedRecords("Agents") || []);
                    rootRecord.setLinkedRecords(
                      currentAgents.filter((record) => record.getDataID() !== deletedId),
                      "Agents",
                    );
                  },
                  onCompleted: (_response, errors) => {
                    const nextErrorMessage = errors?.[0]?.message;
                    if (nextErrorMessage) {
                      reject(new Error(nextErrorMessage));
                      return;
                    }

                    resolve();
                  },
                  onError: reject,
                });
              }).catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : "Failed to delete agent.");
              });

              setDeletingAgentId(null);
            }}
          />
        </CardContent>
      </Card>

      <CreateAgentDialog
        computeProviderDefinitionOptions={computeProviderDefinitionOptions}
        errorMessage={isCreateDialogOpen ? errorMessage : null}
        isOpen={isCreateDialogOpen}
        isSaving={isCreateAgentInFlight}
        providerOptions={providerOptions}
        secretOptions={secretOptions}
        skillGroupOptions={skillGroupOptions}
        skillOptions={skillOptions}
        onCreate={async (input) => {
          setErrorMessage(null);

          await new Promise<void>((resolve, reject) => {
            commitAddAgent({
              variables: {
                input,
              },
              updater: (store) => {
                const newAgent = store.getRootField("AddAgent");
                if (!newAgent) {
                  return;
                }

                const rootRecord = store.getRoot();
                const currentAgents = filterStoreRecords(rootRecord.getLinkedRecords("Agents") || []);
                rootRecord.setLinkedRecords([newAgent, ...currentAgents], "Agents");
              },
              onCompleted: (_response, errors) => {
                const nextErrorMessage = errors?.[0]?.message;
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                setCreateDialogOpen(false);
                resolve();
              },
              onError: reject,
            });
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to create agent.");
          });
        }}
        onOpenChange={setCreateDialogOpen}
      />
    </main>
  );
}

export function AgentsPage() {
  return (
    <Suspense fallback={<AgentsPageFallback />}>
      <AgentsPageContent />
    </Suspense>
  );
}
