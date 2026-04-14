import { useMemo, useState } from "react";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import { graphql, useMutation } from "react-relay";
import { useToast } from "@/components/toast_provider";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { agentSecretDefaultsCardAttachSecretGroupToAgentMutation } from "./__generated__/agentSecretDefaultsCardAttachSecretGroupToAgentMutation.graphql";
import type { agentSecretDefaultsCardAttachSecretToAgentMutation } from "./__generated__/agentSecretDefaultsCardAttachSecretToAgentMutation.graphql";
import type { agentSecretDefaultsCardDetachSecretGroupFromAgentMutation } from "./__generated__/agentSecretDefaultsCardDetachSecretGroupFromAgentMutation.graphql";
import type { agentSecretDefaultsCardDetachSecretFromAgentMutation } from "./__generated__/agentSecretDefaultsCardDetachSecretFromAgentMutation.graphql";
import { DefaultAttachmentSection } from "./default_attachment_section";

type AgentSecretRecord = {
  description: string | null;
  envVarName: string;
  id: string;
  name: string;
};

type AgentSecretGroupRecord = {
  id: string;
  name: string;
};

type StoreRecord = {
  getDataID(): string;
  getValue(name: string): unknown;
};

interface AgentSecretDefaultsCardProps {
  agentId: string;
  agentSecretGroups: AgentSecretGroupRecord[];
  agentSecrets: AgentSecretRecord[];
  companySecretGroups: AgentSecretGroupRecord[];
  companySecrets: AgentSecretRecord[];
}

const agentSecretDefaultsCardAttachSecretGroupToAgentMutationNode = graphql`
  mutation agentSecretDefaultsCardAttachSecretGroupToAgentMutation($input: AttachSecretGroupToAgentInput!) {
    AttachSecretGroupToAgent(input: $input) {
      id
      name
    }
  }
`;

const agentSecretDefaultsCardAttachSecretToAgentMutationNode = graphql`
  mutation agentSecretDefaultsCardAttachSecretToAgentMutation($input: AttachSecretToAgentInput!) {
    AttachSecretToAgent(input: $input) {
      id
      name
      description
      envVarName
      createdAt
      updatedAt
    }
  }
`;

const agentSecretDefaultsCardDetachSecretGroupFromAgentMutationNode = graphql`
  mutation agentSecretDefaultsCardDetachSecretGroupFromAgentMutation($input: DetachSecretGroupFromAgentInput!) {
    DetachSecretGroupFromAgent(input: $input) {
      id
    }
  }
`;

