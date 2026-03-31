import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditableSecretField } from "./editable_secret_field";

export type EditableSecretRecord = {
  description: string | null;
  envVarName: string;
  id: string;
  name: string;
};

interface EditSecretDialogProps {
  deletingSecretId: string | null;
  isOpen: boolean;
  onDelete(secretId: string): Promise<void>;
  onOpenChange(open: boolean): void;
  onUpdateEnvVarName(secretId: string, envVarName: string): Promise<void>;
  onUpdateName(secretId: string, name: string): Promise<void>;
  onUpdateValue(secretId: string, value: string): Promise<void>;
  secret: EditableSecretRecord | null;
}

/**
 * Hosts all editable secret fields inside one modal so the list stays compact while users can
 * still rotate names, env vars, and the stored encrypted value in place.
 */
export function EditSecretDialog(props: EditSecretDialogProps) {
  if (!props.secret) {
    return null;
  }

  return (
    <Dialog
      disablePointerDismissal
      onOpenChange={props.onOpenChange}
      open={props.isOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit secret</DialogTitle>
          <DialogDescription>
            Secret values are never shown again after creation. Enter a new value only when you want to rotate it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <EditableSecretField
            displayValue={props.secret.name}
            label="Name"
            onSave={async (value) => {
              await props.onUpdateName(props.secret!.id, value);
            }}
            value={props.secret.name}
          />

          <EditableSecretField
            displayValue={props.secret.envVarName}
            label="Environment Variable"
            onSave={async (value) => {
              await props.onUpdateEnvVarName(props.secret!.id, value);
            }}
            value={props.secret.envVarName}
          />

          <EditableSecretField
            displayValue="Stored value hidden"
            label="Secret Value"
            onSave={async (value) => {
              await props.onUpdateValue(props.secret!.id, value);
            }}
            placeholder="Enter a new value to replace the existing secret"
            value=""
            valueType="password"
          />
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <Button
            disabled={props.deletingSecretId === props.secret.id}
            onClick={async () => {
              await props.onDelete(props.secret!.id);
            }}
            type="button"
            variant="destructive"
          >
            Delete secret
          </Button>
          <Button
            onClick={() => {
              props.onOpenChange(false);
            }}
            type="button"
            variant="ghost"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
