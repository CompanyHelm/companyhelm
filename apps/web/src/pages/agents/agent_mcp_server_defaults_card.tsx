import { useMemo, useState } from "react";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import { graphql, useMutation } from "react-relay";
import { useToast } from "@/components/toast_provider";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { agentMcpServerDefaultsCardAttachMcpServerToAgentMutation } from "./__generated__/agentMcpServerDefaultsCardAttachMcpServerToAgentMutation.graphql";
import type { agentMcpServerDefaultsCardDetachMcpServerFromAgentMutation } from "./__generated__/agentMcpServerDefaultsCardDetachMcpServerFromAgentMutation.graphql";
import type { AgentCreateMcpServerOption } from "./create_agent_dialog";
import { DefaultAttachmentSection } from "./default_attachment_section";

type AgentMcpServerRecord = {
  description: string | null | undefined;
  id: string;
  name: string;
  url: string;
};

type StoreMcpServerRecord = {
  getDataID(): string;
  getValue(name: string): unknown;
};

interface AgentMcpServerDefaultsCardProps {
  agentId: string;
  agentMcpServers: AgentMcpServerRecord[];
  companyMcpServers: AgentCreateMcpServerOption[];
}

const agentMcpServerDefaultsCardAttachMcpServerToAgentMutationNode = graphql`
  mutation agentMcpServerDefaultsCardAttachMcpServerToAgentMutation($input: AttachMcpServerToAgentInput!) {
    AttachMcpServerToAgent(input: $input) {
      id
      name
      description
      url
      enabled
      callTimeoutMs
      createdAt
      updatedAt
    }
  }
`;

const agentMcpServerDefaultsCardDetachMcpServerFromAgentMutationNode = graphql`
  mutation agentMcpServerDefaultsCardDetachMcpServerFromAgentMutation($input: DetachMcpServerFromAgentInput!) {
    DetachMcpServerFromAgent(input: $input) {
      id
    }
  }
`;

function filterStoreMcpServerRecords(records: ReadonlyArray<unknown>): StoreMcpServerRecord[] {
  return records.filter((record): record is StoreMcpServerRecord => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function"
      && "getValue" in record
      && typeof record.getValue === "function";
  });
}

function sortStoreMcpServerRecords(records: StoreMcpServerRecord[]): StoreMcpServerRecord[] {
  return [...records].sort((left, right) => {
    return String(left.getValue("name") ?? "").localeCompare(String(right.getValue("name") ?? ""));
  });
}

function upsertAgentMcpServerInStore(
  store: RecordSourceSelectorProxy,
  agentId: string,
) {
  const nextServer = store.getRootField("AttachMcpServerToAgent");
  if (!nextServer) {
    return;
  }

  const rootRecord = store.getRoot();
  const fieldArguments = { agentId };
  const currentServers = filterStoreMcpServerRecords(rootRecord.getLinkedRecords("AgentMcpServers", fieldArguments) || []);
  const existingServer = currentServers.find((server) => server.getDataID() === nextServer.getDataID());
  const nextServers = existingServer
    ? currentServers.map((server) => server.getDataID() === nextServer.getDataID() ? nextServer : server)
    : [...currentServers, nextServer];
  rootRecord.setLinkedRecords(sortStoreMcpServerRecords(nextServers), "AgentMcpServers", fieldArguments);
}

function removeAgentMcpServerFromStore(
  store: RecordSourceSelectorProxy,
  agentId: string,
) {
  const deletedServer = store.getRootField("DetachMcpServerFromAgent");
  if (!deletedServer) {
    return;
  }

  const rootRecord = store.getRoot();
  const fieldArguments = { agentId };
  const currentServers = filterStoreMcpServerRecords(rootRecord.getLinkedRecords("AgentMcpServers", fieldArguments) || []);
  rootRecord.setLinkedRecords(
    currentServers.filter((server) => server.getDataID() !== deletedServer.getDataID()),
    "AgentMcpServers",
    fieldArguments,
  );
}

