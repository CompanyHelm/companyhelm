import { Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { FolderIcon, KeyRoundIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { EditableField } from "@/components/editable_field";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { useToast } from "@/components/toast_provider";
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelAction,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPrimaryAction,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page_tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import type { secretGroupDetailPageAttachMutation } from "./__generated__/secretGroupDetailPageAttachMutation.graphql";
import type { secretGroupDetailPageDeleteMutation } from "./__generated__/secretGroupDetailPageDeleteMutation.graphql";
import type { secretGroupDetailPageDetachMutation } from "./__generated__/secretGroupDetailPageDetachMutation.graphql";
import type { secretGroupDetailPageQuery } from "./__generated__/secretGroupDetailPageQuery.graphql";
import type { secretGroupDetailPageUpdateSecretMutation } from "./__generated__/secretGroupDetailPageUpdateSecretMutation.graphql";
import type { secretGroupDetailPageUpdateMutation } from "./__generated__/secretGroupDetailPageUpdateMutation.graphql";

type SecretGroupDetailPageTab = "agents" | "overview" | "secrets";

const secretGroupDetailPageTabs: Array<{ key: SecretGroupDetailPageTab; label: string }> = [
  {
    key: "overview",
    label: "Overview",
  },
  {
    key: "secrets",
    label: "Secrets",
  },
  {
    key: "agents",
    label: "Agents",
  },
];

const secretGroupDetailPageQueryNode = graphql`
  query secretGroupDetailPageQuery($secretGroupId: ID!) {
    Agents {
      id
      name
    }
    SecretGroupAgents(secretGroupId: $secretGroupId) {
      agentId
      id
      name
    }
    SecretGroup(id: $secretGroupId) {
      id
      companyId
      name
    }
    Secrets {
      id
      envVarName
      name
      secretGroupId
    }
  }
`;

const secretGroupDetailPageUpdateMutationNode = graphql`
  mutation secretGroupDetailPageUpdateMutation($input: UpdateSecretGroupInput!) {
    UpdateSecretGroup(input: $input) {
      id
      companyId
      name
    }
  }
`;

const secretGroupDetailPageDeleteMutationNode = graphql`
  mutation secretGroupDetailPageDeleteMutation($input: DeleteSecretGroupInput!) {
    DeleteSecretGroup(input: $input) {
      id
      name
    }
  }
`;

const secretGroupDetailPageUpdateSecretMutationNode = graphql`
  mutation secretGroupDetailPageUpdateSecretMutation($input: UpdateSecretInput!) {
    UpdateSecret(input: $input) {
      id
      name
      envVarName
      secretGroupId
    }
  }
`;

const secretGroupDetailPageAttachMutationNode = graphql`
  mutation secretGroupDetailPageAttachMutation($input: AttachSecretGroupToAgentInput!) {
    AttachSecretGroupToAgent(input: $input) {
      id
      name
    }
  }
`;

const secretGroupDetailPageDetachMutationNode = graphql`
  mutation secretGroupDetailPageDetachMutation($input: DetachSecretGroupFromAgentInput!) {
    DetachSecretGroupFromAgent(input: $input) {
      id
    }
  }
`;

function getRelayErrorMessage(errors: ReadonlyArray<{ message?: string | null }> | null | undefined): string | null {
  const message = String(errors?.[0]?.message ?? "").trim();
  return message.length > 0 ? message : null;
}

function SecretGroupDetailPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>Loading secret group...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading secret group...
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function SecretGroupDetailPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [agentAssignmentErrorMessage, setAgentAssignmentErrorMessage] = useState<string | null>(null);
  const [secretAssignmentErrorMessage, setSecretAssignmentErrorMessage] = useState<string | null>(null);
  const [busyAgentId, setBusyAgentId] = useState<string | null>(null);
  const [busySecretId, setBusySecretId] = useState<string | null>(null);
  const [attachedAgentIdOverride, setAttachedAgentIdOverride] = useState<Set<string> | null>(null);
  const [groupSecretIdOverride, setGroupSecretIdOverride] = useState<Set<string> | null>(null);
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const toast = useToast();
  const { secretGroupId } = useParams({ strict: false }) as { secretGroupId?: string };
  const search = useSearch({ strict: false }) as { tab?: SecretGroupDetailPageTab };
  const { setDetailLabel } = useApplicationBreadcrumb();
  const normalizedSecretGroupId = String(secretGroupId || "").trim();
  if (!normalizedSecretGroupId) {
    throw new Error("Secret group ID is required.");
  }

  const data = useLazyLoadQuery<secretGroupDetailPageQuery>(
    secretGroupDetailPageQueryNode,
    {
      secretGroupId: normalizedSecretGroupId,
    },
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitUpdateSecretGroup] = useMutation<secretGroupDetailPageUpdateMutation>(
    secretGroupDetailPageUpdateMutationNode,
  );
  const [commitDeleteSecretGroup, isDeleteSecretGroupInFlight] = useMutation<secretGroupDetailPageDeleteMutation>(
    secretGroupDetailPageDeleteMutationNode,
  );
  const [commitAttachSecretGroup, isAttachSecretGroupInFlight] = useMutation<secretGroupDetailPageAttachMutation>(
    secretGroupDetailPageAttachMutationNode,
  );
  const [commitDetachSecretGroup, isDetachSecretGroupInFlight] = useMutation<secretGroupDetailPageDetachMutation>(
    secretGroupDetailPageDetachMutationNode,
  );
  const group = data.SecretGroup;
  const [commitUpdateSecret, isUpdateSecretInFlight] = useMutation<secretGroupDetailPageUpdateSecretMutation>(
    secretGroupDetailPageUpdateSecretMutationNode,
  );
  const selectedTab: SecretGroupDetailPageTab = search.tab === "agents" || search.tab === "secrets"
    ? search.tab
    : "overview";
  const agents = useMemo(() => {
    return [...data.Agents].sort((left, right) => left.name.localeCompare(right.name));
  }, [data.Agents]);
  const secrets = useMemo(() => {
    return [...data.Secrets].sort((left, right) => left.name.localeCompare(right.name));
  }, [data.Secrets]);
  const attachedAgentIds = useMemo(() => {
    return attachedAgentIdOverride ?? new Set(data.SecretGroupAgents.map((agent) => agent.agentId));
  }, [attachedAgentIdOverride, data.SecretGroupAgents]);
  const groupSecretIds = useMemo(() => {
    return groupSecretIdOverride
      ?? new Set(data.Secrets.filter((secret) => secret.secretGroupId === group.id).map((secret) => secret.id));
  }, [data.Secrets, group.id, groupSecretIdOverride]);
  const groupSecretCount = groupSecretIds.size;
  const isAgentAssignmentInFlight = isAttachSecretGroupInFlight || isDetachSecretGroupInFlight;
  const isSecretAssignmentInFlight = isUpdateSecretInFlight;

  useEffect(() => {
    setDetailLabel(group.name);

    return () => {
      setDetailLabel(null);
    };
  }, [group.name, setDetailLabel]);

  useEffect(() => {
    setAttachedAgentIdOverride(null);
    setGroupSecretIdOverride(null);
  }, [group.id]);

  async function updateSecretGroup(input: {
    name?: string;
  }): Promise<void> {
    setErrorMessage(null);

    await new Promise<void>((resolve, reject) => {
      commitUpdateSecretGroup({
        variables: {
          input: {
            id: normalizedSecretGroupId,
            name: input.name,
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
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update secret group.");
      throw error;
    });
  }

  async function deleteSecretGroup(): Promise<void> {
    setErrorMessage(null);

    await new Promise<void>((resolve, reject) => {
      commitDeleteSecretGroup({
        variables: {
          input: {
            id: normalizedSecretGroupId,
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
    }).then(() => {
      void navigate({
        params: {
          organizationSlug,
        },
        to: OrganizationPath.route("/secrets"),
      });
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete secret group.");
    });
  }

  async function updateSecretAssignment(secretId: string, shouldAttach: boolean): Promise<void> {
    if (isSecretAssignmentInFlight) {
      return;
    }

    setSecretAssignmentErrorMessage(null);
    setBusySecretId(secretId);

    try {
      await new Promise<void>((resolve, reject) => {
        commitUpdateSecret({
          variables: {
            input: {
              id: secretId,
              secretGroupId: shouldAttach ? normalizedSecretGroupId : null,
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
      setGroupSecretIdOverride((currentGroupSecretIds) => {
        const nextGroupSecretIds = new Set(
          currentGroupSecretIds
            ?? data.Secrets.filter((secret) => secret.secretGroupId === group.id).map((secret) => secret.id),
        );
        if (shouldAttach) {
          nextGroupSecretIds.add(secretId);
        } else {
          nextGroupSecretIds.delete(secretId);
        }

        return nextGroupSecretIds;
      });
      toast.showSavedToast();
    } catch (error) {
      setSecretAssignmentErrorMessage(
        error instanceof Error ? error.message : "Failed to update the secret assignment.",
      );
    } finally {
      setBusySecretId(null);
    }
  }

  async function commitAgentAssignment(agentId: string, shouldAttach: boolean): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const mutationOptions = {
        variables: {
          input: {
            agentId,
            secretGroupId: normalizedSecretGroupId,
          },
        },
        onCompleted: (_response: unknown, errors: ReadonlyArray<{ message?: string | null }> | null | undefined) => {
          const nextErrorMessage = getRelayErrorMessage(errors);
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          resolve();
        },
        onError: reject,
      };

      if (shouldAttach) {
        commitAttachSecretGroup(mutationOptions);
        return;
      }

      commitDetachSecretGroup(mutationOptions);
    });
  }

  function updateAttachedAgentOverrides(agentIds: string[], shouldAttach: boolean): void {
    setAttachedAgentIdOverride((currentAttachedAgentIds) => {
      const nextAttachedAgentIds = new Set(
        currentAttachedAgentIds ?? data.SecretGroupAgents.map((agent) => agent.agentId),
      );
      for (const agentId of agentIds) {
        if (shouldAttach) {
          nextAttachedAgentIds.add(agentId);
        } else {
          nextAttachedAgentIds.delete(agentId);
        }
      }

      return nextAttachedAgentIds;
    });
  }

  async function updateAgentAssignment(agentId: string, shouldAttach: boolean): Promise<void> {
    if (isAgentAssignmentInFlight) {
      return;
    }

    setAgentAssignmentErrorMessage(null);
    setBusyAgentId(agentId);

    try {
      await commitAgentAssignment(agentId, shouldAttach);
      updateAttachedAgentOverrides([agentId], shouldAttach);
      toast.showSavedToast();
    } catch (error) {
      setAgentAssignmentErrorMessage(
        error instanceof Error ? error.message : "Failed to update the agent assignment.",
      );
    } finally {
      setBusyAgentId(null);
    }
  }

  async function updateAllAgentAssignments(shouldAttach: boolean): Promise<void> {
    if (isAgentAssignmentInFlight) {
      return;
    }

    const targetAgentIds = agents
      .filter((agent) => attachedAgentIds.has(agent.id) !== shouldAttach)
      .map((agent) => agent.id);
    if (targetAgentIds.length === 0) {
      return;
    }

    setAgentAssignmentErrorMessage(null);
    setBusyAgentId("__all__");

    try {
      for (const agentId of targetAgentIds) {
        await commitAgentAssignment(agentId, shouldAttach);
      }
      updateAttachedAgentOverrides(targetAgentIds, shouldAttach);
      toast.showSavedToast();
    } catch (error) {
      setAgentAssignmentErrorMessage(
        error instanceof Error ? error.message : "Failed to update the agent assignments.",
      );
    } finally {
      setBusyAgentId(null);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageTabs
        items={secretGroupDetailPageTabs}
        onSelect={(tab) => {
          void navigate({
            params: {
              organizationSlug,
              secretGroupId: group.id,
            },
            search: {
              tab,
            },
            to: OrganizationPath.route("/secret-groups/$secretGroupId"),
          });
        }}
        selectedKey={selectedTab}
      />

      {selectedTab === "overview" ? (
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderIcon className="size-5 text-muted-foreground" />
                  {group.name}
                </CardTitle>
                <CardDescription>
                  Secret group defaults are inherited by selected agents in current and future sessions.
                </CardDescription>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button aria-label={`Delete ${group.name}`} size="icon" variant="destructive">
                    <Trash2Icon className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete secret group</AlertDialogTitle>
                    <AlertDialogDescription>
                      Delete {group.name}, ungroup its secrets, and remove this group from agent defaults.
                      The secrets themselves are not deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancelAction asChild>
                      <AlertDialogCancelButton disabled={isDeleteSecretGroupInFlight} variant="outline">
                        Cancel
                      </AlertDialogCancelButton>
                    </AlertDialogCancelAction>
                    <AlertDialogPrimaryAction asChild>
                      <AlertDialogActionButton
                        disabled={isDeleteSecretGroupInFlight}
                        onClick={(event) => {
                          event.preventDefault();
                          void deleteSecretGroup();
                        }}
                        variant="destructive"
                      >
                        Delete
                      </AlertDialogActionButton>
                    </AlertDialogPrimaryAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            {errorMessage ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMessage}
              </div>
            ) : null}
            <EditableField
              emptyValueLabel="Unnamed secret group"
              fieldType="text"
              label="Name"
              onSave={async (name) => {
                await updateSecretGroup({ name });
              }}
              value={group.name}
              variant="plain"
            />
            <div className="grid gap-3 rounded-xl border border-border/60 bg-card/50 p-4 sm:grid-cols-3">
              <SecretGroupMetadataItem label="Secrets" value={String(groupSecretCount)} />
              <SecretGroupMetadataItem label="Agents" value={String(attachedAgentIds.size)} />
              <SecretGroupMetadataItem label="Record id" value={group.id} />
            </div>
          </CardContent>
        </Card>
      ) : selectedTab === "secrets" ? (
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <KeyRoundIcon className="size-5 text-muted-foreground" />
                  Secrets
                </CardTitle>
                <CardDescription>
                  Choose which secrets belong to {group.name}.
                </CardDescription>
              </div>
              <Badge variant="outline">
                {groupSecretIds.size} selected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {secretAssignmentErrorMessage ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {secretAssignmentErrorMessage}
              </div>
            ) : null}
            {secrets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                No secrets have been created for this company yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/70 bg-background/90">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Secret</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {secrets.map((secret) => {
                      const isAttached = groupSecretIds.has(secret.id);
                      const isBusy = busySecretId === secret.id;

                      return (
                        <TableRow key={secret.id}>
                          <TableCell>
                            <div className="flex min-w-64 items-center gap-3">
                              <input
                                aria-label={`${isAttached ? "Remove" : "Add"} ${secret.name}`}
                                checked={isAttached}
                                className="size-4 rounded border-border text-primary accent-primary"
                                disabled={isSecretAssignmentInFlight}
                                onChange={(event) => {
                                  void updateSecretAssignment(secret.id, event.currentTarget.checked);
                                }}
                                type="checkbox"
                              />
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/30">
                                <KeyRoundIcon className="size-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">{secret.name}</div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {isBusy
                                    ? "Saving assignment..."
                                    : isAttached
                                      ? "This secret belongs to the group."
                                      : "Current and future group agents inherit this secret when selected."}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="size-5 text-muted-foreground" />
                  Agents
                </CardTitle>
                <CardDescription>
                  Choose which agents should inherit all current and future secrets in {group.name}.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge variant="outline">
                  {attachedAgentIds.size} selected
                </Badge>
                <Button
                  disabled={isAgentAssignmentInFlight || agents.length === 0 || attachedAgentIds.size === agents.length}
                  onClick={() => {
                    void updateAllAgentAssignments(true);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Select all
                </Button>
                <Button
                  disabled={isAgentAssignmentInFlight || attachedAgentIds.size === 0}
                  onClick={() => {
                    void updateAllAgentAssignments(false);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Deselect all
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {agentAssignmentErrorMessage ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {agentAssignmentErrorMessage}
              </div>
            ) : null}
            {agents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                No agents have been created for this company yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/70 bg-background/90">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => {
                      const isAttached = attachedAgentIds.has(agent.id);
                      const isBusy = busyAgentId === agent.id;

                      return (
                        <TableRow key={agent.id}>
                          <TableCell>
                            <div className="flex min-w-64 items-center gap-3">
                              <input
                                aria-label={`${isAttached ? "Deselect" : "Select"} ${agent.name}`}
                                checked={isAttached}
                                className="size-4 rounded border-border text-primary accent-primary"
                                disabled={isAgentAssignmentInFlight}
                                onChange={(event) => {
                                  void updateAgentAssignment(agent.id, event.currentTarget.checked);
                                }}
                                type="checkbox"
                              />
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/30">
                                <UsersIcon className="size-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">{agent.name}</div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {isBusy
                                    ? "Saving assignment..."
                                    : "Current and future sessions inherit this secret group when selected."}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function SecretGroupMetadataItem(props: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{props.label}</p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{props.value}</p>
    </div>
  );
}

export function SecretGroupDetailPage() {
  return (
    <Suspense fallback={<SecretGroupDetailPageFallback />}>
      <SecretGroupDetailPageContent />
    </Suspense>
  );
}