const agentSecretDefaultsCardDetachSecretFromAgentMutationNode = graphql`
  mutation agentSecretDefaultsCardDetachSecretFromAgentMutation($input: DetachSecretFromAgentInput!) {
    DetachSecretFromAgent(input: $input) {
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
 * Lets users manage direct secret and secret-group defaults on an agent. Those assignments are
 * stored now so future sessions can inherit a consistent bundle of credentials without repeating
 * the same setup on every chat.
 */
export function AgentSecretDefaultsCard(props: AgentSecretDefaultsCardProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busySecretId, setBusySecretId] = useState<string | null>(null);
  const [busySecretGroupId, setBusySecretGroupId] = useState<string | null>(null);
  const [commitAttachSecretGroup, isAttachSecretGroupInFlight] =
    useMutation<agentSecretDefaultsCardAttachSecretGroupToAgentMutation>(
      agentSecretDefaultsCardAttachSecretGroupToAgentMutationNode,
    );
  const [commitAttachSecret, isAttachSecretInFlight] = useMutation<agentSecretDefaultsCardAttachSecretToAgentMutation>(
    agentSecretDefaultsCardAttachSecretToAgentMutationNode,
  );
  const [commitDetachSecretGroup, isDetachSecretGroupInFlight] =
    useMutation<agentSecretDefaultsCardDetachSecretGroupFromAgentMutation>(
      agentSecretDefaultsCardDetachSecretGroupFromAgentMutationNode,
    );
  const [commitDetachSecret, isDetachSecretInFlight] = useMutation<agentSecretDefaultsCardDetachSecretFromAgentMutation>(
    agentSecretDefaultsCardDetachSecretFromAgentMutationNode,
  );
  const toast = useToast();

  const attachedSecretGroupIds = useMemo(() => {
    return new Set(props.agentSecretGroups.map((group) => group.id));
  }, [props.agentSecretGroups]);
  const attachedSecretIds = useMemo(() => {
    return new Set(props.agentSecrets.map((secret) => secret.id));
  }, [props.agentSecrets]);
  const availableSecretGroupOptions = useMemo(() => {
    return props.companySecretGroups
      .filter((group) => !attachedSecretGroupIds.has(group.id))
      .map((group) => ({
        id: group.id,
        label: group.name,
      }));
  }, [attachedSecretGroupIds, props.companySecretGroups]);
  const availableSecretOptions = useMemo(() => {
    return props.companySecrets
      .filter((secret) => !attachedSecretIds.has(secret.id))
      .map((secret) => ({
        description: secret.description,
        id: secret.id,
        label: `${secret.name} (${secret.envVarName})`,
      }));
  }, [attachedSecretIds, props.companySecrets]);
  const fieldArguments = useMemo(() => ({
    agentId: props.agentId,
  }), [props.agentId]);
  const isMutating = isAttachSecretGroupInFlight
    || isDetachSecretGroupInFlight
    || isAttachSecretInFlight
    || isDetachSecretInFlight;

  const attachSecretGroup = async (secretGroupId: string) => {
    if (isMutating) {
      return;
    }

    setErrorMessage(null);
    setBusySecretGroupId(secretGroupId);

    try {
      await new Promise<void>((resolve, reject) => {
        commitAttachSecretGroup({
          variables: {
            input: {
              agentId: props.agentId,
              secretGroupId,
            },
          },
          updater: (store) => {
            upsertAttachmentInStore(store, fieldArguments, "AgentSecretGroups", "AttachSecretGroupToAgent");
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to attach secret group.");
    } finally {
      setBusySecretGroupId(null);
    }
  };

  const detachSecretGroup = async (secretGroupId: string) => {
    if (isMutating) {
      return;
    }

    setErrorMessage(null);
    setBusySecretGroupId(secretGroupId);

    try {
      await new Promise<void>((resolve, reject) => {
        commitDetachSecretGroup({
          variables: {
            input: {
              agentId: props.agentId,
              secretGroupId,
            },
          },
          updater: (store) => {
            removeAttachmentFromStore(store, fieldArguments, "AgentSecretGroups", "DetachSecretGroupFromAgent");
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to detach secret group.");
    } finally {
      setBusySecretGroupId(null);
    }
  };

  const attachSecret = async (secretId: string) => {
    if (isMutating) {
      return;
    }

    setErrorMessage(null);
    setBusySecretId(secretId);

    try {
      await new Promise<void>((resolve, reject) => {
        commitAttachSecret({
          variables: {
            input: {
              agentId: props.agentId,
              secretId,
            },
          },
          updater: (store) => {
            upsertAttachmentInStore(store, fieldArguments, "AgentSecrets", "AttachSecretToAgent");
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to attach secret.");
    } finally {
      setBusySecretId(null);
    }
  };

  const detachSecret = async (secretId: string) => {
    if (isMutating) {
      return;
    }

    setErrorMessage(null);
    setBusySecretId(secretId);

    try {
      await new Promise<void>((resolve, reject) => {
        commitDetachSecret({
          variables: {
            input: {
              agentId: props.agentId,
              secretId,
            },
          },
          updater: (store) => {
            removeAttachmentFromStore(store, fieldArguments, "AgentSecrets", "DetachSecretFromAgent");
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to detach secret.");
    } finally {
      setBusySecretId(null);
    }
  };

  return (
    <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader>
        <CardDescription>
          Choose which secrets or secret groups are stored on this agent for future session setup.
          Existing sessions keep their current attachments.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <DefaultAttachmentSection
          addLabel="Add secret group"
          availableEmptyLabel="All company secret groups already added"
          availableOptions={availableSecretGroupOptions}
          busyItemId={busySecretGroupId}
          currentLabel="Attached secret groups"
          disabled={isMutating}
          emptyStateLabel="No secret groups attached to this agent yet."
          onAdd={attachSecretGroup}
          onRemove={detachSecretGroup}
          placeholder="Select a secret group"
          selectedOptions={props.agentSecretGroups.map((group) => ({
            id: group.id,
            label: group.name,
          }))}
        />

        <DefaultAttachmentSection
          addLabel="Add default secret"
          availableEmptyLabel="All company secrets already added"
          availableOptions={availableSecretOptions}
          busyItemId={busySecretId}
          currentLabel="Attached individual secrets"
          disabled={isMutating}
          emptyStateLabel="No individual secrets attached to this agent yet."
          onAdd={attachSecret}
          onRemove={detachSecret}
          placeholder="Select a secret"
          selectedOptions={props.agentSecrets.map((secret) => ({
            description: secret.description,
            id: secret.id,
            label: secret.name,
            metaLabel: secret.envVarName,
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
