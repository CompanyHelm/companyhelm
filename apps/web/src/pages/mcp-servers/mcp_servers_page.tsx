import { Suspense, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import { PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useFeatureFlags } from "@/contextes/feature_flag_context";
import { McpServerDialog, type EditableMcpServerRecord } from "./mcp_server_dialog";
import { McpServersTable, type McpServersTableRecord } from "./mcp_servers_table";
import type {
  CreateMcpServerInput,
  mcpServersPageCreateMutation,
} from "./__generated__/mcpServersPageCreateMutation.graphql";
import type { mcpServersPageDeleteMutation } from "./__generated__/mcpServersPageDeleteMutation.graphql";
import type { mcpServersPageQuery } from "./__generated__/mcpServersPageQuery.graphql";
import type {
  UpdateMcpServerInput,
  mcpServersPageUpdateMutation,
} from "./__generated__/mcpServersPageUpdateMutation.graphql";

const mcpServersPageQueryNode = graphql`
  query mcpServersPageQuery {
    McpServers {
      id
      name
      description
      url
      headersText
      callTimeoutMs
      enabled
      createdAt
      updatedAt
    }
  }
`;

const mcpServersPageCreateMutationNode = graphql`
  mutation mcpServersPageCreateMutation($input: CreateMcpServerInput!) {
    CreateMcpServer(input: $input) {
      id
      name
      description
      url
      headersText
      callTimeoutMs
      enabled
      createdAt
      updatedAt
    }
  }
`;

const mcpServersPageUpdateMutationNode = graphql`
  mutation mcpServersPageUpdateMutation($input: UpdateMcpServerInput!) {
    UpdateMcpServer(input: $input) {
      id
      name
      description
      url
      headersText
      callTimeoutMs
      enabled
      createdAt
      updatedAt
    }
  }
`;

const mcpServersPageDeleteMutationNode = graphql`
  mutation mcpServersPageDeleteMutation($input: DeleteMcpServerInput!) {
    DeleteMcpServer(input: $input) {
      id
    }
  }
`;

type StoreMcpServerRecord = {
  getDataID(): string;
};

function filterStoreMcpServerRecords(records: ReadonlyArray<unknown>): StoreMcpServerRecord[] {
  return records.filter((record): record is StoreMcpServerRecord => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function";
  });
}

function upsertMcpServerInStore(
  store: RecordSourceSelectorProxy,
  rootFieldName: "CreateMcpServer" | "UpdateMcpServer",
) {
  const nextServer = store.getRootField(rootFieldName);
  if (!nextServer) {
    return;
  }

  const rootRecord = store.getRoot();
  const currentServers = filterStoreMcpServerRecords(rootRecord.getLinkedRecords("McpServers") || []);
  const existingIndex = currentServers.findIndex((record) => record.getDataID() === nextServer.getDataID());
  if (existingIndex >= 0) {
    const nextServers = [...currentServers];
    nextServers[existingIndex] = nextServer;
    rootRecord.setLinkedRecords(nextServers, "McpServers");
    return;
  }

  rootRecord.setLinkedRecords([nextServer, ...currentServers], "McpServers");
}

function removeMcpServerFromStore(
  store: RecordSourceSelectorProxy,
) {
  const deletedServer = store.getRootField("DeleteMcpServer");
  if (!deletedServer) {
    return;
  }

  const rootRecord = store.getRoot();
  const currentServers = filterStoreMcpServerRecords(rootRecord.getLinkedRecords("McpServers") || []);
  rootRecord.setLinkedRecords(
    currentServers.filter((record) => record.getDataID() !== deletedServer.getDataID()),
    "McpServers",
  );
}

function getRelayErrorMessage(errors: ReadonlyArray<{ message?: string | null }> | null | undefined): string | null {
  const message = String(errors?.[0]?.message ?? "").trim();
  return message.length > 0 ? message : null;
}

function McpServersPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Manage shared remote HTTP MCP servers that agents can attach as defaults. CompanyHelm stores request headers with each server definition and does not activate agent tooling yet.
            </CardDescription>
          </div>
          <CardAction>
            <Button disabled size="sm">
              <PlusIcon />
              Add MCP server
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <McpServersTable isLoading mcpServers={[]} onSelect={() => undefined} />
        </CardContent>
      </Card>
    </main>
  );
}

function McpServersPageDisabledState() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              MCP Servers is disabled in this browser. Enable the
              <span className="mx-1 font-medium text-foreground">MCP servers</span>
              feature flag to access this page.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Link
            className="inline-flex h-6 items-center rounded-md border border-border px-2 text-xs font-medium text-foreground transition hover:bg-input/50"
            to="/flags"
          >
            Open feature flags
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

function McpServersPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);
  const data = useLazyLoadQuery<mcpServersPageQuery>(
    mcpServersPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateServer, isCreateServerInFlight] = useMutation<mcpServersPageCreateMutation>(
    mcpServersPageCreateMutationNode,
  );
  const [commitUpdateServer, isUpdateServerInFlight] = useMutation<mcpServersPageUpdateMutation>(
    mcpServersPageUpdateMutationNode,
  );
  const [commitDeleteServer, isDeleteServerInFlight] = useMutation<mcpServersPageDeleteMutation>(
    mcpServersPageDeleteMutationNode,
  );
  const mcpServers: McpServersTableRecord[] = data.McpServers.map((server) => ({
    callTimeoutMs: server.callTimeoutMs,
    createdAt: server.createdAt,
    description: server.description ?? null,
    enabled: server.enabled,
    headersText: server.headersText,
    id: server.id,
    name: server.name,
    updatedAt: server.updatedAt,
    url: server.url,
  }));
  const selectedServer: EditableMcpServerRecord | null = mcpServers.find((server) => server.id === selectedServerId) ?? null;
  const isSaving = isCreateServerInFlight || isUpdateServerInFlight;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Manage shared remote HTTP MCP servers that agents can attach as defaults. CompanyHelm stores request headers with each server definition and does not activate agent tooling yet.
            </CardDescription>
          </div>
          <CardAction>
            <Button
              onClick={() => {
                setSelectedServerId(null);
                setErrorMessage(null);
                setDialogOpen(true);
              }}
              size="sm"
            >
              <PlusIcon />
              Add MCP server
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage && !isDialogOpen ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <McpServersTable
            isLoading={false}
            mcpServers={mcpServers}
            onSelect={(serverId) => {
              setSelectedServerId(serverId);
              setErrorMessage(null);
              setDialogOpen(true);
            }}
          />
        </CardContent>
      </Card>

      <McpServerDialog
        deletingServerId={deletingServerId}
        errorMessage={isDialogOpen ? errorMessage : null}
        isOpen={isDialogOpen}
        isSaving={isSaving}
        onDelete={async (serverId) => {
          if (isDeleteServerInFlight) {
            return;
          }

          setErrorMessage(null);
          setDeletingServerId(serverId);

          await new Promise<void>((resolve, reject) => {
            commitDeleteServer({
              variables: {
                input: {
                  id: serverId,
                },
              },
              updater: (store) => {
                removeMcpServerFromStore(store);
              },
              onCompleted: (_response, errors) => {
                const nextErrorMessage = getRelayErrorMessage(errors);
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                setDialogOpen(false);
                setSelectedServerId(null);
                resolve();
              },
              onError: reject,
            });
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to delete MCP server.");
          });

          setDeletingServerId(null);
        }}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedServerId(null);
          }
        }}
        onSave={async (input) => {
          setErrorMessage(null);

          await new Promise<void>((resolve, reject) => {
            if ("id" in input) {
              const updateInput: UpdateMcpServerInput = input;
              commitUpdateServer({
                variables: {
                  input: updateInput,
                },
                updater: (store) => {
                  upsertMcpServerInStore(store, "UpdateMcpServer");
                },
                onCompleted: (_response, errors) => {
                  const nextErrorMessage = getRelayErrorMessage(errors);
                  if (nextErrorMessage) {
                    reject(new Error(nextErrorMessage));
                    return;
                  }

                  setDialogOpen(false);
                  setSelectedServerId(null);
                  resolve();
                },
                onError: reject,
              });
              return;
            }

            const createInput: CreateMcpServerInput = input;
            commitCreateServer({
              variables: {
                input: createInput,
              },
              updater: (store) => {
                upsertMcpServerInStore(store, "CreateMcpServer");
              },
              onCompleted: (_response, errors) => {
                const nextErrorMessage = getRelayErrorMessage(errors);
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                setDialogOpen(false);
                setSelectedServerId(null);
                resolve();
              },
              onError: reject,
            });
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to save MCP server.");
          });
        }}
        server={selectedServer}
      />
    </main>
  );
}

export function McpServersPage() {
  const featureFlags = useFeatureFlags();
  if (!featureFlags.isEnabled("mcp_servers")) {
    return <McpServersPageDisabledState />;
  }

  return (
    <Suspense fallback={<McpServersPageFallback />}>
      <McpServersPageContent />
    </Suspense>
  );
}
