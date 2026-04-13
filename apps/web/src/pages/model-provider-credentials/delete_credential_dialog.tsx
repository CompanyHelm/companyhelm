import { useEffect, useMemo, useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DeleteCredentialDialogAgentRecord = {
  id: string;
  name: string;
};

export type DeleteCredentialDialogReplacementRecord = {
  id: string;
  isDefault: boolean;
  label: string;
};

type DeleteCredentialDialogCredentialRecord = {
  id: string;
  isDefault: boolean;
  name: string;
  sessionCount: number;
  usingAgents: DeleteCredentialDialogAgentRecord[];
};

interface DeleteCredentialDialogProps {
  credential: DeleteCredentialDialogCredentialRecord;
  deletingCredentialId: string | null;
  onDelete(input: {
    credentialId: string;
    replacementCredentialId?: string | null;
  }): Promise<void>;
  replacementOptions: DeleteCredentialDialogReplacementRecord[];
}

/**
 * Keeps credential deletion and optional reassignment in one focused modal so operators can see
 * the affected agents, understand when persisted sessions will move too, and resolve the full
 * flow without leaving the credentials list.
 */
export function DeleteCredentialDialog(props: DeleteCredentialDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [replacementCredentialId, setReplacementCredentialId] = useState("");
  const requiresReplacement = props.credential.usingAgents.length > 0 || props.credential.sessionCount > 0;
  const orderedReplacementOptions = useMemo(() => {
    return props.replacementOptions
      .filter((replacementOption) => replacementOption.id !== props.credential.id)
      .sort((left, right) => {
        if (left.isDefault !== right.isDefault) {
          return left.isDefault ? -1 : 1;
        }

        return left.label.localeCompare(right.label);
      });
  }, [props.credential.id, props.replacementOptions]);
  const isDeleteDisabled = props.deletingCredentialId === props.credential.id
    || (requiresReplacement && replacementCredentialId.length === 0)
    || (requiresReplacement && orderedReplacementOptions.length === 0);

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setReplacementCredentialId("");
    }
  }, [isOpen, props.credential.id]);

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger
        className={buttonVariants({
          size: "icon",
          variant: "ghost",
        })}
        disabled={props.deletingCredentialId === props.credential.id}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <Trash2Icon className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent
        className="w-[min(92vw,38rem)]"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <DialogHeader>
          <DialogTitle>Delete credential</DialogTitle>
          <DialogDescription>
            {requiresReplacement
              ? "Pick a replacement credential first. The affected agents and any existing sessions on this credential will move to that replacement before the credential is deleted."
              : "This will permanently delete the credential and its stored models. This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{props.credential.name}</p>
              {props.credential.isDefault ? <Badge variant="secondary">Default</Badge> : null}
            </div>
          </div>

          {props.credential.usingAgents.length > 0 ? (
            <div className="grid gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Assigned Agents
              </p>
              <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-3">
                <ul className="grid gap-2">
                  {props.credential.usingAgents.map((agent) => (
                    <li key={agent.id} className="text-sm text-foreground">
                      {agent.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {props.credential.sessionCount > 0 ? (
            <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
              {props.credential.sessionCount === 1
                ? "1 existing session will also move to the replacement credential."
                : `${props.credential.sessionCount} existing sessions will also move to the replacement credential.`}
            </div>
          ) : null}

          {requiresReplacement ? (
            <div className="grid gap-2">
              <label
                className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
                htmlFor={`replacement-credential-${props.credential.id}`}
              >
                Replacement Credential
              </label>
              <Select
                items={orderedReplacementOptions.map((replacementOption) => ({
                  label: replacementOption.label,
                  value: replacementOption.id,
                }))}
                onValueChange={(value) => {
                  setErrorMessage(null);
                  setReplacementCredentialId(value ?? "");
                }}
                value={replacementCredentialId}
              >
                <SelectTrigger id={`replacement-credential-${props.credential.id}`}>
                  <SelectValue placeholder="Select a replacement credential" />
                </SelectTrigger>
                <SelectContent>
                  {orderedReplacementOptions.map((replacementOption) => (
                    <SelectItem key={replacementOption.id} value={replacementOption.id}>
                      {replacementOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {orderedReplacementOptions.length === 0 ? (
                <p className="text-xs text-destructive">
                  No other credentials with available models exist yet. Add another credential before deleting this one.
                </p>
              ) : null}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            data-primary-cta=""
            variant="destructive"
            disabled={isDeleteDisabled}
            onClick={async (event) => {
              event.stopPropagation();
              setErrorMessage(null);

              await props.onDelete({
                credentialId: props.credential.id,
                replacementCredentialId: requiresReplacement ? replacementCredentialId : null,
              }).then(() => {
                setIsOpen(false);
              }).catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : "Failed to delete credential.");
              });
            }}
          >
            {requiresReplacement ? "Move and delete" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
