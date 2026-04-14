import { useMemo, useRef, useState, type DragEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";

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
  const organizationSlug = useCurrentOrganizationSlug();
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

  async function handleDrop(event: DragEvent<HTMLElement>, skillGroupId: string | null, groupKey: string) {
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
    <div className="grid gap-1">
      {groups.map((group) => {
        const isExpanded = expandedGroupKeys[group.key] ?? true;
        const GroupIcon = isExpanded ? FolderOpenIcon : FolderIcon;
        const isDropTarget = dropTargetKey === group.key;

        return (
          <section className="grid gap-0.5" key={group.key}>
            <button
              aria-expanded={isExpanded}
              className={`flex min-h-7 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition ${isDropTarget ? "bg-accent/25" : "hover:bg-accent/20"}`}
              onDragLeave={() => {
                setDropTargetKey((currentKey) => currentKey === group.key ? "" : currentKey);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTargetKey(group.key);
              }}
              onDrop={(event) => void handleDrop(event, group.id, group.key)}
              onClick={() => {
                setExpandedGroupKeys((currentState) => ({
                  ...currentState,
                  [group.key]: !(currentState[group.key] ?? true),
                }));
              }}
              type="button"
            >
              <div className="flex min-w-0 items-center gap-2">
                {isExpanded ? <ChevronDownIcon className="size-3.5 text-muted-foreground" /> : <ChevronRightIcon className="size-3.5 text-muted-foreground" />}
                <GroupIcon className="size-3.5 text-primary" />
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{group.name}</p>
                  <span className="shrink-0 text-[0.7rem] font-medium text-muted-foreground">
                    {group.skills.length}
                  </span>
                </div>
              </div>
            </button>

            {isExpanded ? (
              <div
                className={`grid gap-0.5 pl-3 ${isDropTarget ? "rounded-md bg-accent/10" : ""}`}
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
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Drop skills here.</div>
                ) : null}

                {group.skills.map((skill) => (
                  <article
                    key={skill.id}
                    className={`cursor-grab rounded-md transition active:cursor-grabbing ${(props.movingSkillId === skill.id || props.deletingSkillId === skill.id) ? "opacity-60" : ""}`}
                    draggable
                    onClick={() => {
                      if (suppressOpenSkillIdRef.current === skill.id) {
                        return;
                      }

                      void navigate({
                        params: {
                          organizationSlug,
                          skillId: skill.id,
                        },
                        to: OrganizationPath.route("/skills/$skillId"),
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
                          organizationSlug,
                          skillId: skill.id,
                        },
                        to: OrganizationPath.route("/skills/$skillId"),
                      });
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex min-h-7 items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-accent/20">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <SparklesIcon className="size-3.5 shrink-0 text-primary" />
                        <p className="truncate text-sm font-medium text-foreground">{skill.name}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-[0.7rem] text-muted-foreground">
                        <span>{skill.fileCount} files</span>
                        <span>{skill.repository ? "GitHub" : "Manual"}</span>
                        <button
                          aria-label={`Delete ${skill.name}`}
                          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={props.deletingSkillId === skill.id}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void props.onDeleteSkill(skill.id);
                          }}
                          type="button"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