function formatHost(urlValue: string): string {
  try {
    return new URL(urlValue).host;
  } catch {
    return urlValue;
  }
}

export function AgentMcpServerDefaultsCard(props: AgentMcpServerDefaultsCardProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyServerId, setBusyServerId] = useState<string | null>(null);
  const [commitAttachServer, isAttachServerInFlight] = useMutation<agentMcpServerDefaultsCardAttachMcpServerToAgentMutation>(
    agentMcpServerDefaultsCardAttachMcpServerToAgentMutationNode,
  );
  const [commitDetachServer, isDetachServerInFlight] = useMutation<agentMcpServerDefaultsCardDetachMcpServerFromAgentMutation>(
    agentMcpServerDefaultsCardDetachMcpServerFromAgentMutationNode,
  );
  const toast = useToast();

  const attachedServerIds = useMemo(() => {
    return new Set(props.agentMcpServers.map((server) => server.id));
  }, [props.agentMcpServers]);
  const availableServerOptions = useMemo(() => {
    return props.companyMcpServers
      .filter((server) => !attachedServerIds.has(server.id))
      .map((server) => ({
        description: server.description,
        id: server.id,
        label: server.name,
        metaLabel: formatHost(server.url),
      }));
  }, [attachedServerIds, props.companyMcpServers]);
  const isMutating = isAttachServerInFlight || isDetachServerInFlight;

  const attachServer = async (mcpServerId: string) => {
    if (isMutating) {
      return;
    }

    setErrorMessage(null);
    setBusyServerId(mcpServerId);

    try {
      await new Promise<void>((resolve, reject) => {
        commitAttachServer({
          variables: {
            input: {
              agentId: props.agentId,
              mcpServerId,
            },
          },
          updater: (store) => {
            upsertAgentMcpServerInStore(store, props.agentId);
          },
          onCompleted: (_response, errors) => {
            const nextErrorMessage = String(errors?.[0]?.message || "").trim();
            if (nextErrorMessage) {
              reject(new Error(nextErrorMessage));
              return;
            }

            resolve();
          },
          onError: reject,
        });
      });
      toast.showSavedToast();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to attach MCP server.");
    } finally {
      setBusyServerId(null);
    }
  };

  const detachServer = async (mcpServerId: string) => {
    if (isMutating) {
      return;
    }

    setErrorMessage(null);
    setBusyServerId(mcpServerId);

    try {
      await new Promise<void>((resolve, reject) => {
        commitDetachServer({
          variables: {
            input: {
              agentId: props.agentId,
              mcpServerId,
            },
          },
          updater: (store) => {
            removeAgentMcpServerFromStore(store, props.agentId);
          },
          onCompleted: (_response, errors) => {
            const nextErrorMessage = String(errors?.[0]?.message || "").trim();
            if (nextErrorMessage) {
              reject(new Error(nextErrorMessage));
              return;
            }

            resolve();
          },
          onError: reject,
        });
      });
      toast.showSavedToast();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to detach MCP server.");
    } finally {
      setBusyServerId(null);
    }
  };

  return (
    <Card className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader>
        <CardDescription>
          Choose which shared MCP servers should be attached to future sessions created from this agent. MCP tool activation is not wired yet, but these defaults are now managed in the catalog.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <DefaultAttachmentSection
            addLabel="Add default MCP server"
            availableEmptyLabel="All enabled MCP servers already added"
            availableOptions={availableServerOptions}
            busyItemId={busyServerId}
            currentLabel="Current defaults"
            disabled={isMutating}
            emptyStateLabel="No default MCP servers configured for this agent yet."
            onAdd={async (mcpServerId) => {
              await attachServer(mcpServerId);
            }}
            onRemove={async (mcpServerId) => {
              await detachServer(mcpServerId);
            }}
            placeholder="Select an MCP server"
            selectedOptions={props.agentMcpServers.map((server) => ({
              description: server.description,
              id: server.id,
              label: server.name,
              metaLabel: formatHost(server.url),
            }))}
          />
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {errorMessage}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
