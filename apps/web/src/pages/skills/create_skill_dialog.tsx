import { useEffect, useState } from "react";
import { GithubIcon, PencilRulerIcon } from "lucide-react";
import { fetchQuery, graphql, useRelayEnvironment } from "react-relay";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { createSkillDialogGithubSkillDirectoriesQuery } from "./__generated__/createSkillDialogGithubSkillDirectoriesQuery.graphql";

export type CreateSkillDialogGroupOption = {
  id: string;
  name: string;
};

export type CreateSkillDialogGithubRepositoryOption = {
  archived: boolean;
  fullName: string;
  id: string;
};

type CreateSkillDialogGithubDirectoryOption = {
  fileList: string[];
  name: string;
  path: string;
};

interface CreateSkillDialogProps {
  errorMessage: string | null;
  groups: CreateSkillDialogGroupOption[];
  githubRepositories: CreateSkillDialogGithubRepositoryOption[];
  isOpen: boolean;
  isSaving: boolean;
  onCreate(input: {
    description: string;
    instructions: string;
    name: string;
    skillGroupId?: string | null;
  }): Promise<void>;
  onImportGithub(input: {
    repositoryId: string;
    skillDirectory: string;
    skillGroupId?: string | null;
  }): Promise<void>;
  onOpenChange(open: boolean): void;
}

const UNGROUPED_SKILL_GROUP_VALUE = "__ungrouped__";

type CreateSkillDialogMode = "choose" | "github" | "manual";

const createSkillDialogGithubSkillDirectoriesQueryNode = graphql`
  query createSkillDialogGithubSkillDirectoriesQuery($repositoryId: ID!) {
    GithubSkillDirectories(repositoryId: $repositoryId) {
      name
      path
      fileList
    }
  }
`;

/**
 * Hosts the new-skill flow, starting with a source chooser and then branching into either manual
 * authoring or GitHub-backed import from linked repositories.
 */
