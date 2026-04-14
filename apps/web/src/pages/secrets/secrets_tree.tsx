import { useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, FolderIcon, FolderOpenIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
  onSelect(secretId: string): void;
}

function formatTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

/**
 * Renders company secrets as an expandable folder tree so grouped and ungrouped secrets share the
 * same browsing model as skills while still opening the existing secret editor on selection.
 */
export function SecretsTree(props: SecretsTreeProps) {
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => {
    return props.groups.map((group) => ({
      ...group,
      key: group.id ?? "__ungrouped__",
    }));
  }, [props.groups]);

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
                {isExpanded ? (
                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                )}
                <GroupIcon className="size-4 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{group.name}</p>
                </div>
              </div>
              <Badge variant="outline">{group.secrets.length}</Badge>
            </button>

            {isExpanded ? (
              <CardContent className="grid gap-2 border-t border-border/60 p-2.5">
                {group.secrets.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-center text-xs text-muted-foreground">
                    No secrets in this group yet.
                  </div>
                ) : null}

                {group.secrets.map((secret) => (
                  <article
                    className={`rounded-lg border border-border/60 bg-background/90 px-3 py-3 shadow-sm transition hover:border-primary/40 hover:shadow-md ${(props.deletingSecretId === secret.id) ? "opacity-60" : ""}`}
                    key={secret.id}
                  >
                    <button
                      className="flex w-full flex-col gap-2 text-left"
                      onClick={() => {
                        props.onSelect(secret.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") {
                          return;
                        }

                        event.preventDefault();
                        props.onSelect(secret.id);
                      }}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="size-2 shrink-0 rounded-full bg-primary/80" />
                          <p className="truncate text-sm font-semibold text-foreground">{secret.name}</p>
                        </div>
                        <Badge className="font-mono" variant="outline">{secret.envVarName}</Badge>
                      </div>

                      <p className="text-xs/relaxed text-muted-foreground">
                        {secret.description?.trim() || "No description"}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-muted-foreground">
                        <span>Created {formatTimestamp(secret.createdAt)}</span>
                        <span>Updated {formatTimestamp(secret.updatedAt)}</span>
                      </div>
                    </button>
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
