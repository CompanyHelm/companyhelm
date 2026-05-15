import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import { PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { AgentAssignmentDialog, type AgentAssignmentResource } from "@/components/agent_assignment_dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/toast_provider";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { McpServerDialog, type EditableMcpServerRecord } from "./mcp_server_dialog";
import { McpServersTable, type McpServersTableRecord } from "./mcp_servers_table";
import type { mcpServersPageAttachMcpServerToAgentMutation } from "./__generated__/mcpServersPageAttachMcpServerToAgentMutation.graphql";
import type { mcpServersPageConnectClientCredentialsMutation } from "./__generated__/mcpServersPageConnectClientCredentialsMutation.graphql";
import type {
  CreateMcpServerInput,
  mcpServersPageCreateMutation,
} from "./__generated__/mcpServersPageCreateMutation.graphql";
import type { mcpServersPageDeleteMutation } from "./__generated__/mcpServersPageDeleteMutation.graphql";
import type { mcpServersPageDisconnectOauthMutation } from "./__generated__/mcpServersPageDisconnectOauthMutation.graphql";
import type { mcpServersPageQuery } from "./__generated__/mcpServersPageQuery.graphql";
import type { mcpServersPageStartOauthMutation } from "./__generated__/mcpServersPageStartOauthMutation.graphql";
import type {
  UpdateMcpServerInput,
  mcpServersPageUpdateMutation,
} from "./__generated__/mcpServersPageUpdateMutation.graphql";

const mcpServersPageQueryNode = graphql`
  query mcpServersPageQuery {
    Agents {
      id
      name
    }
    McpServers {
      id
      name
      description
      url
      authType
      headersText
      callTimeoutMs
      enabled
      oauthClientId
      oauthConnectionStatus
      oauthGrantedScopes
      oauthLastError
      oauthRequestedScopes
      lastValidationStatus
      lastValidationError
      lastValidationToolCount
      lastValidatedAt
      createdAt
      updatedAt
    }
  }
`;

const mcpServersPageAttachMcpServerToAgentMutationNode = graphql`
  mutation mcpServersPageAttachMcpServerToAgentMutation($input: AttachMcpServerToAgentInput!) {
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

const mcpServersPageCreateMutationNode = graphql`
  mutation mcpServersPageCreateMutation($input: CreateMcpServerInput!) {
    CreateMcpServer(input: $input) {
      id
      name
      description
      url
      authType
      headersText
      callTimeoutMs
      enabled
      oauthClientId
      oauthConnectionStatus
      oauthGrantedScopes
      oauthLastError
      oauthRequestedScopes
      lastValidationStatus
      lastValidationError
      lastValidationToolCount
      lastValidatedAt
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
      authType
      headersText
      callTimeoutMs
      enabled
      oauthClientId
      oauthConnectionStatus
      oauthGrantedScopes
      oauthLastError
      oauthRequestedScopes
      lastValidationStatus
      lastValidationError
      lastValidationToolCount
      lastValidatedAt
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

const mcpServersPageStartOauthMutationNode = graphql`
  mutation mcpServersPageStartOauthMutation($input: StartMcpServerOAuthInput!) {
    StartMcpServerOAuth(input: $input) {
      authorizationUrl
    }
  }
`;

const mcpServersPageConnectClientCredentialsMutationNode = graphql`
  mutation mcpServersPageConnectClientCredentialsMutation(
    $input: ConnectMcpServerOAuthClientCredentialsInput!
  ) {
    ConnectMcpServerOAuthClientCredentials(input: $input) {
      id
      name
      description
      url
      authType
      headersText
      callTimeoutMs
      enabled
      oauthClientId
      oauthConnectionStatus
      oauthGrantedScopes
      oauthLastError
      oauthRequestedScopes
      lastValidationStatus
      lastValidationError
      lastValidationToolCount
      lastValidatedAt
      createdAt
      updatedAt
    }
  }
`;

const mcpServersPageDisconnectOauthMutationNode = graphql`
  mutation mcpServersPageDisconnectOauthMutation($input: DisconnectMcpServerOAuthInput!) {
    DisconnectMcpServerOAuth(input: $input) {
      id
      name
      description
      url
      authType
      headersText
      callTimeoutMs
      enabled
      oauthClientId
      oauthConnectionStatus
      oauthGrantedScopes
      oauthLastError
      oauthRequestedScopes
      lastValidationStatus
      lastValidationError
      lastValidationToolCount
      lastValidatedAt
      createdAt
      updatedAt
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
  rootFieldName:
    | "ConnectMcpServerOAuthClientCredentials"
    | "CreateMcpServer"
    | "DisconnectMcpServerOAuth"
    | "UpdateMcpServer",
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

function normalizeAuthType(value: string): EditableMcpServerRecord["authType"] {
  if (
    value === "none"
    || value === "authorization_header"
    || value === "oauth_client_credentials"
    || value === "oauth_authorization_code"
  ) {
    return value;
  }

  return "none";
}

function normalizeOauthConnectionStatus(value: string | null | undefined): EditableMcpServerRecord["oauthConnectionStatus"] {
  if (value === "connected" || value === "error" || value === "not_connected" || value === "reauth_required") {
    return value;
  }

  return null;
}

function normalizeValidationStatus(value: string | null | undefined): McpServersTableRecord["lastValidationStatus"] {
  if (
    value === "unknown"
    || value === "ok"
    || value === "auth_error"
    || value === "network_error"
    || value === "protocol_error"
    || value === "server_error"
  ) {
    return value;
  }

  return "unknown";
}

function McpServersPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Manage shared remote HTTP MCP servers that agents can attach as defaults. CompanyHelm supports no auth, manual Authorization headers, OAuth client credentials, and OAuth authorization code flows.
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

function McpServersPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const search = useSearch({ strict: false }) as { assignMcpServerId?: string };
  const toast = useToast();
  const [assignmentErrorMessage, setAssignmentErrorMessage] = useState<string | null>(null);
  const [assignmentResources, setAssignmentResources] = useState<AgentAssignmentResource[]>([]);
  const [dismissedAssignmentServerId, setDismissedAssignmentServerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isAssigningMcpServers, setAssigningMcpServers] = useState(false);
  const [isAssignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const assignmentDialogCanCloseRef = useRef(true);
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
  const [commitAttachMcpServerToAgent] = useMutation<mcpServersPageAttachMcpServerToAgentMutation>(
    mcpServersPageAttachMcpServerToAgentMutationNode,
  );
  const [commitUpdateServer, isUpdateServerInFlight] = useMutation<mcpServersPageUpdateMutation>(
    mcpServersPageUpdateMutationNode,
  );
  const [commitDeleteServer, isDeleteServerInFlight] = useMutation<mcpServersPageDeleteMutation>(
    mcpServersPageDeleteMutationNode,
  );
  const [commitStartOauth, isStartOauthInFlight] = useMutation<mcpServersPageStartOauthMutation>(
    mcpServersPageStartOauthMutationNode,
  );
  const [commitConnectClientCredentials, isConnectClientCredentialsInFlight] =
    useMutation<mcpServersPageConnectClientCredentialsMutation>(mcpServersPageConnectClientCredentialsMutationNode);
  const [commitDisconnectOauth, isDisconnectOauthInFlight] =
    useMutation<mcpServersPageDisconnectOauthMutation>(mcpServersPageDisconnectOauthMutationNode);
  const agents = useMemo(() => {
    return [...data.Agents]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
      }));
  }, [data.Agents]);
  const mcpServers: McpServersTableRecord[] = data.McpServers.map((server) => ({
    authType: normalizeAuthType(server.authType),
    callTimeoutMs: server.callTimeoutMs,
    createdAt: server.createdAt,
    description: server.description ?? null,
    enabled: server.enabled,
    headersText: server.headersText,
    id: server.id,
    lastValidatedAt: server.lastValidatedAt ?? null,
    lastValidationError: server.lastValidationError ?? null,
    lastValidationStatus: normalizeValidationStatus(server.lastValidationStatus),
    lastValidationToolCount: server.lastValidationToolCount ?? null,
    name: server.name,
    oauthConnectionStatus: normalizeOauthConnectionStatus(server.oauthConnectionStatus),
    oauthLastError: server.oauthLastError ?? null,
    updatedAt: server.updatedAt,
    url: server.url,
  }));
  const selectedServerRecord = data.McpServers.find((server) => server.id === selectedServerId) ?? null;
  const selectedServer: EditableMcpServerRecord | null = selectedServerRecord
    ? {
        authType: normalizeAuthType(selectedServerRecord.authType),
        callTimeoutMs: selectedServerRecord.callTimeoutMs,
        description: selectedServerRecord.description ?? null,
        enabled: selectedServerRecord.enabled,
        headersText: selectedServerRecord.headersText,
        id: selectedServerRecord.id,
        lastValidatedAt: selectedServerRecord.lastValidatedAt ?? null,
        lastValidationError: selectedServerRecord.lastValidationError ?? null,
        lastValidationStatus: normalizeValidationStatus(selectedServerRecord.lastValidationStatus),
        lastValidationToolCount: selectedServerRecord.lastValidationToolCount ?? null,
        name: selectedServerRecord.name,
        oauthClientId: selectedServerRecord.oauthClientId ?? null,
        oauthConnectionStatus: normalizeOauthConnectionStatus(selectedServerRecord.oauthConnectionStatus),
        oauthGrantedScopes: [...selectedServerRecord.oauthGrantedScopes],
        oauthLastError: selectedServerRecord.oauthLastError ?? null,
        oauthRequestedScopes: [...selectedServerRecord.oauthRequestedScopes],
        url: selectedServerRecord.url,
      }
    : null;

  const openAssignmentResources = (resources: AgentAssignmentResource[]) => {
    assignmentDialogCanCloseRef.current = false;
    setAssignmentResources(resources);
    setAssignmentDialogOpen(true);
    window.setTimeout(() => {
      assignmentDialogCanCloseRef.current = true;
    }, 200);
  };

  const closeAssignmentDialog = () => {
    setAssignmentDialogOpen(false);
    setAssignmentResources([]);
    setAssignmentErrorMessage(null);
  };

  const isSaving = isCreateServerInFlight || isUpdateServerInFlight;

  useEffect(() => {
    const serverId = search.assignMcpServerId;
    if (!serverId) {
      setDismissedAssignmentServerId(null);
      return;
    }
    if (serverId === dismissedAssignmentServerId) {
      return;
    }
    if (assignmentResources.some((resource) => resource.id === serverId)) {
      return;
    }

    const server = mcpServers.find((candidateServer) => candidateServer.id === serverId) ?? null;
    if (!server) {
      return;
    }

    openAssignmentResources([{
      id: server.id,
      name: server.name,
    }]);
    setAssignmentErrorMessage(null);
  }, [assignmentResources, dismissedAssignmentServerId, mcpServers, search.assignMcpServerId]);

  const toCreateMcpServerInput = (input: CreateMcpServerInput): CreateMcpServerInput => {
    return {
      authType: input.authType,
      callTimeoutMs: input.callTimeoutMs,
      description: input.description,
      enabled: input.enabled,
      headersText: input.headersText,
      name: input.name,
      url: input.url,
    };
  };

  const startOauthForServer = async (input: {
    mcpServerId: string;
    oauthClientId?: string;
    oauthClientSecret?: string;
    requestedScopes: string[];
  }) => {
    await new Promise<void>((resolve, reject) => {
      commitStartOauth({
        variables: {
          input: {
            mcpServerId: input.mcpServerId,
            oauthClientId: input.oauthClientId ?? null,
            oauthClientSecret: input.oauthClientSecret ?? null,
            requestedScopes: input.requestedScopes,
          },
        },
        onCompleted: (response, errors) => {
          const nextErrorMessage = getRelayErrorMessage(errors);
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          const authorizationUrl = String(
            response.StartMcpServerOAuth?.authorizationUrl || "",
          ).trim();
          if (!authorizationUrl) {
            reject(new Error("OAuth authorization URL is missing."));
            return;
          }

          if (typeof window !== "undefined") {
            window.location.assign(authorizationUrl);
          }
          resolve();
        },
        onError: reject,
      });
    });
  };

  const createServer = async (input: CreateMcpServerInput) => {
    return await new Promise<string>((resolve, reject) => {
      commitCreateServer({
        variables: {
          input,
        },
        updater: (store) => {
          upsertMcpServerInStore(store, "CreateMcpServer");
        },
        onCompleted: (response, errors) => {
          const nextErrorMessage = getRelayErrorMessage(errors);
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          const createdServerId = String(response.CreateMcpServer?.id || "").trim();
          if (!createdServerId) {
            reject(new Error("Created MCP server id is missing."));
            return;
          }

          resolve(createdServerId);
        },
        onError: reject,
      });
    });
  };

  async function assignMcpServersToAgents(agentIds: string[]) {
    if (isAssigningMcpServers) {
      return;
    }

    setAssignmentErrorMessage(null);
    setAssigningMcpServers(true);

    try {
      for (const server of assignmentResources) {
        for (const agentId of agentIds) {
          await new Promise<void>((resolve, reject) => {
            commitAttachMcpServerToAgent({
              variables: {
                input: {
                  agentId,
                  mcpServerId: server.id,
                },
              },
              onCompleted: (_response, errors) => {
                const nextErrorMessage = getRelayErrorMessage(errors);
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                resolve();
              },
              onError: reject,
            });
          });
        }
      }

      const serverCount = assignmentResources.length;
      setAssignmentDialogOpen(false);
      setAssignmentResources([]);
      if (search.assignMcpServerId) {
        setDismissedAssignmentServerId(search.assignMcpServerId);
        void navigate({
          params: {
            organizationSlug,
          },
          search: {},
          to: OrganizationPath.route("/mcp-servers"),
        });
      }
      toast.showSavedToast(
        `Added ${serverCount} MCP server${serverCount === 1 ? "" : "s"} to ${agentIds.length} agent${agentIds.length === 1 ? "" : "s"}`,
      );
    } catch (error: unknown) {
      setAssignmentErrorMessage(error instanceof Error ? error.message : "Failed to add MCP servers to agents.");
    } finally {
      setAssigningMcpServers(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Manage shared remote HTTP MCP servers that agents can attach as defaults. CompanyHelm supports no auth, manual Authorization headers, OAuth client credentials, and OAuth authorization code flows.
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
        isClientCredentialsConnecting={isConnectClientCredentialsInFlight}
        isOauthDisconnecting={isDisconnectOauthInFlight}
        isOauthStarting={isStartOauthInFlight}
        isOpen={isDialogOpen}
        isSaving={isSaving}
        onConnectClientCredentials={async (input) => {
          setErrorMessage(null);

          await new Promise<void>((resolve, reject) => {
            commitConnectClientCredentials({
              variables: {
                input: {
                  mcpServerId: input.mcpServerId,
                  oauthClientId: input.oauthClientId ?? null,
                  oauthClientSecret: input.oauthClientSecret ?? null,
                  requestedScopes: input.requestedScopes,
                },
              },
              updater: (store) => {
                upsertMcpServerInStore(store, "ConnectMcpServerOAuthClientCredentials");
              },
              onCompleted: (_response, errors) => {
                const nextErrorMessage = getRelayErrorMessage(errors);
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                resolve();
              },
              onError: reject,
            });
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to connect OAuth client credentials.");
          });
        }}
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
        onDisconnectOauth={async (serverId) => {
          setErrorMessage(null);

          await new Promise<void>((resolve, reject) => {
            commitDisconnectOauth({
              variables: {
                input: {
                  mcpServerId: serverId,
                },
              },
              updater: (store) => {
                upsertMcpServerInStore(store, "DisconnectMcpServerOAuth");
              },
              onCompleted: (_response, errors) => {
                const nextErrorMessage = getRelayErrorMessage(errors);
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                resolve();
              },
              onError: reject,
            });
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to disconnect MCP OAuth.");
          });
        }}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setErrorMessage(null);
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

            createServer(input)
              .then((createdServerId) => {
                setDialogOpen(false);
                setSelectedServerId(null);
                setAssignmentErrorMessage(null);
                openAssignmentResources([{
                  id: createdServerId,
                  name: input.name,
                }]);
                resolve();
              })
              .catch(reject);
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to save MCP server.");
          });
        }}
        onSaveAndStartOauth={async (input) => {
          setErrorMessage(null);

          await createServer(toCreateMcpServerInput(input))
            .then(async (createdServerId) => {
              try {
                await startOauthForServer({
                  mcpServerId: createdServerId,
                  oauthClientId: input.oauthClientId,
                  oauthClientSecret: input.oauthClientSecret,
                  requestedScopes: input.requestedScopes,
                });
              } catch (error) {
                setSelectedServerId(createdServerId);
                throw error;
              }
            })
            .catch((error: unknown) => {
              setErrorMessage(error instanceof Error ? error.message : "Failed to save and start MCP OAuth.");
            });
        }}
        onStartOauth={async (input) => {
          setErrorMessage(null);
          await startOauthForServer(input).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to start MCP OAuth.");
          });
        }}
        server={selectedServer}
      />
      <AgentAssignmentDialog
        agents={agents}
        errorMessage={assignmentErrorMessage}
        isAssigning={isAssigningMcpServers}
        isOpen={isAssignmentDialogOpen}
        onAssign={assignMcpServersToAgents}
        onOpenChange={(open) => {
          if (open) {
            setAssignmentDialogOpen(true);
            return;
          }

          if (!assignmentDialogCanCloseRef.current) {
            return;
          }

          closeAssignmentDialog();
          if (search.assignMcpServerId) {
            setDismissedAssignmentServerId(search.assignMcpServerId);
            void navigate({
              params: {
                organizationSlug,
              },
              search: {},
              to: OrganizationPath.route("/mcp-servers"),
            });
          }
        }}
        resourceKind="MCP server"
        resources={assignmentResources}
      />
    </main>
  );
}

export function McpServersPage() {
  return (
    <Suspense fallback={<McpServersPageFallback />}>
      <McpServersPageContent />
    </Suspense>
  );
}
