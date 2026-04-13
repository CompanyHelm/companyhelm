import { Suspense, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
  CreateSkillDialog,
  type CreateSkillDialogGroupOption,
} from "./create_skill_dialog";
import { SkillsTree, type SkillsTreeGroupRecord, type SkillsTreeSkillRecord } from "./skills_tree";
import type { skillsPageCreateSkillMutation } from "./__generated__/skillsPageCreateSkillMutation.graphql";
import type { skillsPageCreateSkillGroupMutation } from "./__generated__/skillsPageCreateSkillGroupMutation.graphql";
import type { skillsPageDeleteSkillMutation } from "./__generated__/skillsPageDeleteSkillMutation.graphql";
import type { skillsPageImportGithubSkillsMutation } from "./__generated__/skillsPageImportGithubSkillsMutation.graphql";
import type { skillsPageQuery } from "./__generated__/skillsPageQuery.graphql";
import type { skillsPageUpdateSkillMutation } from "./__generated__/skillsPageUpdateSkillMutation.graphql";

type RelayLinkedRecord = {
  getDataID(): string;
  getValue(key: string): unknown;
  setValue(value: unknown, key: string): void;
};

const skillsPageQueryNode = graphql`
  query skillsPageQuery {
    SkillGroups {
      id
      name
    }
    Skills {
      id
      name
      skillGroupId
      repository
      fileList
    }
  }
`;

const skillsPageCreateSkillMutationNode = graphql`
  mutation skillsPageCreateSkillMutation($input: CreateSkillInput!) {
    CreateSkill(input: $input) {
      id
      name
      description
      instructions
      skillGroupId
      repository
      skillDirectory
      fileList
    }
  }
`;

const skillsPageCreateSkillGroupMutationNode = graphql`
  mutation skillsPageCreateSkillGroupMutation($input: CreateSkillGroupInput!) {
    CreateSkillGroup(input: $input) {
      id
      name
    }
  }
`;

const skillsPageDeleteSkillMutationNode = graphql`
  mutation skillsPageDeleteSkillMutation($input: DeleteSkillInput!) {
    DeleteSkill(input: $input) {
      id
    }
  }
`;

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

const skillsPageImportGithubSkillsMutationNode = graphql`
  mutation skillsPageImportGithubSkillsMutation($input: ImportGithubSkillsInput!) {
    ImportGithubSkills(input: $input) {
      id
      name
      description
      instructions
      skillGroupId
      repository
      skillDirectory
      fileList
    }
  }
`;

const skillsPageUpdateSkillMutationNode = graphql`
  mutation skillsPageUpdateSkillMutation($input: UpdateSkillInput!) {
    UpdateSkill(input: $input) {
      id
      name
      description
      instructions
      skillGroupId
      repository
      skillDirectory
      fileList
    }
  }
`;

function SkillsPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Organize your company skill catalog, group reusable guidance, and keep manual skills
              editable from the web UI.
            </CardDescription>
          </div>
          <CardAction className="flex items-center gap-2">
            <Button disabled size="sm" variant="outline">
              Manage groups
            </Button>
            <Button disabled size="sm">
              <PlusIcon />
              Create skill
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <SkillsTree
            deletingSkillId={null}
            groups={[]}
            isLoading
            movingSkillId={null}
            onDeleteSkill={async () => undefined}
            onMoveSkill={async () => undefined}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function SkillsPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const [deletingSkillId, setDeletingSkillId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [movingSkillId, setMovingSkillId] = useState<string | null>(null);
  const data = useLazyLoadQuery<skillsPageQuery>(
    skillsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateSkill, isCreateSkillInFlight] = useMutation<skillsPageCreateSkillMutation>(
    skillsPageCreateSkillMutationNode,
  );
  const [commitCreateSkillGroup, isCreateSkillGroupInFlight] =
    useMutation<skillsPageCreateSkillGroupMutation>(skillsPageCreateSkillGroupMutationNode);
  const [commitImportGithubSkills, isImportGithubSkillsInFlight] =
    useMutation<skillsPageImportGithubSkillsMutation>(skillsPageImportGithubSkillsMutationNode);
  const [commitDeleteSkill] = useMutation<skillsPageDeleteSkillMutation>(
    skillsPageDeleteSkillMutationNode,
  );
  const [commitUpdateSkill] = useMutation<skillsPageUpdateSkillMutation>(
    skillsPageUpdateSkillMutationNode,
  );
  const groupOptions: CreateSkillDialogGroupOption[] = useMemo(() => {
    return [...data.SkillGroups]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((group) => ({
        id: group.id,
        name: group.name,
      }));
  }, [data.SkillGroups]);
  const groupedSkills = useMemo<SkillsTreeGroupRecord[]>(() => {
    const skillsByGroupId = new Map<string | null, SkillsTreeSkillRecord[]>();
    const sortedSkills = [...data.Skills].sort((left, right) => left.name.localeCompare(right.name));

    for (const skill of sortedSkills) {
      const nextSkillGroupId = skill.skillGroupId ?? null;
      const currentSkills = skillsByGroupId.get(nextSkillGroupId) ?? [];
      currentSkills.push({
        fileCount: skill.fileList.length,
        id: skill.id,
        name: skill.name,
        repository: skill.repository ?? null,
        skillGroupId: nextSkillGroupId,
      });
      skillsByGroupId.set(nextSkillGroupId, currentSkills);
    }

    if (sortedSkills.length === 0 && data.SkillGroups.length === 0) {
      return [];
    }

    return [...data.SkillGroups.map((group) => ({
      id: group.id,
      name: group.name,
      skills: skillsByGroupId.get(group.id) ?? [],
    })), {
      id: null,
      name: "Ungrouped",
      skills: skillsByGroupId.get(null) ?? [],
    }].sort((left, right) => {
      if (left.id === null) {
        return 1;
      }
      if (right.id === null) {
        return -1;
      }

      return left.name.localeCompare(right.name);
    });
  }, [data.SkillGroups, data.Skills]);

  async function moveSkill(skillId: string, skillGroupId: string | null) {
    setErrorMessage(null);
    setMovingSkillId(skillId);

    try {
      await new Promise<void>((resolve, reject) => {
        commitUpdateSkill({
          variables: {
            input: {
              id: skillId,
              skillGroupId,
            },
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
      });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to move skill.");
      throw error;
    } finally {
      setMovingSkillId(null);
    }
  }

  async function deleteSkill(skillId: string) {
    setDeletingSkillId(skillId);
    setErrorMessage(null);

    try {
      await new Promise<void>((resolve, reject) => {
        commitDeleteSkill({
          variables: {
            input: {
              id: skillId,
            },
          },
          updater: (store) => {
            const deletedSkill = store.getRootField("DeleteSkill");
            if (!deletedSkill) {
              return;
            }

            const rootRecord = store.getRoot();
            const currentSkills = (rootRecord.getLinkedRecords("Skills") || [])
              .filter((record): record is RelayLinkedRecord => {
                return typeof record === "object"
                  && record !== null
                  && "getDataID" in record
                  && typeof record.getDataID === "function"
                  && "getValue" in record
                  && typeof record.getValue === "function"
                  && "setValue" in record
                  && typeof record.setValue === "function";
              });
            rootRecord.setLinkedRecords(
              currentSkills.filter((record) => record.getDataID() !== deletedSkill.getDataID()),
              "Skills",
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
      });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete skill.");
      throw error;
    } finally {
      setDeletingSkillId(null);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Organize your company skill catalog, group reusable guidance, and keep manual skills
              editable from the web UI.
            </CardDescription>
          </div>
          <CardAction className="flex items-center gap-2">
            <Button
              onClick={() => {
                void navigate({
                  params: {
                    organizationSlug,
                  },
                  to: OrganizationPath.route("/skill-groups"),
                });
              }}
              size="sm"
              variant="outline"
            >
              Manage groups
            </Button>
            <Button
              onClick={() => {
                setCreateDialogOpen(true);
              }}
              size="sm"
            >
              <PlusIcon />
              Create skill
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage && !isCreateDialogOpen ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <SkillsTree
            deletingSkillId={deletingSkillId}
            groups={groupedSkills}
            isLoading={false}
            movingSkillId={movingSkillId}
            onDeleteSkill={deleteSkill}
            onMoveSkill={moveSkill}
          />
        </CardContent>
      </Card>

      <CreateSkillDialog
        errorMessage={isCreateDialogOpen ? errorMessage : null}
        groups={groupOptions}
        isOpen={isCreateDialogOpen}
        isSaving={isCreateSkillInFlight || isCreateSkillGroupInFlight || isImportGithubSkillsInFlight}
        onCreate={async (input) => {
          setErrorMessage(null);

          await new Promise<void>((resolve, reject) => {
            commitCreateSkill({
              variables: {
                input,
              },
              updater: (store) => {
                const newSkill = store.getRootField("CreateSkill");
                if (!newSkill) {
                  return;
                }

                const rootRecord = store.getRoot();
                const currentSkills = (rootRecord.getLinkedRecords("Skills") || [])
                  .filter((record): record is NonNullable<typeof record> => record !== null);
                rootRecord.setLinkedRecords([newSkill, ...currentSkills], "Skills");
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
            setErrorMessage(error instanceof Error ? error.message : "Failed to create skill.");
            throw error;
          });
        }}
        onCreateGroup={async (name) => {
          setErrorMessage(null);

          return await new Promise<CreateSkillDialogGroupOption>((resolve, reject) => {
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
              onCompleted: (response, errors) => {
                const nextErrorMessage = errors?.[0]?.message;
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                const createdGroup = response?.CreateSkillGroup;
                if (!createdGroup) {
                  reject(new Error("Failed to create skill group."));
                  return;
                }

                resolve({
                  id: createdGroup.id,
                  name: createdGroup.name,
                });
              },
              onError: reject,
            });
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to create skill group.");
            throw error;
          });
        }}
        onImportGithub={async (input) => {
          setErrorMessage(null);

          await new Promise<void>((resolve, reject) => {
            commitImportGithubSkills({
              variables: {
                input,
              },
              updater: (store) => {
                const importedSkills = (store.getRoot().getLinkedRecords("ImportGithubSkills") || [])
                  .filter((record): record is NonNullable<typeof record> => record !== null);
                if (importedSkills.length === 0) {
                  return;
                }

                const rootRecord = store.getRoot();
                const currentSkills = (rootRecord.getLinkedRecords("Skills") || [])
                  .filter((record): record is NonNullable<typeof record> => record !== null);
                rootRecord.setLinkedRecords([...importedSkills, ...currentSkills], "Skills");
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
            setErrorMessage(error instanceof Error ? error.message : "Failed to import GitHub skills.");
            throw error;
          });
        }}
        onOpenChange={setCreateDialogOpen}
      />
    </main>
  );
}

export function SkillsPage() {
  return (
    <Suspense fallback={<SkillsPageFallback />}>
      <SkillsPageContent />
    </Suspense>
  );
}
