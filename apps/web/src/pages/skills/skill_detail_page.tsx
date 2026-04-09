import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { GithubIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { EditableField } from "@/components/editable_field";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { skillDetailPageQuery } from "./__generated__/skillDetailPageQuery.graphql";
import type { skillDetailPageUpdateSkillMutation } from "./__generated__/skillDetailPageUpdateSkillMutation.graphql";

const UNGROUPED_SKILL_GROUP_VALUE = "__ungrouped__";

const skillDetailPageQueryNode = graphql`
  query skillDetailPageQuery($skillId: ID!) {
    Skill(id: $skillId) {
      id
      name
      description
      instructions
      skillGroupId
      repository
      skillDirectory
      fileList
    }
    SkillGroups {
      id
      name
    }
  }
`;

const skillDetailPageUpdateSkillMutationNode = graphql`
  mutation skillDetailPageUpdateSkillMutation($input: UpdateSkillInput!) {
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

function SkillDetailPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>Loading skill configuration…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading skill…
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * Hosts the editable skill detail view, including inline field updates and group reassignment.
 */
function SkillDetailPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { skillId } = useParams({ strict: false });
  const { setDetailLabel } = useApplicationBreadcrumb();
  const normalizedSkillId = String(skillId || "").trim();
  if (!normalizedSkillId) {
    throw new Error("Skill ID is required.");
  }

  const data = useLazyLoadQuery<skillDetailPageQuery>(
    skillDetailPageQueryNode,
    {
      skillId: normalizedSkillId,
    },
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitUpdateSkill] = useMutation<skillDetailPageUpdateSkillMutation>(
    skillDetailPageUpdateSkillMutationNode,
  );
  const skill = data.Skill;
  const skillGroupOptions = useMemo(() => {
    return [{
      label: "Ungrouped",
      value: UNGROUPED_SKILL_GROUP_VALUE,
    }, ...data.SkillGroups.map((group) => ({
      label: group.name,
      value: group.id,
    }))];
  }, [data.SkillGroups]);
  const activeSkillGroupName = data.SkillGroups.find((group) => group.id === skill.skillGroupId)?.name ?? "Ungrouped";
  const sourceLabel = skill.repository ? "GitHub" : "Manual";

  useEffect(() => {
    setDetailLabel(skill.name);

    return () => {
      setDetailLabel(null);
    };
  }, [setDetailLabel, skill.name]);

  async function updateSkill(input: {
    description?: string;
    instructions?: string;
    name?: string;
    skillGroupId?: string | null;
  }) {
    setErrorMessage(null);

    await new Promise<void>((resolve, reject) => {
      commitUpdateSkill({
        variables: {
          input: {
            description: input.description,
            id: normalizedSkillId,
            instructions: input.instructions,
            name: input.name,
            skillGroupId: input.skillGroupId,
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
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update skill.");
      throw error;
    });
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>
            Keep the skill instructions current, move the skill between groups, and inspect its
            source metadata.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <EditableField
            emptyValueLabel="No name"
            fieldType="text"
            label="Name"
            onSave={async (value) => {
              await updateSkill({
                name: value,
              });
            }}
            value={skill.name}
          />
          <EditableField
            emptyValueLabel="No group"
            fieldType="select"
            label="Group"
            onSave={async (value) => {
              await updateSkill({
                skillGroupId: value === UNGROUPED_SKILL_GROUP_VALUE ? null : value,
              });
            }}
            options={skillGroupOptions}
            value={skill.skillGroupId ?? UNGROUPED_SKILL_GROUP_VALUE}
            displayValue={activeSkillGroupName}
          />
          <EditableField
            emptyValueLabel="No description"
            fieldType="textarea"
            label="Description"
            onSave={async (value) => {
              await updateSkill({
                description: value,
              });
            }}
            value={skill.description}
          />
          <EditableField
            emptyValueLabel="No instructions"
            fieldType="textarea"
            label="Instructions"
            onSave={async (value) => {
              await updateSkill({
                instructions: value,
              });
            }}
            readOnlyFormat="markdown"
            value={skill.instructions}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>Source metadata for this skill.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Source
            </p>
            <div className="mt-3 flex items-center gap-2">
              {skill.repository ? <GithubIcon className="size-4 text-foreground" /> : null}
              <p className="text-sm font-semibold text-foreground">{sourceLabel}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Files
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="outline">{skill.fileList.length}</Badge>
              <p className="text-sm text-foreground">Tracked files</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Repository
            </p>
            <p className="mt-3 text-sm text-foreground">{skill.repository ?? "—"}</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Skill directory
            </p>
            <p className="mt-3 text-sm text-foreground">{skill.skillDirectory ?? "—"}</p>
          </div>

          <div className="sm:col-span-2 rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              File inventory
            </p>
            {skill.fileList.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No tracked files on this skill yet.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {skill.fileList.map((filePath) => (
                  <Badge key={filePath} variant="secondary">
                    {filePath}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export function SkillDetailPage() {
  return (
    <Suspense fallback={<SkillDetailPageFallback />}>
      <SkillDetailPageContent />
    </Suspense>
  );
}
