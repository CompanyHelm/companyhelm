import { useMemo, useState } from "react";
import { Layers3Icon, Loader2Icon, XIcon } from "lucide-react";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import { graphql, useMutation } from "react-relay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/toast_provider";
import type { agentSkillDefaultsCardAttachSkillGroupToAgentMutation } from "./__generated__/agentSkillDefaultsCardAttachSkillGroupToAgentMutation.graphql";
import type { agentSkillDefaultsCardAttachSkillToAgentMutation } from "./__generated__/agentSkillDefaultsCardAttachSkillToAgentMutation.graphql";
import type { agentSkillDefaultsCardDetachSkillGroupFromAgentMutation } from "./__generated__/agentSkillDefaultsCardDetachSkillGroupFromAgentMutation.graphql";
import type { agentSkillDefaultsCardDetachSkillFromAgentMutation } from "./__generated__/agentSkillDefaultsCardDetachSkillFromAgentMutation.graphql";
import type { AgentCreateSkillOption } from "./create_agent_dialog";

type AgentSkillRecord = {
  description: string;
  id: string;
  name: string;
  skillGroupId: string | null | undefined;
  skillType: "custom" | "system" | "%future added value";
};

type AgentSkillGroupRecord = {
  id: string;
  name: string;
};

type StoreRecord = {
  getDataID(): string;
  getValue(name: string): unknown;
};

interface AgentSkillDefaultsCardProps {
  agentId: string;
  agentSkillGroups: AgentSkillGroupRecord[];
  agentSkills: AgentSkillRecord[];
  companySkillGroups: AgentSkillGroupRecord[];
  companySkills: AgentCreateSkillOption[];
}

const agentSkillDefaultsCardAttachSkillGroupToAgentMutationNode = graphql`
  mutation agentSkillDefaultsCardAttachSkillGroupToAgentMutation($input: AttachSkillGroupToAgentInput!) {
    AttachSkillGroupToAgent(input: $input) {
      id
      name
    }
  }
`;

const agentSkillDefaultsCardDetachSkillGroupFromAgentMutationNode = graphql`
  mutation agentSkillDefaultsCardDetachSkillGroupFromAgentMutation($input: DetachSkillGroupFromAgentInput!) {
    DetachSkillGroupFromAgent(input: $input) {
      id
    }
  }
`;

const agentSkillDefaultsCardAttachSkillToAgentMutationNode = graphql`
  mutation agentSkillDefaultsCardAttachSkillToAgentMutation($input: AttachSkillToAgentInput!) {
    AttachSkillToAgent(input: $input) {
      id
      name
      description
      skillGroupId
      skillType
    }
  }
`;

const agentSkillDefaultsCardDetachSkillFromAgentMutationNode = graphql`
  mutation agentSkillDefaultsCardDetachSkillFromAgentMutation($input: DetachSkillFromAgentInput!) {
    DetachSkillFromAgent(input: $input) {
      id
    }
  }
`;

function filterStoreRecords(records: ReadonlyArray<unknown>): StoreRecord[] {
  return records.filter((record): record is StoreRecord => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function"
      && "getValue" in record
      && typeof record.getValue === "function";
  });
}

function sortStoreRecords(records: StoreRecord[]): StoreRecord[] {
  return [...records].sort((left, right) => {
    return String(left.getValue("name") ?? "").localeCompare(String(right.getValue("name") ?? ""));
  });
}

function upsertAttachmentInStore(
  store: RecordSourceSelectorProxy,
  fieldArguments: { agentId: string },
  listFieldName: string,
  mutationFieldName: string,
) {
  const nextRecord = store.getRootField(mutationFieldName);
  if (!nextRecord) {
    return;
  }

  const rootRecord = store.getRoot();
  const currentRecords = filterStoreRecords(rootRecord.getLinkedRecords(listFieldName, fieldArguments) || []);
  const existingRecord = currentRecords.find((record) => record.getDataID() === nextRecord.getDataID());
  const nextRecords = existingRecord
    ? currentRecords.map((record) => record.getDataID() === nextRecord.getDataID() ? nextRecord : record)
    : [...currentRecords, nextRecord];
  rootRecord.setLinkedRecords(sortStoreRecords(nextRecords), listFieldName, fieldArguments);
}

