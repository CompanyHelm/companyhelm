import { useMemo, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  GithubIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type SkillsTreeSkillRecord = {
  fileCount: number;
  id: string;
  name: string;
  repository: string | null;
  skillGroupId: string | null;
};

export type SkillsTreeGroupRecord = {
  id: string | null;
  name: string;
  skills: SkillsTreeSkillRecord[];
};

interface SkillsTreeProps {
  deletingSkillId: string | null;
  groups: SkillsTreeGroupRecord[];
  isLoading: boolean;
  movingSkillId: string | null;
  onDeleteSkill(skillId: string): Promise<void>;
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
    <div className="grid gap-2.5">
      {groups.map((group) => {
        const isExpanded = expandedGroupKeys[group.key] ?? true;
        const GroupIcon = isExpanded ? FolderOpenIcon : FolderIcon;

        return (
          <Card key={group.key} className="border border-border/60 bg-card/70 shadow-sm">
            <button
              aria-expanded={isExpanded}
              className="flex w-full items-center justify-between gap-3 rounded-t-xl px-4 py-2.5 text-left transition hover:bg-accent/30"
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
                </div>
              </div>
              <Badge variant="outline">{group.skills.length}</Badge>
            </button>

            {isExpanded ? (
              <CardContent
                className={`grid gap-2 border-t border-border/60 p-2.5 ${dropTargetKey === group.key ? "rounded-b-xl bg-accent/25" : ""}`}
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
                  <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-center text-xs text-muted-foreground">
                    Drop skills here.
                  </div>
                ) : null}

                {group.skills.map((skill) => (
                  <article
                    key={skill.id}
                    className={`cursor-grab rounded-lg border border-border/60 bg-background/90 px-3 py-2.5 shadow-sm transition hover:border-primary/40 hover:shadow-md active:cursor-grabbing ${(props.movingSkillId === skill.id || props.deletingSkillId === skill.id) ? "opacity-60" : ""}`}
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
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <SparklesIcon className="size-4 shrink-0 text-primary" />
                        <p className="truncate text-sm font-semibold text-foreground">{skill.name}</p>
                      </div>
                      <div className="flex shrink-0 items-center justify-end gap-2">
                        <Badge variant="outline">{skill.fileCount} files</Badge>
                        {skill.repository ? (
                          <Badge className="gap-1" variant="secondary">
                            <GithubIcon className="size-3" />
                            GitHub
                          </Badge>
                        ) : (
                          <Badge variant="outline">Manual</Badge>
                        )}
                        <button
                          aria-label={`Delete ${skill.name}`}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={props.deletingSkillId === skill.id}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void props.onDeleteSkill(skill.id);
                          }}
                          type="button"
                        >
                          <Trash2Icon className="size-4" />
                        </button>
                      </div>
                    </div>
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
