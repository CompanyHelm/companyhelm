import { useMemo, useRef, useState, type DragEvent } from "react";
import { ChevronDownIcon, ChevronRightIcon, FolderIcon, FolderOpenIcon } from "lucide-react";

export type SecretsTreeSecretRecord = {
  createdAt: string;
  description: string | null;
  envVarName: string;
  id: string;
  name: string;
  secretGroupId: string | null;
  updatedAt: string;
};

export type SecretsTreeGroupRecord = {
  id: string | null;
  name: string;
  secrets: SecretsTreeSecretRecord[];
};

interface SecretsTreeProps {
  deletingSecretId: string | null;
  groups: SecretsTreeGroupRecord[];
  isLoading: boolean;
  movingSecretId: string | null;
  onMoveSecret(secretId: string, secretGroupId: string | null): Promise<void>;
  onSelect(secretId: string): void;
}

/**
 * Renders company secrets as a compact tree that mirrors the skill tree interaction model,
 * including native drag-and-drop between groups without a heavier dependency.
 */
export function SecretsTree(props: SecretsTreeProps) {
  const [dropTargetKey, setDropTargetKey] = useState("");
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Record<string, boolean>>({});
  const suppressOpenSecretIdRef = useRef<string | null>(null);
  const groups = useMemo(() => {
    return props.groups.map((group) => ({
      ...group,
      key: group.id ?? "__ungrouped__",
    }));
  }, [props.groups]);

  async function handleDrop(event: DragEvent<HTMLElement>, secretGroupId: string | null, groupKey: string) {
    event.preventDefault();
    setDropTargetKey("");
    const secretId = event.dataTransfer.getData("text/secret-id");
    if (!secretId) {
      return;
    }

    await props.onMoveSecret(secretId, secretGroupId);
    setDropTargetKey((currentKey) => currentKey === groupKey ? "" : currentKey);
  }

  if (props.isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        Loading secrets…
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No secrets yet</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Create a company secret to make sensitive tokens available to session command execution.
        </p>
      </div>
    );
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
                {isExpanded ? (
                  <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRightIcon className="size-3.5 text-muted-foreground" />
                )}
                <GroupIcon className="size-3.5 text-primary" />
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{group.name}</p>
                  <span className="shrink-0 text-[0.7rem] font-medium text-muted-foreground">
                    {group.secrets.length}
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
                {group.secrets.length === 0 ? (
                  <div className="px-2.5 py-1.5 text-xs text-muted-foreground">
                    Drop secrets here.
                  </div>
                ) : null}

                {group.secrets.map((secret) => (
                  <article
                    className={`cursor-grab rounded-md transition active:cursor-grabbing ${(props.movingSecretId === secret.id || props.deletingSecretId === secret.id) ? "opacity-60" : ""}`}
                    draggable
                    key={secret.id}
                    onClick={() => {
                      if (suppressOpenSecretIdRef.current === secret.id) {
                        return;
                      }

                      props.onSelect(secret.id);
                    }}
                    onDragEnd={() => {
                      window.setTimeout(() => {
                        if (suppressOpenSecretIdRef.current === secret.id) {
                          suppressOpenSecretIdRef.current = null;
                        }
                      }, 0);
                    }}
                    onDragStart={(event) => {
                      suppressOpenSecretIdRef.current = secret.id;
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/secret-id", secret.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") {
                        return;
                      }

                      event.preventDefault();
                      props.onSelect(secret.id);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="min-h-7 truncate rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent/20">
                      {secret.name}
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