function removeAttachmentFromStore(
  store: RecordSourceSelectorProxy,
  fieldArguments: { agentId: string },
  listFieldName: string,
  mutationFieldName: string,
) {
  const deletedRecord = store.getRootField(mutationFieldName);
  if (!deletedRecord) {
    return;
  }

  const rootRecord = store.getRoot();
  const currentRecords = filterStoreRecords(rootRecord.getLinkedRecords(listFieldName, fieldArguments) || []);
  rootRecord.setLinkedRecords(
    currentRecords.filter((record) => record.getDataID() !== deletedRecord.getDataID()),
    listFieldName,
    fieldArguments,
  );
}

/**
 * Lets users manage direct skill and skill-group defaults on an agent. Those assignments are
 * stored now so future session skill activation can consume them without revisiting agent config.
 */
export function AgentSkillDefaultsCard(props: AgentSkillDefaultsCardProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busySkillId, setBusySkillId] = useState<string | null>(null);
  const [busySkillGroupId, setBusySkillGroupId] = useState<string | null>(null);
  const [pendingSkillGroupSelection, setPendingSkillGroupSelection] = useState<string | null>(null);
  const [pendingSkillSelection, setPendingSkillSelection] = useState<string | null>(null);
  const [openSkillGroupId, setOpenSkillGroupId] = useState<string | null>(null);
  const toast = useToast();
  const [commitAttachSkillGroup, isAttachSkillGroupInFlight] =
    useMutation<agentSkillDefaultsCardAttachSkillGroupToAgentMutation>(
      agentSkillDefaultsCardAttachSkillGroupToAgentMutationNode,
    );
  const [commitDetachSkillGroup, isDetachSkillGroupInFlight] =
    useMutation<agentSkillDefaultsCardDetachSkillGroupFromAgentMutation>(
      agentSkillDefaultsCardDetachSkillGroupFromAgentMutationNode,
    );
  const [commitAttachSkill, isAttachSkillInFlight] =
    useMutation<agentSkillDefaultsCardAttachSkillToAgentMutation>(
      agentSkillDefaultsCardAttachSkillToAgentMutationNode,
    );
  const [commitDetachSkill, isDetachSkillInFlight] =
    useMutation<agentSkillDefaultsCardDetachSkillFromAgentMutation>(
      agentSkillDefaultsCardDetachSkillFromAgentMutationNode,
    );
  const isMutating = isAttachSkillGroupInFlight
    || isDetachSkillGroupInFlight
    || isAttachSkillInFlight
    || isDetachSkillInFlight;

  const attachedSkillGroupIds = useMemo(() => {
    return new Set(props.agentSkillGroups.map((group) => group.id));
  }, [props.agentSkillGroups]);
  const attachedSkillIds = useMemo(() => {
    return new Set(props.agentSkills.map((skill) => skill.id));
  }, [props.agentSkills]);
  const availableSkillGroupOptions = useMemo(() => {
    return props.companySkillGroups
      .filter((group) => !attachedSkillGroupIds.has(group.id))
      .map((group) => ({
        id: group.id,
        label: group.name,
      }));
  }, [attachedSkillGroupIds, props.companySkillGroups]);
  const skillsByGroupId = useMemo(() => {
    const groupedSkills = new Map<string, AgentCreateSkillOption[]>();
    for (const skill of props.companySkills) {
      if (!skill.skillGroupId) {
        continue;
      }

      const existingSkills = groupedSkills.get(skill.skillGroupId) ?? [];
      groupedSkills.set(skill.skillGroupId, [...existingSkills, skill]);
    }

    return groupedSkills;
  }, [props.companySkills]);
  const availableSkillOptions = useMemo(() => {
    return props.companySkills
      .filter((skill) => !attachedSkillIds.has(skill.id))
      .map((skill) => ({
        description: skill.description,
        id: skill.id,
        label: skill.name,
        metaLabel: skill.skillType === "system" ? "Built-in" : null,
      }));
  }, [attachedSkillIds, props.companySkills]);
  const fieldArguments = useMemo(() => ({
    agentId: props.agentId,
  }), [props.agentId]);
  const openSkillGroup = props.agentSkillGroups.find((group) => group.id === openSkillGroupId) ?? null;
  const openSkillGroupSkills = openSkillGroup ? skillsByGroupId.get(openSkillGroup.id) ?? [] : [];

  const attachSkillGroup = async (skillGroupId: string) => {
    if (isMutating) {
      return;
    }

    setErrorMessage(null);
    setBusySkillGroupId(skillGroupId);

    try {
      await new Promise<void>((resolve, reject) => {
        commitAttachSkillGroup({
          variables: {
            input: {
              agentId: props.agentId,
              skillGroupId,
            },
          },
          updater: (store) => {
            upsertAttachmentInStore(store, fieldArguments, "AgentSkillGroups", "AttachSkillGroupToAgent");
          },
          onCompleted: (_response, errors) => {
            const nextErrorMessage = String(errors?.[0]?.message || "").trim();
            if (nextErrorMessage) {
              reject(new Error(nextErrorMessage));
              return;
            }

            resolve();
          },
          onError: reject,
        });
      });
      toast.showSavedToast();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to attach skill group.");
    } finally {
      setBusySkillGroupId(null);
    }
  };

  const detachSkillGroup = async (skillGroupId: string) => {
    if (isMutating) {
      return;
    }

    setErrorMessage(null);
    setBusySkillGroupId(skillGroupId);

    try {
      await new Promise<void>((resolve, reject) => {
        commitDetachSkillGroup({
          variables: {
            input: {
              agentId: props.agentId,
              skillGroupId,
            },
          },
          updater: (store) => {
            removeAttachmentFromStore(store, fieldArguments, "AgentSkillGroups", "DetachSkillGroupFromAgent");
          },
          onCompleted: (_response, errors) => {
            const nextErrorMessage = String(errors?.[0]?.message || "").trim();
            if (nextErrorMessage) {
              reject(new Error(nextErrorMessage));
              return;
            }

            resolve();
          },
          onError: reject,
        });
      });
      toast.showSavedToast();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to detach skill group.");
    } finally {
      setBusySkillGroupId(null);
    }
  };

  const attachSkill = async (skillId: string) => {
    if (isMutating) {
      return;
    }

    setErrorMessage(null);
    setBusySkillId(skillId);

    try {
      await new Promise<void>((resolve, reject) => {
        commitAttachSkill({
          variables: {
            input: {
              agentId: props.agentId,
              skillId,
            },
          },
          updater: (store) => {
            upsertAttachmentInStore(store, fieldArguments, "AgentSkills", "AttachSkillToAgent");
          },
          onCompleted: (_response, errors) => {
            const nextErrorMessage = String(errors?.[0]?.message || "").trim();
            if (nextErrorMessage) {
              reject(new Error(nextErrorMessage));
              return;
            }

            resolve();
          },
          onError: reject,
        });
      });
      toast.showSavedToast();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to attach skill.");
    } finally {
      setBusySkillId(null);
    }
  };

  const detachSkill = async (skillId: string) => {
    if (isMutating) {
      return;
    }

    setErrorMessage(null);
    setBusySkillId(skillId);

    try {
      await new Promise<void>((resolve, reject) => {
        commitDetachSkill({
          variables: {
            input: {
              agentId: props.agentId,
              skillId,
            },
          },
          updater: (store) => {
            removeAttachmentFromStore(store, fieldArguments, "AgentSkills", "DetachSkillFromAgent");
          },
          onCompleted: (_response, errors) => {
            const nextErrorMessage = String(errors?.[0]?.message || "").trim();
            if (nextErrorMessage) {
              reject(new Error(nextErrorMessage));
              return;
            }

            resolve();
          },
          onError: reject,
        });
      });
      toast.showSavedToast();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to detach skill.");
    } finally {
      setBusySkillId(null);
    }
  };

  return (
    <section className="grid gap-6">
      <div className="grid gap-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Skills</h2>
        <p className="text-sm text-muted-foreground">
          Choose which skills or skill groups are stored on this agent for future session skill activation.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/10 p-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Add skill group
          </label>
          <Select
            disabled={isMutating || availableSkillGroupOptions.length === 0}
            items={availableSkillGroupOptions.map((option) => ({
              label: option.label,
              value: option.id,
            }))}
            onValueChange={async (value) => {
              if (typeof value !== "string" || value.length === 0) {
                setPendingSkillGroupSelection(null);
                return;
              }

              setPendingSkillGroupSelection(value);
              try {
                await attachSkillGroup(value);
              } finally {
                setPendingSkillGroupSelection(null);
              }
            }}
            value={pendingSkillGroupSelection ?? undefined}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={availableSkillGroupOptions.length > 0
                  ? "Select a skill group"
                  : "All skill groups already added"}
              />
            </SelectTrigger>
            <SelectContent>
              {availableSkillGroupOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <label className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Add individual skill
          </label>
          <Select
            disabled={isMutating || availableSkillOptions.length === 0}
            items={availableSkillOptions.map((option) => ({
              label: option.label,
              value: option.id,
            }))}
            onValueChange={async (value) => {
              if (typeof value !== "string" || value.length === 0) {
                setPendingSkillSelection(null);
                return;
              }

              setPendingSkillSelection(value);
              try {
                await attachSkill(value);
              } finally {
                setPendingSkillSelection(null);
              }
            }}
            value={pendingSkillSelection ?? undefined}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={availableSkillOptions.length > 0 ? "Select a skill" : "All skills already added"}
              />
            </SelectTrigger>
            <SelectContent>
              {availableSkillOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Skill groups
          </h3>
          <span className="text-xs text-muted-foreground">{props.agentSkillGroups.length}</span>
        </div>
        {props.agentSkillGroups.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {props.agentSkillGroups.map((group) => {
              const groupedSkills = skillsByGroupId.get(group.id) ?? [];
              const isBusy = busySkillGroupId === group.id;

              return (
                <article
                  aria-label={`Open ${group.name} skills`}
                  className="group grid min-h-32 cursor-pointer gap-4 rounded-lg border border-border/70 bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  key={group.id}
                  onClick={() => {
                    setOpenSkillGroupId(group.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") {
                      return;
                    }

                    event.preventDefault();
                    setOpenSkillGroupId(group.id);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid min-w-0 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border/70 bg-muted/25 text-muted-foreground">
                          <Layers3Icon className="size-4" />
                        </span>
                        <p className="truncate text-sm font-semibold text-foreground">{group.name}</p>
                      </div>
                      <p className="line-clamp-2 text-xs/relaxed text-muted-foreground">
                        Opens {groupedSkills.length} grouped skill{groupedSkills.length === 1 ? "" : "s"} for review.
                      </p>
                    </div>
                    <Button
                      aria-label={`Remove ${group.name}`}
                      disabled={isMutating}
                      onClick={async (event) => {
                        event.stopPropagation();
                        await detachSkillGroup(group.id);
                      }}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      {isBusy ? <Loader2Icon className="animate-spin" /> : <XIcon />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={group.id === "system" ? "secondary" : "outline"}>
                      {group.id === "system" ? "Built-in" : "Group"}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">View skills</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            No skill groups attached to this agent yet.
          </div>
        )}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Individual skills
          </h3>
          <span className="text-xs text-muted-foreground">{props.agentSkills.length}</span>
        </div>
        {props.agentSkills.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {props.agentSkills.map((skill) => {
              const isBusy = busySkillId === skill.id;

              return (
                <article
                  className="grid min-h-36 gap-4 rounded-lg border border-border/70 bg-card p-4 shadow-sm"
                  key={skill.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{skill.name}</p>
                      <p className="mt-2 line-clamp-3 text-xs/relaxed text-muted-foreground">{skill.description}</p>
                    </div>
                    <Button
                      aria-label={`Remove ${skill.name}`}
                      disabled={isMutating}
                      onClick={async () => {
                        await detachSkill(skill.id);
                      }}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      {isBusy ? <Loader2Icon className="animate-spin" /> : <XIcon />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {skill.skillType === "system" ? <Badge variant="secondary">Built-in</Badge> : null}
                    {skill.skillGroupId ? <Badge variant="outline">Grouped</Badge> : <Badge variant="outline">Direct</Badge>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            No individual skills attached to this agent yet.
          </div>
        )}
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setOpenSkillGroupId(null);
          }
        }}
        open={openSkillGroup !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{openSkillGroup?.name ?? "Skill group"}</DialogTitle>
            <DialogDescription>
              {openSkillGroupSkills.length} skill{openSkillGroupSkills.length === 1 ? "" : "s"} in this group.
            </DialogDescription>
          </DialogHeader>
          {openSkillGroupSkills.length > 0 ? (
            <div className="grid gap-2">
              {openSkillGroupSkills.map((skill) => (
                <div
                  className="rounded-lg border border-border/60 bg-muted/10 px-4 py-3"
                  key={skill.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{skill.name}</p>
                      <p className="mt-1 text-xs/relaxed text-muted-foreground">{skill.description}</p>
                    </div>
                    {skill.skillType === "system" ? <Badge className="shrink-0" variant="secondary">Built-in</Badge> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              This group does not contain any skills yet.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
