import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FolderPlusIcon, GithubIcon, PencilRulerIcon } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { createSkillDialogGithubDiscoveredSkillsQuery } from "./__generated__/createSkillDialogGithubDiscoveredSkillsQuery.graphql";
import type { createSkillDialogGithubSkillBranchesQuery } from "./__generated__/createSkillDialogGithubSkillBranchesQuery.graphql";

export type CreateSkillDialogGroupOption = {
  id: string;
  name: string;
};

export type CreateSkillDialogGithubImportRecord = {
  name: string;
  skillDirectory: string;
  trackedFileCount: number;
};

export type CreateSkillDialogGithubImportSelectionRecord = {
  branchName: string;
  repository: string;
  skillDirectory: string;
};

type CreateSkillDialogGithubBranchOption = {
  commitSha: string;
  isDefault: boolean;
  name: string;
  repository: string;
};

interface CreateSkillDialogProps {
  errorMessage: string | null;
  groups: CreateSkillDialogGroupOption[];
  isOpen: boolean;
  isSaving: boolean;
  onCreate(input: {
    description: string;
    instructions: string;
    name: string;
    skillGroupId?: string | null;
  }): Promise<void>;
  onCreateGroup(name: string): Promise<CreateSkillDialogGroupOption>;
  onImportGithub(input: {
    skillGroupId?: string | null;
    skills: CreateSkillDialogGithubImportSelectionRecord[];
  }): Promise<void>;
  onOpenChange(open: boolean): void;
}

const UNGROUPED_SKILL_GROUP_VALUE = "__ungrouped__";
const GITHUB_BRANCH_DISCOVERY_DEBOUNCE_MS = 500;

type CreateSkillDialogMode = "choose" | "github" | "manual";
type CreateSkillDialogGithubStep = "repository" | "skills";

const createSkillDialogGithubSkillBranchesQueryNode = graphql`
  query createSkillDialogGithubSkillBranchesQuery($repositoryUrl: String!) {
    GithubSkillBranches(repositoryUrl: $repositoryUrl) {
      commitSha
      isDefault
      name
      repository
    }
  }
`;

const createSkillDialogGithubDiscoveredSkillsQueryNode = graphql`
  query createSkillDialogGithubDiscoveredSkillsQuery($repositoryUrl: String!, $branchName: String!) {
    GithubDiscoveredSkills(repositoryUrl: $repositoryUrl, branchName: $branchName) {
      name
      skillDirectory
      trackedFileCount
    }
  }
`;

/**
 * Hosts the new-skill flow, including a two-step GitHub import wizard that first resolves public
 * branches and then lets the user choose which discovered skills to create in the catalog.
 */