export function CreateSkillDialog(props: CreateSkillDialogProps) {
  const environment = useRelayEnvironment();
  const [description, setDescription] = useState("");
  const [githubRepositoryId, setGithubRepositoryId] = useState("");
  const [githubSkillDirectories, setGithubSkillDirectories] = useState<CreateSkillDialogGithubDirectoryOption[]>([]);
  const [githubSkillDirectoryPath, setGithubSkillDirectoryPath] = useState("");
  const [isLoadingGithubSkillDirectories, setIsLoadingGithubSkillDirectories] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<CreateSkillDialogMode>("choose");
  const [name, setName] = useState("");
  const [skillGroupId, setSkillGroupId] = useState(UNGROUPED_SKILL_GROUP_VALUE);

  useEffect(() => {
    if (!props.isOpen) {
      setDescription("");
      setGithubRepositoryId("");
      setGithubSkillDirectories([]);
      setGithubSkillDirectoryPath("");
      setIsLoadingGithubSkillDirectories(false);
      setInstructions("");
      setLocalErrorMessage(null);
      setMode("choose");
      setName("");
      setSkillGroupId(UNGROUPED_SKILL_GROUP_VALUE);
    }
  }, [props.isOpen]);

  useEffect(() => {
    if (mode !== "github") {
      return;
    }
    if (!githubRepositoryId) {
      setGithubSkillDirectories([]);
      setGithubSkillDirectoryPath("");
      setIsLoadingGithubSkillDirectories(false);
      return;
    }

    let isMounted = true;
    setIsLoadingGithubSkillDirectories(true);
    setGithubSkillDirectoryPath("");
    setLocalErrorMessage(null);

    void fetchQuery<createSkillDialogGithubSkillDirectoriesQuery>(
      environment,
      createSkillDialogGithubSkillDirectoriesQueryNode,
      {
        repositoryId: githubRepositoryId,
      },
    )
      .toPromise()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setGithubSkillDirectories(
          (response?.GithubSkillDirectories ?? []).map((directory) => ({
            fileList: [...directory.fileList],
            name: directory.name,
            path: directory.path,
          })),
        );
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setGithubSkillDirectories([]);
        setLocalErrorMessage(
          error instanceof Error ? error.message : "Failed to load GitHub skill directories.",
        );
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }

        setIsLoadingGithubSkillDirectories(false);
      });

    return () => {
      isMounted = false;
    };
  }, [environment, githubRepositoryId, mode]);

  const selectedGithubSkillDirectory = githubSkillDirectories.find((directory) =>
    directory.path === githubSkillDirectoryPath
  );

  return (
    <Dialog disablePointerDismissal onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create skill</DialogTitle>
          <DialogDescription>
            Add a reusable skill for your company, either by creating it manually now or by
            importing a linked GitHub skill package.
          </DialogDescription>
        </DialogHeader>

        {mode === "choose" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <button
              className={cn(
                "group flex min-h-52 flex-col rounded-2xl border border-border/70 bg-card/60 p-5 text-left transition hover:border-foreground/30 hover:bg-accent/20",
              )}
              onClick={() => {
                setMode("github");
              }}
              type="button"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background/90">
                  <GithubIcon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Import from GitHub</p>
                  <p className="text-xs text-muted-foreground">Discover linked `SKILL.md` packages</p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Linked repositories
                </p>
                <p className="mt-3 text-sm text-foreground">
                  Browse repositories from your GitHub installations, choose a discovered skill
                  directory, and import its tracked files into the catalog.
                </p>
              </div>
              <p className="mt-auto pt-5 text-xs text-muted-foreground">
                Best for existing skill packages that already live in source control.
              </p>
            </button>

            <button
              className={cn(
                "group flex min-h-52 flex-col rounded-2xl border border-border/70 bg-card/60 p-5 text-left transition hover:border-primary/40 hover:bg-primary/5",
              )}
              onClick={() => {
                setMode("manual");
              }}
              type="button"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                  <PencilRulerIcon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Create manually</p>
                  <p className="text-xs text-muted-foreground">Write the skill directly in the app</p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Included now
                </p>
                <p className="mt-3 text-sm text-foreground">
                  Capture the skill name, summary, instructions, and optional group assignment in one
                  step.
                </p>
              </div>
              <p className="mt-auto pt-5 text-xs text-muted-foreground">
                Best for brand-new skills or quick internal guidance.
              </p>
            </button>
          </div>
        ) : null}

        {mode === "github" ? (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-background/80">
                  <GithubIcon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">GitHub import</p>
                  <p className="text-xs text-muted-foreground">
                    Import any linked repository directory that contains `SKILL.md`.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-medium text-foreground" htmlFor="skill-repository">
                  Repository
                </label>
                <Select
                  items={props.githubRepositories.map((repository) => ({
                    label: repository.archived ? `${repository.fullName} (archived)` : repository.fullName,
                    value: repository.id,
                  }))}
                  onValueChange={(value) => {
                    setGithubRepositoryId(typeof value === "string" ? value : "");
                    setGithubSkillDirectories([]);
                    setGithubSkillDirectoryPath("");
                    setLocalErrorMessage(null);
                  }}
                  value={githubRepositoryId || undefined}
                >
                  <SelectTrigger id="skill-repository">
                    <SelectValue
                      placeholder={props.githubRepositories.length > 0
                        ? "Select a linked repository"
                        : "No linked repositories"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {props.githubRepositories.map((repository) => (
                      <SelectItem key={repository.id} value={repository.id}>
                        {repository.archived ? `${repository.fullName} (archived)` : repository.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-medium text-foreground" htmlFor="skill-directory">
                  Skill directory
                </label>
                <Select
                  items={githubSkillDirectories.map((directory) => ({
                    label: directory.path,
                    value: directory.path,
                  }))}
                  onValueChange={(value) => {
                    setGithubSkillDirectoryPath(typeof value === "string" ? value : "");
                    setLocalErrorMessage(null);
                  }}
                  value={githubSkillDirectoryPath || undefined}
                >
                  <SelectTrigger
                    className={cn(
                      isLoadingGithubSkillDirectories ? "animate-pulse" : null,
                    )}
                    id="skill-directory"
                  >
                    <SelectValue
                      placeholder={!githubRepositoryId
                        ? "Select a repository first"
                        : isLoadingGithubSkillDirectories
                        ? "Loading discovered skills..."
                        : githubSkillDirectories.length > 0
                        ? "Select a discovered skill"
                        : "No SKILL.md directories found"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {githubSkillDirectories.map((directory) => (
                      <SelectItem key={directory.path} value={directory.path}>
                        {directory.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="github-skill-group">
                Group
              </label>
              <Select
                items={[
                  {
                    label: "Ungrouped",
                    value: UNGROUPED_SKILL_GROUP_VALUE,
                  },
                  ...props.groups.map((group) => ({
                    label: group.name,
                    value: group.id,
                  })),
                ]}
                onValueChange={(value) => {
                  setSkillGroupId(value ?? UNGROUPED_SKILL_GROUP_VALUE);
                }}
                value={skillGroupId}
              >
                <SelectTrigger id="github-skill-group">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNGROUPED_SKILL_GROUP_VALUE}>Ungrouped</SelectItem>
                  {props.groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedGithubSkillDirectory ? (
              <div className="grid gap-3 rounded-xl border border-border/60 bg-card/40 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Skill
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {selectedGithubSkillDirectory.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedGithubSkillDirectory.path}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Files
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {selectedGithubSkillDirectory.fileList.length} tracked file
                    {selectedGithubSkillDirectory.fileList.length === 1 ? "" : "s"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    `SKILL.md` will be imported as instructions.
                  </p>
                </div>
              </div>
            ) : null}

            {props.githubRepositories.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                Link a GitHub installation first, then come back to import one of its skill
                directories.
              </div>
            ) : null}

            {!isLoadingGithubSkillDirectories && githubRepositoryId && githubSkillDirectories.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                No skill packages were discovered in this repository. A directory must contain
                `SKILL.md` to be importable.
              </div>
            ) : null}

            {localErrorMessage || props.errorMessage ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {localErrorMessage || props.errorMessage}
              </div>
            ) : null}
          </div>
        ) : null}

        {mode === "manual" ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="skill-name">
                Name
              </label>
              <Input
                autoComplete="off"
                id="skill-name"
                onChange={(event) => {
                  setName(event.target.value);
                }}
                placeholder="Playwright CLI"
                value={name}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="skill-group">
                Group
              </label>
              <Select
                items={[
                  {
                    label: "Ungrouped",
                    value: UNGROUPED_SKILL_GROUP_VALUE,
                  },
                  ...props.groups.map((group) => ({
                    label: group.name,
                    value: group.id,
                  })),
                ]}
                onValueChange={(value) => {
                  setSkillGroupId(value ?? UNGROUPED_SKILL_GROUP_VALUE);
                }}
                value={skillGroupId}
              >
                <SelectTrigger id="skill-group">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNGROUPED_SKILL_GROUP_VALUE}>Ungrouped</SelectItem>
                  {props.groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="skill-description">
                Description
              </label>
              <textarea
                autoComplete="off"
                className={cn(
                  "min-h-24 w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                )}
                id="skill-description"
                onChange={(event) => {
                  setDescription(event.target.value);
                }}
                placeholder="Reusable browser automation guidance for agent sessions."
                value={description}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="skill-instructions">
                Instructions
              </label>
              <textarea
                autoComplete="off"
                className={cn(
                  "min-h-40 w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                )}
                id="skill-instructions"
                onChange={(event) => {
                  setInstructions(event.target.value);
                }}
                placeholder="Read SKILL.md first, then prefer the browser helper scripts if available..."
                value={instructions}
              />
            </div>

            {localErrorMessage || props.errorMessage ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {localErrorMessage || props.errorMessage}
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          {mode !== "choose" ? (
            <Button
              onClick={() => {
                setLocalErrorMessage(null);
                setMode("choose");
              }}
              type="button"
              variant="outline"
            >
              Back
            </Button>
          ) : null}
          <Button
            onClick={() => {
              props.onOpenChange(false);
            }}
            type="button"
            variant="ghost"
          >
            {mode === "choose" ? "Close" : "Cancel"}
          </Button>
          {mode === "manual" ? (
            <Button
              disabled={props.isSaving || !name.trim() || !description.trim() || !instructions.trim()}
              onClick={async () => {
                setLocalErrorMessage(null);

                try {
                  await props.onCreate({
                    description: description.trim(),
                    instructions: instructions.trim(),
                    name: name.trim(),
                    skillGroupId: skillGroupId === UNGROUPED_SKILL_GROUP_VALUE ? null : skillGroupId,
                  });
                } catch (error) {
                  setLocalErrorMessage(error instanceof Error ? error.message : "Failed to create skill.");
                }
              }}
              type="button"
            >
              Create skill
            </Button>
          ) : null}
          {mode === "github" ? (
            <Button
              disabled={props.isSaving || isLoadingGithubSkillDirectories || !githubRepositoryId || !githubSkillDirectoryPath}
              onClick={async () => {
                setLocalErrorMessage(null);

                try {
                  await props.onImportGithub({
                    repositoryId: githubRepositoryId,
                    skillDirectory: githubSkillDirectoryPath,
                    skillGroupId: skillGroupId === UNGROUPED_SKILL_GROUP_VALUE ? null : skillGroupId,
                  });
                } catch (error) {
                  setLocalErrorMessage(
                    error instanceof Error ? error.message : "Failed to import GitHub skill.",
                  );
                }
              }}
              type="button"
            >
              Import skill
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
