import { useMemo, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  GithubIcon,
  SparklesIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type SkillsTreeSkillRecord = {
  description: string;
  fileCount: number;
  id: string;
  name: string;
  repository: string | null;
  skillDirectory: string | null;
  skillGroupId: string | null;
};

export type SkillsTreeGroupRecord = {
  id: string | null;
  name: string;
  skills: SkillsTreeSkillRecord[];
};

interface SkillsTreeProps {
  groups: SkillsTreeGroupRecord[];
  isLoading: boolean;
  movingSkillId: string | null;
  onMoveSkill(skillId: string, skillGroupId: string | null): Promise<void>;
}

/**
 * Renders the skill catalog as an expandable directory tree and uses HTML5 drag-and-drop to move a
 * skill between groups without needing a heavier client-side dependency.
 */
export function SkillsTree(props: SkillsTreeProps) {
  const navigate = useNavigate();
  const [dropTargetKey, setDropTargetKey] = useState("");
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Record<string, boolean>>({});
  const suppressOpenSkillIdRef = useRef<string | null>(null);
  const groups = useMemo(() => {
    return props.groups.map((group) => ({
      ...group,
      key: group.id ?? "__ungrouped__",
    }));
  }, [props.groups]);

  if (props.isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        Loading skills…
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No skills yet</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Create a manual skill to start building a reusable company skill catalog.
        </p>
      </div>
    );
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>, skillGroupId: string | null, groupKey: string) {
    event.preventDefault();
    setDropTargetKey("");
    const skillId = event.dataTransfer.getData("text/skill-id");
    if (!skillId) {
      return;
    }

    await props.onMoveSkill(skillId, skillGroupId);
    setDropTargetKey((currentKey) => currentKey === groupKey ? "" : currentKey);
  }

  return (
    <div className="grid gap-3">
      {groups.map((group) => {
        const isExpanded = expandedGroupKeys[group.key] ?? true;
        const GroupIcon = isExpanded ? FolderOpenIcon : FolderIcon;

        return (
          <Card key={group.key} className="border border-border/60 bg-card/70 shadow-sm">
            <button
              aria-expanded={isExpanded}
              className="flex w-full items-center justify-between gap-3 rounded-t-xl px-4 py-3 text-left transition hover:bg-accent/30"
              onClick={() => {
                setExpandedGroupKeys((currentState) => ({
                  ...currentState,
                  [group.key]: !(currentState[group.key] ?? true),
                }));
              }}
              type="button"
            >
              <div className="flex min-w-0 items-center gap-3">
                {isExpanded ? <ChevronDownIcon className="size-4 text-muted-foreground" /> : <ChevronRightIcon className="size-4 text-muted-foreground" />}
                <GroupIcon className="size-4 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{group.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.skills.length} {group.skills.length === 1 ? "skill" : "skills"}
                  </p>
                </div>
              </div>
              <Badge variant="outline">{group.skills.length}</Badge>
            </button>

            {isExpanded ? (
              <CardContent
                className={`grid gap-2 border-t border-border/60 p-3 ${dropTargetKey === group.key ? "rounded-b-xl bg-accent/25" : ""}`}
                onDragLeave={() => {
                  setDropTargetKey((currentKey) => currentKey === group.key ? "" : currentKey);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropTargetKey(group.key);
                }}
                onDrop={(event) => void handleDrop(event, group.id, group.key)}
              >
                {group.skills.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-xs text-muted-foreground">
                    Drop skills here.
                  </div>
                ) : null}

                {group.skills.map((skill) => (
                  <article
                    key={skill.id}
                    className={`cursor-grab rounded-xl border border-border/60 bg-background/90 px-4 py-3 shadow-sm transition hover:border-primary/40 hover:shadow-md active:cursor-grabbing ${props.movingSkillId === skill.id ? "opacity-60" : ""}`}
                    draggable
                    onClick={() => {
                      if (suppressOpenSkillIdRef.current === skill.id) {
                        return;
                      }

                      void navigate({
                        params: {
                          skillId: skill.id,
                        },
                        to: "/skills/$skillId",
                      });
                    }}
                    onDragEnd={() => {
                      window.setTimeout(() => {
                        if (suppressOpenSkillIdRef.current === skill.id) {
                          suppressOpenSkillIdRef.current = null;
                        }
                      }, 0);
                    }}
                    onDragStart={(event) => {
                      suppressOpenSkillIdRef.current = skill.id;
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/skill-id", skill.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") {
                        return;
                      }

                      event.preventDefault();
                      void navigate({
                        params: {
                          skillId: skill.id,
                        },
                        to: "/skills/$skillId",
                      });
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <SparklesIcon className="size-4 text-primary" />
                          <p className="truncate text-sm font-semibold text-foreground">{skill.name}</p>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs/relaxed text-muted-foreground">
                          {skill.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <Badge variant="outline">{skill.fileCount} files</Badge>
                        {skill.repository ? (
                          <Badge className="gap-1" variant="secondary">
                            <GithubIcon className="size-3" />
                            GitHub
                          </Badge>
                        ) : (
                          <Badge variant="outline">Manual</Badge>
                        )}
                      </div>
                    </div>

                    {(skill.repository || skill.skillDirectory) ? (
                      <div className="mt-3 grid gap-1 text-[11px] text-muted-foreground">
                        {skill.repository ? <p className="truncate">{skill.repository}</p> : null}
                        {skill.skillDirectory ? <p className="truncate">{skill.skillDirectory}</p> : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </CardContent>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