export function CreateSkillDialog(props: CreateSkillDialogProps) {
  const environment = useRelayEnvironment();
  const [description, setDescription] = useState("");
  const [draftSkillGroupName, setDraftSkillGroupName] = useState("");
  const [ephemeralSkillGroup, setEphemeralSkillGroup] = useState<CreateSkillDialogGroupOption | null>(null);
  const [githubBranchName, setGithubBranchName] = useState("");
  const [githubBranches, setGithubBranches] = useState<CreateSkillDialogGithubBranchOption[]>([]);
  const [githubDiscoveredSkills, setGithubDiscoveredSkills] = useState<CreateSkillDialogGithubImportRecord[]>([]);
  const [githubRepositoryUrl, setGithubRepositoryUrl] = useState("");
  const [isGithubBranchAutoSelected, setIsGithubBranchAutoSelected] = useState(false);
  const [githubSelectedSkillDirectories, setGithubSelectedSkillDirectories] = useState<string[]>([]);
  const [githubStep, setGithubStep] = useState<CreateSkillDialogGithubStep>("repository");
  const [instructions, setInstructions] = useState("");
  const [isCreateGroupFormOpen, setCreateGroupFormOpen] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isLoadingGithubBranches, setIsLoadingGithubBranches] = useState(false);
  const [isLoadingGithubDiscoveredSkills, setIsLoadingGithubDiscoveredSkills] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<CreateSkillDialogMode>("choose");
  const [name, setName] = useState("");
  const [skillGroupId, setSkillGroupId] = useState(UNGROUPED_SKILL_GROUP_VALUE);
  // Ignore slower branch responses once the repository URL changes or a newer request starts.
  const githubBranchDiscoveryRequestIdRef = useRef(0);
  const githubBranchDiscoveryTimeoutIdRef = useRef<number | null>(null);
  const hasQueuedGithubBranchDiscoveryRef = useRef(false);

  useEffect(() => {
    if (!props.isOpen) {
      if (githubBranchDiscoveryTimeoutIdRef.current !== null) {
        window.clearTimeout(githubBranchDiscoveryTimeoutIdRef.current);
        githubBranchDiscoveryTimeoutIdRef.current = null;
      }
      setDescription("");
      setDraftSkillGroupName("");
      setEphemeralSkillGroup(null);
      setGithubBranchName("");
      setGithubBranches([]);
      setGithubDiscoveredSkills([]);
      setGithubRepositoryUrl("");
      setIsGithubBranchAutoSelected(false);
      setGithubSelectedSkillDirectories([]);
      setGithubStep("repository");
      setInstructions("");
      setCreateGroupFormOpen(false);
      setIsCreatingGroup(false);
      setIsLoadingGithubBranches(false);
      setIsLoadingGithubDiscoveredSkills(false);
      setLocalErrorMessage(null);
      setMode("choose");
      setName("");
      setSkillGroupId(UNGROUPED_SKILL_GROUP_VALUE);
      githubBranchDiscoveryRequestIdRef.current += 1;
      hasQueuedGithubBranchDiscoveryRef.current = false;
    }
  }, [props.isOpen]);

  const selectedGithubBranch = githubBranches.find((branch) => branch.name === githubBranchName) ?? null;
  const githubBranchTriggerLabel = selectedGithubBranch
    ? isGithubBranchAutoSelected
      ? `${selectedGithubBranch.name} (auto-selected)`
      : selectedGithubBranch.name
    : null;
  const selectedGithubSkills = githubDiscoveredSkills.filter((skill) =>
    githubSelectedSkillDirectories.includes(skill.skillDirectory)
  );
  const allGithubSkillsSelected = githubDiscoveredSkills.length > 0
    && githubSelectedSkillDirectories.length === githubDiscoveredSkills.length;
  const groupOptions = useMemo(() => {
    const nextGroups = ephemeralSkillGroup && !props.groups.some((group) => group.id === ephemeralSkillGroup.id)
      ? [...props.groups, ephemeralSkillGroup]
      : props.groups;
    return [...nextGroups].sort((left, right) => left.name.localeCompare(right.name));
  }, [ephemeralSkillGroup, props.groups]);
  const githubRepositoryUrlDiscoveryCandidate = useMemo(() => {
    const normalizedRepositoryUrl = githubRepositoryUrl.trim();
    if (!normalizedRepositoryUrl) {
      return null;
    }

    if (normalizedRepositoryUrl.startsWith("https://") || normalizedRepositoryUrl.startsWith("http://")) {
      try {
        const repositoryUrl = new URL(normalizedRepositoryUrl);
        if (repositoryUrl.hostname !== "github.com" && repositoryUrl.hostname !== "www.github.com") {
          return null;
        }

        return repositoryUrl.pathname
          .replace(/^\/+|\/+$/g, "")
          .split("/")
          .filter((segment) => segment.length > 0)
          .length >= 2
          ? normalizedRepositoryUrl
          : null;
      } catch {
        return null;
      }
    }

    return normalizedRepositoryUrl
      .split("/")
      .filter((segment) => segment.length > 0)
      .length >= 2
      ? normalizedRepositoryUrl
      : null;
  }, [githubRepositoryUrl]);
  const githubImportRepository = selectedGithubBranch?.repository
    ?? githubRepositoryUrlDiscoveryCandidate
    ?? githubRepositoryUrl.trim();
  const isMutating = props.isSaving || isCreatingGroup;

  async function createSkillGroup() {
    setLocalErrorMessage(null);
    setIsCreatingGroup(true);

    try {
      const createdGroup = await props.onCreateGroup(draftSkillGroupName);
      setDraftSkillGroupName("");
      setEphemeralSkillGroup(createdGroup);
      setSkillGroupId(createdGroup.id);
      setCreateGroupFormOpen(false);
    } catch (error: unknown) {
      setLocalErrorMessage(
        error instanceof Error ? error.message : "Failed to create skill group.",
      );
    } finally {
      setIsCreatingGroup(false);
    }
  }

  function resetGithubRepositorySelection(cancelBranchDiscovery: boolean = false) {
    if (cancelBranchDiscovery) {
      githubBranchDiscoveryRequestIdRef.current += 1;
      if (githubBranchDiscoveryTimeoutIdRef.current !== null) {
        window.clearTimeout(githubBranchDiscoveryTimeoutIdRef.current);
        githubBranchDiscoveryTimeoutIdRef.current = null;
      }
      setIsLoadingGithubBranches(false);
    }
    setGithubBranchName("");
    setGithubBranches([]);
    setGithubDiscoveredSkills([]);
    setIsGithubBranchAutoSelected(false);
    setGithubSelectedSkillDirectories([]);
    setGithubStep("repository");
    setLocalErrorMessage(null);
  }

  function renderSkillGroupField(selectId: string) {
    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-xs font-medium text-foreground" htmlFor={selectId}>
            Group
          </label>
          <Button
            onClick={() => {
              setCreateGroupFormOpen((currentValue) => !currentValue);
              setLocalErrorMessage(null);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <FolderPlusIcon className="size-4" />
            New group
          </Button>
        </div>
        <Select
          items={[
            {
              label: "Ungrouped",
              value: UNGROUPED_SKILL_GROUP_VALUE,
            },
            ...groupOptions.map((group) => ({
              label: group.name,
              value: group.id,
            })),
          ]}
          onValueChange={(value) => {
            setSkillGroupId(value ?? UNGROUPED_SKILL_GROUP_VALUE);
          }}
          value={skillGroupId}
        >
          <SelectTrigger id={selectId}>
            <SelectValue placeholder="Select a group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNGROUPED_SKILL_GROUP_VALUE}>Ungrouped</SelectItem>
            {groupOptions.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isCreateGroupFormOpen ? (
          <div className="grid gap-3 rounded-xl border border-border/60 bg-card/40 p-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor={`${selectId}-new-group`}>
                New group name
              </label>
              <Input
                id={`${selectId}-new-group`}
                onChange={(event) => {
                  setDraftSkillGroupName(event.target.value);
                }}
                placeholder="Automation"
                value={draftSkillGroupName}
              />
            </div>
            <Button
              onClick={() => {
                setCreateGroupFormOpen(false);
                setDraftSkillGroupName("");
                setLocalErrorMessage(null);
              }}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={draftSkillGroupName.length === 0 || isCreatingGroup}
              onClick={() => {
                void createSkillGroup();
              }}
              type="button"
            >
              {isCreatingGroup ? "Creating..." : "Create group"}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  const discoverGithubBranches = useCallback(async (repositoryUrl: string) => {
    const normalizedRepositoryUrl = repositoryUrl.trim();
    if (!normalizedRepositoryUrl) {
      setLocalErrorMessage("Paste a public GitHub repository URL first.");
      setGithubBranchName("");
      setGithubBranches([]);
      return;
    }

    const requestId = githubBranchDiscoveryRequestIdRef.current + 1;
    githubBranchDiscoveryRequestIdRef.current = requestId;
    setIsLoadingGithubBranches(true);
    setGithubBranchName("");
    setGithubBranches([]);
    setGithubDiscoveredSkills([]);
    setGithubSelectedSkillDirectories([]);
    setGithubStep("repository");
    setLocalErrorMessage(null);

    try {
      const response = await fetchQuery<createSkillDialogGithubSkillBranchesQuery>(
        environment,
        createSkillDialogGithubSkillBranchesQueryNode,
        {
          repositoryUrl: normalizedRepositoryUrl,
        },
        {
          fetchPolicy: "network-only",
        },
      ).toPromise();
      if (githubBranchDiscoveryRequestIdRef.current !== requestId) {
        return;
      }
      const nextBranches = (response?.GithubSkillBranches ?? []).map((branch) => ({
        commitSha: branch.commitSha,
        isDefault: branch.isDefault,
        name: branch.name,
        repository: branch.repository,
      }));
      const autoSelectedBranchName = nextBranches.find((branch) => branch.isDefault)?.name
        ?? nextBranches[0]?.name
        ?? "";
      setGithubBranches(nextBranches);
      setGithubBranchName(autoSelectedBranchName);
      setIsGithubBranchAutoSelected(autoSelectedBranchName.length > 0);
    } catch (error: unknown) {
      if (githubBranchDiscoveryRequestIdRef.current !== requestId) {
        return;
      }
      setGithubBranches([]);
      setIsGithubBranchAutoSelected(false);
      setLocalErrorMessage(
        error instanceof Error ? error.message : "Failed to load GitHub branches.",
      );
    } finally {
      if (githubBranchDiscoveryRequestIdRef.current === requestId) {
        setIsLoadingGithubBranches(false);
      }
    }
  }, [environment]);

  useEffect(() => {
    if (!props.isOpen || mode !== "github" || githubStep !== "repository") {
      if (githubBranchDiscoveryTimeoutIdRef.current !== null) {
        window.clearTimeout(githubBranchDiscoveryTimeoutIdRef.current);
        githubBranchDiscoveryTimeoutIdRef.current = null;
      }
      return;
    }

    if (!githubRepositoryUrlDiscoveryCandidate) {
      hasQueuedGithubBranchDiscoveryRef.current = false;
      return;
    }

    // Fire immediately for the first valid URL, then debounce follow-up edits so typing does not
    // fan out into redundant branch discovery requests.
    const delayMs = hasQueuedGithubBranchDiscoveryRef.current ? GITHUB_BRANCH_DISCOVERY_DEBOUNCE_MS : 0;
    const timeoutId = window.setTimeout(() => {
      hasQueuedGithubBranchDiscoveryRef.current = true;
      githubBranchDiscoveryTimeoutIdRef.current = null;
      void discoverGithubBranches(githubRepositoryUrlDiscoveryCandidate);
    }, delayMs);
    githubBranchDiscoveryTimeoutIdRef.current = timeoutId;

    return () => {
      window.clearTimeout(timeoutId);
      if (githubBranchDiscoveryTimeoutIdRef.current === timeoutId) {
        githubBranchDiscoveryTimeoutIdRef.current = null;
      }
    };
  }, [
    discoverGithubBranches,
    githubRepositoryUrlDiscoveryCandidate,
    githubStep,
    mode,
    props.isOpen,
  ]);

  async function discoverGithubSkills() {
    const normalizedRepositoryUrl = githubRepositoryUrl.trim();
    if (!normalizedRepositoryUrl) {
      setLocalErrorMessage("Paste a public GitHub repository URL first.");
      return;
    }
    if (!githubBranchName) {
      setLocalErrorMessage("Select a branch before continuing.");
      return;
    }

    setIsLoadingGithubDiscoveredSkills(true);
    setGithubDiscoveredSkills([]);
    setGithubSelectedSkillDirectories([]);
    setLocalErrorMessage(null);

    try {
      const response = await fetchQuery<createSkillDialogGithubDiscoveredSkillsQuery>(
        environment,
        createSkillDialogGithubDiscoveredSkillsQueryNode,
        {
          branchName: githubBranchName,
          repositoryUrl: normalizedRepositoryUrl,
        },
        {
          fetchPolicy: "network-only",
        },
      ).toPromise();
      const nextSkills = (response?.GithubDiscoveredSkills ?? []).map((skill) => ({
        name: skill.name,
        skillDirectory: skill.skillDirectory,
        trackedFileCount: skill.trackedFileCount,
      }));
      setGithubDiscoveredSkills(nextSkills);
      setGithubSelectedSkillDirectories(nextSkills.map((skill) => skill.skillDirectory));
      setGithubStep("skills");
    } catch (error: unknown) {
      setLocalErrorMessage(
        error instanceof Error ? error.message : "Failed to discover GitHub skills.",
      );
    } finally {
      setIsLoadingGithubDiscoveredSkills(false);
    }
  }

  return (
    <Dialog disablePointerDismissal onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent className="flex max-h-[min(90vh,56rem)] w-[80vw] max-w-[80vw] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create skill</DialogTitle>
          <DialogDescription>
            Add a reusable skill for your company, either by creating it manually now or by
            importing a GitHub skill package from a public repository URL.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {mode === "choose" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <button
                className={cn(
                  "group flex min-h-52 flex-col rounded-2xl border border-border/70 bg-card/60 p-5 text-left transition hover:border-foreground/30 hover:bg-accent/20",
                )}
                onClick={() => {
                  setMode("github");
                  setGithubStep("repository");
                }}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background/90">
                    <GithubIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Import from GitHub</p>
                    <p className="text-xs text-muted-foreground">
                      Paste a public repo URL, confirm the branch, then choose skills
                    </p>
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-border/60 bg-background/70 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Public repositories
                  </p>
                  <p className="mt-3 text-sm text-foreground">
                    Paste a repository URL to resolve branches, then review every discovered
                    `SKILL.md` package before importing all of them or only a selected subset.
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
                      Step {githubStep === "repository" ? "1" : "2"} of 2
                    </p>
                  </div>
                </div>
              </div>

              {githubStep === "repository" ? (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="skill-repository-url">
                      Repository URL
                    </label>
                    <Input
                      autoComplete="off"
                      id="skill-repository-url"
                      onChange={(event) => {
                        setGithubRepositoryUrl(event.target.value);
                        resetGithubRepositorySelection(true);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          if (githubBranchDiscoveryTimeoutIdRef.current !== null) {
                            window.clearTimeout(githubBranchDiscoveryTimeoutIdRef.current);
                            githubBranchDiscoveryTimeoutIdRef.current = null;
                          }
                          hasQueuedGithubBranchDiscoveryRef.current = true;
                          void discoverGithubBranches(event.currentTarget.value);
                        }
                      }}
                      placeholder="https://github.com/openai/skills"
                      value={githubRepositoryUrl}
                    />
                    <p className="text-xs text-muted-foreground">
                      Repository URLs load branches automatically. The first lookup starts
                      immediately, and follow-up edits refresh after a short debounce.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="github-branch">
                      Branch
                    </label>
                    <Select
                      items={githubBranches.map((branch) => ({
                        label: branch.name,
                        value: branch.name,
                      }))}
                      onValueChange={(value) => {
                        setGithubBranchName(typeof value === "string" ? value : "");
                        setGithubDiscoveredSkills([]);
                        setIsGithubBranchAutoSelected(false);
                        setGithubSelectedSkillDirectories([]);
                        setLocalErrorMessage(null);
                      }}
                      value={githubBranchName || undefined}
                    >
                      <SelectTrigger
                        className={cn(isLoadingGithubBranches ? "animate-pulse" : null)}
                        id="github-branch"
                      >
                        {githubBranchTriggerLabel ? (
                          <span className="truncate">{githubBranchTriggerLabel}</span>
                        ) : (
                          <SelectValue
                            placeholder={!githubRepositoryUrl.trim()
                              ? "Paste a repository URL first"
                              : isLoadingGithubBranches
                              ? "Loading branches..."
                              : !githubRepositoryUrlDiscoveryCandidate
                              ? "Enter a GitHub repository URL"
                              : githubBranches.length > 0
                              ? "Select a branch"
                              : "No branches found"}
                          />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {githubBranches.map((branch) => (
                          <SelectItem key={branch.name} value={branch.name}>
                            {branch.name}
                            {branch.isDefault ? " (default)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedGithubBranch ? (
                    <div className="grid gap-3 rounded-xl border border-border/60 bg-card/40 p-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Repository
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {selectedGithubBranch.repository}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Selected branch
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {selectedGithubBranch.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Commit {selectedGithubBranch.commitSha.slice(0, 12)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {githubStep === "skills" ? (
                <div className="grid gap-4">
                  <div className="grid gap-3 rounded-xl border border-border/60 bg-card/40 p-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Repository
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {selectedGithubBranch?.repository ?? githubRepositoryUrl.trim()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Branch
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">{githubBranchName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Selected skills
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {selectedGithubSkills.length} of {githubDiscoveredSkills.length}
                      </p>
                    </div>
                  </div>

                  {renderSkillGroupField("github-skill-group")}

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Discovered skills</p>
                      <p className="text-xs text-muted-foreground">
                        Choose every skill you want to create from this branch.
                      </p>
                    </div>
                    <Button
                      disabled={githubDiscoveredSkills.length === 0}
                      onClick={() => {
                        setGithubSelectedSkillDirectories(allGithubSkillsSelected
                          ? []
                          : githubDiscoveredSkills.map((skill) => skill.skillDirectory));
                      }}
                      type="button"
                      variant="outline"
                    >
                      {allGithubSkillsSelected ? "Deselect all" : "Select all"}
                    </Button>
                  </div>

                  {githubDiscoveredSkills.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/30">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-14">Pick</TableHead>
                            <TableHead>Skill</TableHead>
                            <TableHead>Directory</TableHead>
                            <TableHead className="w-32">Files</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {githubDiscoveredSkills.map((skill) => {
                            const isSelected = githubSelectedSkillDirectories.includes(skill.skillDirectory);

                            return (
                              <TableRow
                                className={cn(isSelected ? "bg-muted/25" : null)}
                                key={skill.skillDirectory}
                              >
                                <TableCell>
                                  <input
                                    checked={isSelected}
                                    className="size-4 rounded border border-input bg-background"
                                    onChange={(event) => {
                                      setGithubSelectedSkillDirectories((currentValue) => event.target.checked
                                        ? [...currentValue, skill.skillDirectory]
                                        : currentValue.filter((path) => path !== skill.skillDirectory));
                                    }}
                                    type="checkbox"
                                  />
                                </TableCell>
                                <TableCell className="text-sm font-semibold text-foreground">
                                  {skill.name}
                                </TableCell>
                                <TableCell className="font-mono text-[11px] text-muted-foreground">
                                  {skill.skillDirectory}
                                </TableCell>
                                <TableCell>
                                  {skill.trackedFileCount} tracked file{skill.trackedFileCount === 1 ? "" : "s"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                      No importable skills were found on this branch.
                    </div>
                  )}
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

              {renderSkillGroupField("skill-group")}

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
        </div>

        <DialogFooter>
          {mode !== "choose" ? (
            <Button
              onClick={() => {
                setLocalErrorMessage(null);
                if (mode === "github" && githubStep === "skills") {
                  setGithubStep("repository");
                  return;
                }

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
              data-primary-cta=""
              disabled={isMutating || !name.trim() || !description.trim() || !instructions.trim()}
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
          {mode === "github" && githubStep === "repository" ? (
            <Button
              data-primary-cta=""
              disabled={isMutating || isLoadingGithubDiscoveredSkills || !githubRepositoryUrl.trim() || !githubBranchName}
              onClick={() => {
                void discoverGithubSkills();
              }}
              type="button"
            >
              {isLoadingGithubDiscoveredSkills ? "Loading skills..." : "Continue"}
            </Button>
          ) : null}
          {mode === "github" && githubStep === "skills" ? (
            <Button
              data-primary-cta=""
              disabled={isMutating || selectedGithubSkills.length === 0}
              onClick={async () => {
                setLocalErrorMessage(null);

                try {
                  await props.onImportGithub({
                    skillGroupId: skillGroupId === UNGROUPED_SKILL_GROUP_VALUE ? null : skillGroupId,
                    skills: selectedGithubSkills.map((skill) => ({
                      branchName: githubBranchName,
                      repository: githubImportRepository,
                      skillDirectory: skill.skillDirectory,
                    })),
                  });
                } catch (error) {
                  setLocalErrorMessage(
                    error instanceof Error ? error.message : "Failed to import GitHub skills.",
                  );
                }
              }}
              type="button"
            >
              Import {selectedGithubSkills.length === 1 ? "skill" : `${selectedGithubSkills.length} skills`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
