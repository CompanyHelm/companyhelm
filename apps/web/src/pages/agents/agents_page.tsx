import { Suspense, useState } from "react";
import { PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { AgentsTable, type AgentsTableRecord } from "./agents_table";
import {
  CreateAgentDialog,
  type AgentCreateProviderOption,
} from "./create_agent_dialog";
import type { agentsPageAddAgentMutation } from "./__generated__/agentsPageAddAgentMutation.graphql";
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
      label
      modelProvider
      models {
        id
        modelId
        name
        reasoningLevels
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

function AgentsPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Configure company agents with a default provider, model, reasoning level, and system prompt.
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
          <AgentsTable agents={[]} isLoading />
        </CardContent>
      </Card>
    </main>
  );
}

function AgentsPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
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
    label: providerOption.label,
    modelProvider: providerOption.modelProvider,
    models: providerOption.models.map((modelOption) => ({
      id: modelOption.id,
      modelId: modelOption.modelId,
      name: modelOption.name,
      reasoningLevels: [...modelOption.reasoningLevels],
    })),
  }));

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Configure company agents with a default provider, model, reasoning level, and system prompt.
            </CardDescription>
          </div>
          <CardAction>
            <Button
              disabled={providerOptions.length === 0}
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

          {providerOptions.length > 0 ? <AgentsTable agents={agents} isLoading={false} /> : null}
        </CardContent>
      </Card>

      <CreateAgentDialog
        errorMessage={isCreateDialogOpen ? errorMessage : null}
        isOpen={isCreateDialogOpen}
        isSaving={isCreateAgentInFlight}
        providerOptions={providerOptions}
        onCreate={async (input) => {
          setErrorMessage(null);

          await new Promise<void>((resolve, reject) => {
            commitAddAgent({
              variables: {
                input,
              },
              updater: (store, response) => {
                const newAgent = response?.AddAgent;
                if (!newAgent) {
                  return;
                }

                const rootRecord = store.getRoot();
                const currentAgents = rootRecord.getLinkedRecords("Agents") || [];
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
