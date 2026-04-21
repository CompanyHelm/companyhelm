import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { GithubIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { EditableField } from "@/components/editable_field";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page_tabs";
import { OrganizationPath } from "@/lib/organization_path";
import { cn } from "@/lib/utils";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import type { skillDetailPageQuery } from "./__generated__/skillDetailPageQuery.graphql";
import type { skillDetailPageUpdateSkillMutation } from "./__generated__/skillDetailPageUpdateSkillMutation.graphql";

const UNGROUPED_SKILL_GROUP_VALUE = "__ungrouped__";
const SYSTEM_SKILL_GROUP_ID = "system";

type SkillDetailPageTab = "overview" | "source";

const skillDetailPageTabs: Array<{ key: SkillDetailPageTab; label: string }> = [
  {
    key: "overview",
    label: "Overview",
  },
  {
    key: "source",
    label: "Source",
  },
];

const skillDetailPageQueryNode = graphql`
  query skillDetailPageQuery($skillId: ID!) {
    Skill(id: $skillId) {
      id
      name
      description
      instructions
      skillGroupId
      skillType
      systemKey
      systemCommands {
        id
        description
        inputSchema
      }
      repository
      repositoryUrl
      skillDirectory
      skillDirectoryUrl
      fileList
      fileInventory {
        path
        url
      }
      githubBranchName
      githubBranchSkillFileUrl
      githubTrackedCommitSha
      githubTrackedCommitSkillFileUrl
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
      skillType
      repository
      repositoryUrl
      skillDirectory
      skillDirectoryUrl
      fileList
      fileInventory {
        path
        url
      }
      githubBranchName
      githubBranchSkillFileUrl
      githubTrackedCommitSha
      githubTrackedCommitSkillFileUrl
    }
  }
`;

function SkillDetailPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
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

function SkillSourceValue(props: {
  children: ReactNode;
  className?: string;
  href?: string | null;
}) {
  const className = cn(
    "mt-3 break-all text-sm text-foreground",
    props.href ? "inline-block underline-offset-4 hover:underline" : null,
    props.className,
  );

  if (!props.href) {
    return <p className={className}>{props.children}</p>;
  }

  return (
    <a className={className} href={props.href} rel="noreferrer" target="_blank">
      {props.children}
    </a>
  );
}

/**
 * Hosts the editable skill detail view, including inline field updates and group reassignment.
 */
function SkillDetailPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const { skillId } = useParams({ strict: false }) as { skillId?: string };
  const search = useSearch({ strict: false }) as { tab?: SkillDetailPageTab };
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
    }, ...data.SkillGroups
      .filter((group) => group.id !== SYSTEM_SKILL_GROUP_ID)
      .map((group) => ({
        label: group.name,
        value: group.id,
      }))];
  }, [data.SkillGroups]);
  const activeSkillGroupName = data.SkillGroups.find((group) => group.id === skill.skillGroupId)?.name ?? "Ungrouped";
  const isSystemSkill = skill.skillType === "system";
  const isRepositorySkill = Boolean(skill.repository);
  const isGithubSkill = Boolean(skill.repositoryUrl);
  const selectedTab: SkillDetailPageTab = search.tab === "source" ? "source" : "overview";
  let sourceLabel = "Manual";
  if (isSystemSkill) {
    sourceLabel = "System skill";
  } else if (isGithubSkill) {
    sourceLabel = "GitHub";
  } else if (isRepositorySkill) {
    sourceLabel = "Git repository";
  }

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
      <PageTabs
        items={skillDetailPageTabs}
        onSelect={(tab) => {
          void navigate({
            params: {
              organizationSlug,
              skillId: skill.id,
            },
            search: {
              tab,
            },
            to: OrganizationPath.route("/skills/$skillId"),
          });
        }}
        selectedKey={selectedTab}
      />

      {selectedTab === "overview" ? (
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <CardDescription>
              Keep the skill instructions current and move the skill between groups.
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
              readOnly={isSystemSkill}
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
              readOnly={isSystemSkill}
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
              readOnly={isSystemSkill}
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
              readOnly={isSystemSkill}
              value={skill.instructions}
            />
          </CardContent>
        </Card>
      ) : (
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <CardDescription>Source metadata for this skill.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-card/50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Source
              </p>
              <div className="mt-3 flex items-center gap-2">
                {isGithubSkill ? <GithubIcon className="size-4 text-foreground" /> : null}
                <p className="text-sm font-semibold text-foreground">{sourceLabel}</p>
              </div>
            </div>

            {isSystemSkill ? (
              <>
                <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    System key
                  </p>
                  <p className="mt-3 text-sm text-foreground">{skill.systemKey ?? "—"}</p>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/50 p-4 sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    System commands
                  </p>
                  <div className="mt-3 grid gap-3">
                    {skill.systemCommands.map((command) => (
                      <div key={command.id} className="rounded-lg border border-border/50 bg-background/40 p-3">
                        <p className="text-sm font-semibold text-foreground">{command.id}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{command.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {!isSystemSkill && !isRepositorySkill ? (
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Storage
                </p>
                <p className="mt-3 text-sm text-foreground">Web-managed instructions</p>
              </div>
            ) : null}

            {isRepositorySkill ? (
              <>
                <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Repository
                  </p>
                  <SkillSourceValue href={skill.repositoryUrl}>{skill.repository ?? "—"}</SkillSourceValue>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Tracking branch
                  </p>
                  <SkillSourceValue href={skill.githubBranchSkillFileUrl}>
                    {skill.githubBranchName ?? "—"}
                  </SkillSourceValue>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Current tracked SHA
                  </p>
                  <SkillSourceValue className="font-mono" href={skill.githubTrackedCommitSkillFileUrl}>
                    {skill.githubTrackedCommitSha ?? "—"}
                  </SkillSourceValue>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Skill directory in repo
                  </p>
                  <SkillSourceValue href={skill.skillDirectoryUrl}>
                    {skill.skillDirectory ?? "—"}
                  </SkillSourceValue>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Files
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="outline">{skill.fileInventory.length}</Badge>
                    <p className="text-sm text-foreground">Tracked files</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/50 p-4 sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    File inventory
                  </p>
                  {skill.fileInventory.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">No tracked files on this skill yet.</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skill.fileInventory.map((file) => (
                        file.url ? (
                          <Badge
                            key={file.path}
                            render={<a href={file.url} rel="noreferrer" target="_blank" />}
                            variant="secondary"
                          >
                            {file.path}
                          </Badge>
                        ) : (
                          <Badge key={file.path} variant="secondary">
                            {file.path}
                          </Badge>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}
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
