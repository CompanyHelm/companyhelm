import { useMemo, useState } from "react";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import { graphql, useMutation } from "react-relay";
import { useToast } from "@/components/toast_provider";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { agentSkillDefaultsCardAttachSkillGroupToAgentMutation } from "./__generated__/agentSkillDefaultsCardAttachSkillGroupToAgentMutation.graphql";
import type { agentSkillDefaultsCardAttachSkillToAgentMutation } from "./__generated__/agentSkillDefaultsCardAttachSkillToAgentMutation.graphql";
import type { agentSkillDefaultsCardDetachSkillGroupFromAgentMutation } from "./__generated__/agentSkillDefaultsCardDetachSkillGroupFromAgentMutation.graphql";
import type { agentSkillDefaultsCardDetachSkillFromAgentMutation } from "./__generated__/agentSkillDefaultsCardDetachSkillFromAgentMutation.graphql";
import type { AgentCreateSkillOption } from "./create_agent_dialog";
import { DefaultAttachmentSection } from "./default_attachment_section";

type AgentSkillRecord = {
  description: string;
  id: string;
  name: string;
  skillGroupId: string | null | undefined;
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
  const availableSkillOptions = useMemo(() => {
    return props.companySkills
      .filter((skill) => !attachedSkillIds.has(skill.id))
      .map((skill) => ({
        description: skill.description,
        id: skill.id,
        label: skill.name,
      }));
  }, [attachedSkillIds, props.companySkills]);
  const fieldArguments = useMemo(() => ({
    agentId: props.agentId,
  }), [props.agentId]);

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
    <Card className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader>
        <CardDescription>
          Choose which skills or skill groups are stored on this agent for future session skill activation.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <DefaultAttachmentSection
          addLabel="Add skill group"
          availableEmptyLabel="All company skill groups already added"
          availableOptions={availableSkillGroupOptions}
          busyItemId={busySkillGroupId}
          currentLabel="Attached skill groups"
          disabled={isMutating}
          emptyStateLabel="No skill groups attached to this agent yet."
          onAdd={attachSkillGroup}
          onRemove={detachSkillGroup}
          placeholder="Select a skill group"
          selectedOptions={props.agentSkillGroups.map((group) => ({
            id: group.id,
            label: group.name,
          }))}
        />

        <DefaultAttachmentSection
          addLabel="Add individual skill"
          availableEmptyLabel="All company skills already added"
          availableOptions={availableSkillOptions}
          busyItemId={busySkillId}
          currentLabel="Attached individual skills"
          disabled={isMutating}
          emptyStateLabel="No individual skills attached to this agent yet."
          onAdd={attachSkill}
          onRemove={detachSkill}
          placeholder="Select a skill"
          selectedOptions={props.agentSkills.map((skill) => ({
            description: skill.description,
            id: skill.id,
            label: skill.name,
          }))}
        />

        {errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {errorMessage}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
