import { Suspense, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { AgentAssignmentDialog, type AgentAssignmentResource } from "@/components/agent_assignment_dialog";
import { useToast } from "@/components/toast_provider";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
  CreateSkillDialog,
  type CreateSkillDialogGroupOption,
  type CreateSkillDialogGithubRepositoryOption,
} from "./create_skill_dialog";
import { GithubSkillImportRelayUpdater } from "./github_skill_import_relay_updater";
import { SkillsTree, type SkillsTreeGroupRecord, type SkillsTreeSkillRecord } from "./skills_tree";
import type { skillsPageCreateSkillMutation } from "./__generated__/skillsPageCreateSkillMutation.graphql";
import type { skillsPageCreateSkillGroupMutation } from "./__generated__/skillsPageCreateSkillGroupMutation.graphql";
import type { skillsPageDeleteSkillMutation } from "./__generated__/skillsPageDeleteSkillMutation.graphql";
import type { skillsPageImportGithubSkillsMutation } from "./__generated__/skillsPageImportGithubSkillsMutation.graphql";
import type { skillsPageQuery } from "./__generated__/skillsPageQuery.graphql";
import type { skillsPageAttachSkillToAgentMutation } from "./__generated__/skillsPageAttachSkillToAgentMutation.graphql";
import type { skillsPageUpdateSkillMutation } from "./__generated__/skillsPageUpdateSkillMutation.graphql";

type RelayLinkedRecord = {
  getDataID(): string;
  getValue(key: string): unknown;
  setValue(value: unknown, key: string): void;
};

const SYSTEM_SKILL_GROUP_ID = "system";

const skillsPageQueryNode = graphql`
  query skillsPageQuery {
    Agents {
      id
      name
    }
    SkillGroups {
      id
      name
    }
    GithubRepositories {
      id
      name
      fullName
      defaultBranch
      archived
    }
    Skills {
      id
      name
      skillGroupId
      skillType
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
      skillType
      repository
      skillDirectory
      fileList
    }
  }
`;

const skillsPageAttachSkillToAgentMutationNode = graphql`
  mutation skillsPageAttachSkillToAgentMutation($input: AttachSkillToAgentInput!) {
    AttachSkillToAgent(input: $input) {
      id
      name
      description
      skillGroupId
      skillType
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
      skillType
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
      skillType
      repository
      skillDirectory
      fileList
    }
  }
`;

const githubSkillImportRelayUpdater = new GithubSkillImportRelayUpdater();

function SkillsPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6 md:-mx-2 lg:-mx-3">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader className="px-2 md:px-3 lg:px-4">
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
        <CardContent className="px-2 md:px-3 lg:px-4">
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
  const toast = useToast();
  const [assignmentErrorMessage, setAssignmentErrorMessage] = useState<string | null>(null);
  const [assignmentResources, setAssignmentResources] = useState<AgentAssignmentResource[]>([]);
  const [deletingSkillId, setDeletingSkillId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isAssigningSkills, setAssigningSkills] = useState(false);
  const [isAssignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const assignmentDialogCanCloseRef = useRef(true);
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
  const [commitAttachSkillToAgent] = useMutation<skillsPageAttachSkillToAgentMutation>(
    skillsPageAttachSkillToAgentMutationNode,
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
  const agents = useMemo(() => {
    return [...data.Agents]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
      }));
  }, [data.Agents]);
  const groupOptions: CreateSkillDialogGroupOption[] = useMemo(() => {
    return [...data.SkillGroups]
      .filter((group) => group.id !== SYSTEM_SKILL_GROUP_ID)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((group) => ({
        id: group.id,
        name: group.name,
      }));
  }, [data.SkillGroups]);
  const installedRepositories = useMemo<CreateSkillDialogGithubRepositoryOption[]>(() => {
    return [...data.GithubRepositories]
      .filter((repository) => !repository.archived)
      .sort((left, right) => left.fullName.localeCompare(right.fullName))
      .map((repository) => ({
        defaultBranch: repository.defaultBranch,
        fullName: repository.fullName,
        id: repository.id,
        name: repository.name,
      }));
  }, [data.GithubRepositories]);

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
        skillType: skill.skillType,
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

  async function assignSkillsToAgents(agentIds: string[]) {
    if (isAssigningSkills) {
      return;
    }

    setAssignmentErrorMessage(null);
    setAssigningSkills(true);

    try {
      for (const skill of assignmentResources) {
        for (const agentId of agentIds) {
          await new Promise<void>((resolve, reject) => {
            commitAttachSkillToAgent({
              variables: {
                input: {
                  agentId,
                  skillId: skill.id,
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
        }
      }

      const skillCount = assignmentResources.length;
      setAssignmentDialogOpen(false);
      setAssignmentResources([]);
      toast.showSavedToast(
        `Added ${skillCount} skill${skillCount === 1 ? "" : "s"} to ${agentIds.length} agent${agentIds.length === 1 ? "" : "s"}`,
      );
    } catch (error: unknown) {
      setAssignmentErrorMessage(error instanceof Error ? error.message : "Failed to add skills to agents.");
    } finally {
      setAssigningSkills(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 md:-mx-2 lg:-mx-3">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader className="px-2 md:px-3 lg:px-4">
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
        <CardContent className="grid gap-4 px-2 md:px-3 lg:px-4">
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
        installedRepositories={installedRepositories}
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
              onCompleted: (response, errors) => {
                const nextErrorMessage = errors?.[0]?.message;
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                setCreateDialogOpen(false);
                setAssignmentErrorMessage(null);
                openAssignmentResources([{
                  id: response.CreateSkill.id,
                  name: response.CreateSkill.name,
                }]);
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
                githubSkillImportRelayUpdater.apply(store);
              },
              onCompleted: (response, errors) => {
                const nextErrorMessage = errors?.[0]?.message;
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                setCreateDialogOpen(false);
                setAssignmentErrorMessage(null);
                openAssignmentResources(response.ImportGithubSkills.map((skill) => ({
                  id: skill.id,
                  name: skill.name,
                })));
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
      <AgentAssignmentDialog
        agents={agents}
        errorMessage={assignmentErrorMessage}
        isAssigning={isAssigningSkills}
        isOpen={isAssignmentDialogOpen}
        onAssign={assignSkillsToAgents}
        onOpenChange={(open) => {
          if (open) {
            setAssignmentDialogOpen(true);
            return;
          }

          if (!assignmentDialogCanCloseRef.current) {
            return;
          }

          closeAssignmentDialog();
        }}
        resourceKind="skill"
        resources={assignmentResources}
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
