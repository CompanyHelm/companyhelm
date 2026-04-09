import { Suspense, useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { CreateSkillDialog, type CreateSkillDialogGroupOption } from "./create_skill_dialog";
import { SkillsTree, type SkillsTreeGroupRecord, type SkillsTreeSkillRecord } from "./skills_tree";
import type { skillsPageCreateSkillMutation } from "./__generated__/skillsPageCreateSkillMutation.graphql";
import type { skillsPageQuery } from "./__generated__/skillsPageQuery.graphql";
import type { skillsPageUpdateSkillMutation } from "./__generated__/skillsPageUpdateSkillMutation.graphql";

const skillsPageQueryNode = graphql`
  query skillsPageQuery {
    SkillGroups {
      id
      name
    }
    Skills {
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
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Organize your company skill catalog, group reusable guidance, and keep manual skills
              editable from the web UI.
            </CardDescription>
          </div>
          <CardAction>
            <Button disabled size="sm">
              <PlusIcon />
              Create skill
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <SkillsTree groups={[]} isLoading movingSkillId={null} onMoveSkill={async () => undefined} />
        </CardContent>
      </Card>
    </main>
  );
}

function SkillsPageContent() {
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
  const [commitUpdateSkill] = useMutation<skillsPageUpdateSkillMutation>(
    skillsPageUpdateSkillMutationNode,
  );
  const groupOptions: CreateSkillDialogGroupOption[] = useMemo(() => {
    return data.SkillGroups.map((group) => ({
      id: group.id,
      name: group.name,
    }));
  }, [data.SkillGroups]);
  const groupedSkills = useMemo<SkillsTreeGroupRecord[]>(() => {
    const skillsByGroupId = new Map<string | null, SkillsTreeSkillRecord[]>();
    const sortedSkills = [...data.Skills].sort((left, right) => left.name.localeCompare(right.name));

    for (const skill of sortedSkills) {
      const currentSkills = skillsByGroupId.get(skill.skillGroupId) ?? [];
      currentSkills.push({
        description: skill.description,
        fileCount: skill.fileList.length,
        id: skill.id,
        name: skill.name,
        repository: skill.repository,
        skillDirectory: skill.skillDirectory,
        skillGroupId: skill.skillGroupId,
      });
      skillsByGroupId.set(skill.skillGroupId, currentSkills);
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

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Organize your company skill catalog, group reusable guidance, and keep manual skills
              editable from the web UI.
            </CardDescription>
          </div>
          <CardAction>
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
            groups={groupedSkills}
            isLoading={false}
            movingSkillId={movingSkillId}
            onMoveSkill={moveSkill}
          />
        </CardContent>
      </Card>

      <CreateSkillDialog
        errorMessage={isCreateDialogOpen ? errorMessage : null}
        groups={groupOptions}
        isOpen={isCreateDialogOpen}
        isSaving={isCreateSkillInFlight}
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
                const currentSkills = rootRecord.getLinkedRecords("Skills") || [];
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
