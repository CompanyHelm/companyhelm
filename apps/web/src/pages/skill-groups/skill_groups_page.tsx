import { Suspense, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FolderPlusIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { GroupDialog } from "./create_group_dialog";
import type { skillGroupsPageCreateSkillGroupMutation } from "./__generated__/skillGroupsPageCreateSkillGroupMutation.graphql";
import type { skillGroupsPageDeleteSkillGroupMutation } from "./__generated__/skillGroupsPageDeleteSkillGroupMutation.graphql";
import type { skillGroupsPageQuery } from "./__generated__/skillGroupsPageQuery.graphql";
import type { skillGroupsPageUpdateSkillGroupMutation } from "./__generated__/skillGroupsPageUpdateSkillGroupMutation.graphql";

type RelayLinkedRecord = {
  getDataID(): string;
  getValue(key: string): unknown;
  setValue(value: unknown, key: string): void;
};

const skillGroupsPageQueryNode = graphql`
  query skillGroupsPageQuery {
    SkillGroups {
      id
      name
    }
    Skills {
      id
      name
      skillGroupId
    }
  }
`;

const skillGroupsPageCreateSkillGroupMutationNode = graphql`
  mutation skillGroupsPageCreateSkillGroupMutation($input: CreateSkillGroupInput!) {
    CreateSkillGroup(input: $input) {
      id
      name
    }
  }
`;

const skillGroupsPageDeleteSkillGroupMutationNode = graphql`
  mutation skillGroupsPageDeleteSkillGroupMutation($input: DeleteSkillGroupInput!) {
    DeleteSkillGroup(input: $input) {
      id
      name
    }
  }
`;

const skillGroupsPageUpdateSkillGroupMutationNode = graphql`
  mutation skillGroupsPageUpdateSkillGroupMutation($input: UpdateSkillGroupInput!) {
    UpdateSkillGroup(input: $input) {
      id
      name
    }
  }
`;

type SkillGroupDialogState = {
  mode: "create";
} | {
  groupId: string;
  mode: "edit";
  name: string;
};

function filterRelayRecords(records: ReadonlyArray<unknown>): RelayLinkedRecord[] {
  return records.filter((record): record is RelayLinkedRecord => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function"
      && "getValue" in record
      && typeof record.getValue === "function"
      && "setValue" in record
      && typeof record.setValue === "function";
  });
}

function sortGroupRecords(records: RelayLinkedRecord[]): RelayLinkedRecord[] {
  return [...records].sort((left, right) => {
    const leftName = String(left.getValue("name") ?? "");
    const rightName = String(right.getValue("name") ?? "");
    return leftName.localeCompare(rightName);
  });
}

