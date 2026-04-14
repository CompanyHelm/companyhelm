import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { EditableSecretField } from "./editable_secret_field";

export type EditableSecretRecord = {
  description: string | null;
  envVarName: string;
  id: string;
  name: string;
  secretGroupId: string | null;
};

export type EditSecretDialogGroupOption = {
  id: string;
  name: string;
};

interface EditSecretDialogProps {
  deletingSecretId: string | null;
  groupOptions: EditSecretDialogGroupOption[];
  isOpen: boolean;
  onDelete(secretId: string): Promise<void>;
  onOpenChange(open: boolean): void;
  onUpdateEnvVarName(secretId: string, envVarName: string): Promise<void>;
  onUpdateName(secretId: string, name: string): Promise<void>;
  onUpdateSecretGroupId(secretId: string, secretGroupId: string | null): Promise<void>;
  onUpdateValue(secretId: string, value: string): Promise<void>;
  secret: EditableSecretRecord | null;
}

const UNGROUPED_SECRET_GROUP_VALUE = "__ungrouped__";

/**
 * Hosts all editable secret fields inside one modal so the list stays compact while users can
 * still rotate names, env vars, and group placement without exposing plaintext values.
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

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="edit-secret-group">
              Group
            </label>
            <Select
              items={[
                {
                  label: "Ungrouped",
                  value: UNGROUPED_SECRET_GROUP_VALUE,
                },
                ...props.groupOptions.map((group) => ({
                  label: group.name,
                  value: group.id,
                })),
              ]}
              onValueChange={(nextValue) => {
                void props.onUpdateSecretGroupId(
                  props.secret!.id,
                  nextValue === UNGROUPED_SECRET_GROUP_VALUE ? null : (nextValue ?? null),
                );
              }}
              value={props.secret.secretGroupId ?? UNGROUPED_SECRET_GROUP_VALUE}
            >
              <SelectTrigger id="edit-secret-group">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNGROUPED_SECRET_GROUP_VALUE}>Ungrouped</SelectItem>
                {props.groupOptions.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
