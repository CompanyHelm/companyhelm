import { useMemo, useState } from "react";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import { graphql, useMutation } from "react-relay";
import { useToast } from "@/components/toast_provider";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { agentSecretDefaultsCardAttachSecretToAgentMutation } from "./__generated__/agentSecretDefaultsCardAttachSecretToAgentMutation.graphql";
import type { agentSecretDefaultsCardDetachSecretFromAgentMutation } from "./__generated__/agentSecretDefaultsCardDetachSecretFromAgentMutation.graphql";
import { DefaultAttachmentSection } from "./default_attachment_section";

type AgentSecretRecord = {
  description: string | null;
  envVarName: string;
  id: string;
  name: string;
};

type StoreSecretRecord = {
  getDataID(): string;
  getValue(name: string): unknown;
};

interface AgentSecretDefaultsCardProps {
  agentId: string;
  agentSecrets: AgentSecretRecord[];
  companySecrets: AgentSecretRecord[];
}

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

const agentSecretDefaultsCardDetachSecretFromAgentMutationNode = graphql`
  mutation agentSecretDefaultsCardDetachSecretFromAgentMutation($input: DetachSecretFromAgentInput!) {
    DetachSecretFromAgent(input: $input) {
      id
    }
  }
`;

function filterStoreSecretRecords(records: ReadonlyArray<unknown>): StoreSecretRecord[] {
  return records.filter((record): record is StoreSecretRecord => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function"
      && "getValue" in record
      && typeof record.getValue === "function";
  });
}

function sortStoreSecretRecords(records: StoreSecretRecord[]): StoreSecretRecord[] {
  return [...records].sort((left, right) => {
    return String(left.getValue("name") ?? "").localeCompare(String(right.getValue("name") ?? ""));
  });
}

function upsertAgentSecretInStore(
  store: RecordSourceSelectorProxy,
  agentId: string,
) {
  const nextSecret = store.getRootField("AttachSecretToAgent");
  if (!nextSecret) {
    return;
  }

  const rootRecord = store.getRoot();
  const fieldArguments = { agentId };
  const currentSecrets = filterStoreSecretRecords(rootRecord.getLinkedRecords("AgentSecrets", fieldArguments) || []);
  const existingSecret = currentSecrets.find((secret) => secret.getDataID() === nextSecret.getDataID());
  const nextSecrets = existingSecret
    ? currentSecrets.map((secret) => secret.getDataID() === nextSecret.getDataID() ? nextSecret : secret)
    : [...currentSecrets, nextSecret];
  rootRecord.setLinkedRecords(sortStoreSecretRecords(nextSecrets), "AgentSecrets", fieldArguments);
}

function removeAgentSecretFromStore(
  store: RecordSourceSelectorProxy,
  agentId: string,
) {
  const deletedSecret = store.getRootField("DetachSecretFromAgent");
  if (!deletedSecret) {
    return;
  }

  const rootRecord = store.getRoot();
  const fieldArguments = { agentId };
  const currentSecrets = filterStoreSecretRecords(rootRecord.getLinkedRecords("AgentSecrets", fieldArguments) || []);
  rootRecord.setLinkedRecords(
    currentSecrets.filter((secret) => secret.getDataID() !== deletedSecret.getDataID()),
    "AgentSecrets",
    fieldArguments,
  );
}

/**
 * Lets users manage which company secrets are copied into future sessions created from an agent.
 * The picker only shows unattached secrets, while the current defaults stay visible as removable
 * pills so the scope of each change is obvious at a glance.
 */
export function AgentSecretDefaultsCard(props: AgentSecretDefaultsCardProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busySecretId, setBusySecretId] = useState<string | null>(null);
  const [commitAttachSecret, isAttachSecretInFlight] = useMutation<agentSecretDefaultsCardAttachSecretToAgentMutation>(
    agentSecretDefaultsCardAttachSecretToAgentMutationNode,
  );
  const [commitDetachSecret, isDetachSecretInFlight] = useMutation<agentSecretDefaultsCardDetachSecretFromAgentMutation>(
    agentSecretDefaultsCardDetachSecretFromAgentMutationNode,
  );
  const toast = useToast();

  const attachedSecretIds = useMemo(() => {
    return new Set(props.agentSecrets.map((secret) => secret.id));
  }, [props.agentSecrets]);
  const availableSecretOptions = useMemo(() => {
    return props.companySecrets
      .filter((secret) => !attachedSecretIds.has(secret.id))
      .map((secret) => ({
        description: secret.description,
        label: `${secret.name} (${secret.envVarName})`,
        value: secret.id,
      }));
  }, [attachedSecretIds, props.companySecrets]);
  const isMutating = isAttachSecretInFlight || isDetachSecretInFlight;

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
            upsertAgentSecretInStore(store, props.agentId);
          },
          onCompleted: (_response, errors) => {
            const errorMessage = String(errors?.[0]?.message || "").trim();
            if (errorMessage) {
              reject(new Error(errorMessage));
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
            removeAgentSecretFromStore(store, props.agentId);
          },
          onCompleted: (_response, errors) => {
            const errorMessage = String(errors?.[0]?.message || "").trim();
            if (errorMessage) {
              reject(new Error(errorMessage));
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
          Choose which company secrets are copied into new sessions created from this agent. Existing sessions keep
          their current attachments.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <DefaultAttachmentSection
            addLabel="Add default secret"
            availableEmptyLabel="All company secrets already added"
            availableOptions={availableSecretOptions.map((option) => ({
              description: option.description,
              id: option.value,
              label: option.label,
            }))}
            busyItemId={busySecretId}
            currentLabel="Current defaults"
            disabled={isMutating}
            emptyStateLabel="No default secrets configured for this agent yet."
            onAdd={async (secretId) => {
              await attachSecret(secretId);
            }}
            onRemove={async (secretId) => {
              await detachSecret(secretId);
            }}
            placeholder="Select a secret"
            selectedOptions={props.agentSecrets.map((secret) => ({
              description: secret.description,
              id: secret.id,
              label: secret.name,
              metaLabel: secret.envVarName,
            }))}
          />
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {errorMessage}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