function SkillGroupsPageFallback() {
  const organizationSlug = useCurrentOrganizationSlug();
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Skill groups</CardTitle>
            <CardDescription>
              Loading folder-style groups for your company skills.
            </CardDescription>
          </div>
          <CardAction className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link params={{ organizationSlug }} to={OrganizationPath.route("/skills")}>Back to skills</Link>
            </Button>
            <Button disabled size="sm">
              <PlusIcon />
              Create group
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading skill groups...
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * Hosts dedicated skill-group management so catalog organization can evolve independently from the
 * main skill list. Deleting a group intentionally ungroups skills instead of deleting them.
 */
function SkillGroupsPageContent() {
  const organizationSlug = useCurrentOrganizationSlug();
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [groupDialogState, setGroupDialogState] = useState<SkillGroupDialogState | null>(null);
  const [updatingGroupId, setUpdatingGroupId] = useState<string | null>(null);
  const data = useLazyLoadQuery<skillGroupsPageQuery>(
    skillGroupsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateSkillGroup, isCreateSkillGroupInFlight] = useMutation<skillGroupsPageCreateSkillGroupMutation>(
    skillGroupsPageCreateSkillGroupMutationNode,
  );
  const [commitUpdateSkillGroup, isUpdateSkillGroupInFlight] = useMutation<skillGroupsPageUpdateSkillGroupMutation>(
    skillGroupsPageUpdateSkillGroupMutationNode,
  );
  const [commitDeleteSkillGroup] = useMutation<skillGroupsPageDeleteSkillGroupMutation>(
    skillGroupsPageDeleteSkillGroupMutationNode,
  );
  const groupSkillCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const skill of data.Skills) {
      if (!skill.skillGroupId) {
        continue;
      }

      counts.set(skill.skillGroupId, (counts.get(skill.skillGroupId) ?? 0) + 1);
    }

    return counts;
  }, [data.Skills]);
  const sortedGroups = useMemo(() => {
    return [...data.SkillGroups].sort((left, right) => left.name.localeCompare(right.name));
  }, [data.SkillGroups]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Skill groups</CardTitle>
            <CardDescription>
              Create reusable groups for your skill catalog. Deleting a group moves its skills back
              to ungrouped instead of removing the skills.
            </CardDescription>
          </div>
          <CardAction className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link params={{ organizationSlug }} to={OrganizationPath.route("/skills")}>Back to skills</Link>
            </Button>
            <Button
              onClick={() => {
                setErrorMessage(null);
                setGroupDialogState({
                  mode: "create",
                });
              }}
              size="sm"
            >
              <FolderPlusIcon />
              Create group
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {sortedGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No skill groups yet</p>
              <p className="mt-2 text-xs/relaxed text-muted-foreground">
                Create your first group here, then move skills into it from the main skills page or
                from an individual skill.
              </p>
            </div>
          ) : null}

          {sortedGroups.map((group) => {
            const skillCount = groupSkillCounts.get(group.id) ?? 0;

            return (
              <div
                key={group.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/90 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{group.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {skillCount} {skillCount === 1 ? "skill" : "skills"} currently assigned
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    aria-label={`Rename ${group.name}`}
                    className="text-muted-foreground hover:text-foreground"
                    disabled={deletingGroupId === group.id || updatingGroupId === group.id}
                    onClick={() => {
                      setErrorMessage(null);
                      setGroupDialogState({
                        groupId: group.id,
                        mode: "edit",
                        name: group.name,
                      });
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    aria-label={`Delete ${group.name}`}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={deletingGroupId === group.id || updatingGroupId === group.id}
                    onClick={() => {
                      setErrorMessage(null);
                      setDeletingGroupId(group.id);

                      void new Promise<void>((resolve, reject) => {
                        commitDeleteSkillGroup({
                          variables: {
                            input: {
                              id: group.id,
                            },
                          },
                          updater: (store) => {
                            const deletedGroup = store.getRootField("DeleteSkillGroup");
                            if (!deletedGroup) {
                              return;
                            }

                            const rootRecord = store.getRoot();
                            const currentGroups = filterRelayRecords(rootRecord.getLinkedRecords("SkillGroups") || []);
                            rootRecord.setLinkedRecords(
                              currentGroups.filter((record) => record.getDataID() !== deletedGroup.getDataID()),
                              "SkillGroups",
                            );

                            const currentSkills = filterRelayRecords(rootRecord.getLinkedRecords("Skills") || []);
                            for (const skillRecord of currentSkills) {
                              if (skillRecord.getValue("skillGroupId") === deletedGroup.getDataID()) {
                                skillRecord.setValue(null, "skillGroupId");
                              }
                            }
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
                        setErrorMessage(error instanceof Error ? error.message : "Failed to delete skill group.");
                      }).finally(() => {
                        setDeletingGroupId(null);
                      });
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <GroupDialog
        errorMessage={groupDialogState ? errorMessage : null}
        initialName={groupDialogState?.mode === "edit" ? groupDialogState.name : ""}
        isOpen={groupDialogState !== null}
        isSaving={isCreateSkillGroupInFlight || isUpdateSkillGroupInFlight}
        mode={groupDialogState?.mode ?? "create"}
        onOpenChange={(open) => {
          if (open) {
            return;
          }

          setGroupDialogState(null);
          setErrorMessage(null);
        }}
        onSubmit={async (name) => {
          setErrorMessage(null);

          if (groupDialogState?.mode === "edit") {
            setUpdatingGroupId(groupDialogState.groupId);

            await new Promise<void>((resolve, reject) => {
              commitUpdateSkillGroup({
                variables: {
                  input: {
                    id: groupDialogState.groupId,
                    name,
                  },
                },
                updater: (store) => {
                  const updatedGroup = store.getRootField("UpdateSkillGroup");
                  if (!updatedGroup) {
                    return;
                  }

                  const rootRecord = store.getRoot();
                  const currentGroups = filterRelayRecords(rootRecord.getLinkedRecords("SkillGroups") || []);
                  rootRecord.setLinkedRecords(
                    sortGroupRecords(currentGroups.map((record) => {
                      return record.getDataID() === updatedGroup.getDataID()
                        ? updatedGroup as RelayLinkedRecord
                        : record;
                    })),
                    "SkillGroups",
                  );
                },
                onCompleted: (_response, errors) => {
                  const nextErrorMessage = errors?.[0]?.message;
                  if (nextErrorMessage) {
                    reject(new Error(nextErrorMessage));
                    return;
                  }

                  setGroupDialogState(null);
                  resolve();
                },
                onError: reject,
              });
            }).catch((error: unknown) => {
              setErrorMessage(error instanceof Error ? error.message : "Failed to rename skill group.");
              throw error;
            }).finally(() => {
              setUpdatingGroupId(null);
            });

            return;
          }

          await new Promise<void>((resolve, reject) => {
            commitCreateSkillGroup({
              variables: {
                input: {
                  name,
                },
              },
              updater: (store) => {
                const createdGroup = store.getRootField("CreateSkillGroup");
                if (!createdGroup) {
                  return;
                }

                const rootRecord = store.getRoot();
                const currentGroups = filterRelayRecords(rootRecord.getLinkedRecords("SkillGroups") || []);
                rootRecord.setLinkedRecords(
                  sortGroupRecords([...currentGroups, createdGroup as RelayLinkedRecord]),
                  "SkillGroups",
                );
              },
              onCompleted: (_response, errors) => {
                const nextErrorMessage = errors?.[0]?.message;
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                setGroupDialogState(null);
                resolve();
              },
              onError: reject,
            });
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to create skill group.");
            throw error;
          });
        }}
      />
    </main>
  );
}

export function SkillGroupsPage() {
  return (
    <Suspense fallback={<SkillGroupsPageFallback />}>
      <SkillGroupsPageContent />
    </Suspense>
  );
}
