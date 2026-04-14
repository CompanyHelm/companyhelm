import { useEffect, useMemo, useState } from "react";
import { FolderPlusIcon } from "lucide-react";
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
import { EnvVarNameResolver } from "./env_var_name_resolver";
import { SecretValueInput } from "./secret_value_input";

export type CreateSecretDialogGroupOption = {
  id: string;
  name: string;
};

interface CreateSecretDialogProps {
  errorMessage: string | null;
  groups: CreateSecretDialogGroupOption[];
  isOpen: boolean;
  isSaving: boolean;
  onCreate(input: {
    description?: string;
    envVarName?: string;
    name: string;
    secretGroupId?: string | null;
    value: string;
  }): Promise<void>;
  onCreateGroup(name: string): Promise<CreateSecretDialogGroupOption>;
  onOpenChange(open: boolean): void;
}

const UNGROUPED_SECRET_GROUP_VALUE = "__ungrouped__";

/**
 * Collects the fields needed to create one encrypted company secret while keeping group
 * assignment, env-var defaults, and inline group creation in the same modal flow.
 */
export function CreateSecretDialog(props: CreateSecretDialogProps) {
  const [description, setDescription] = useState("");
  const [draftSecretGroupName, setDraftSecretGroupName] = useState("");
  const [envVarName, setEnvVarName] = useState("");
  const [ephemeralSecretGroup, setEphemeralSecretGroup] = useState<CreateSecretDialogGroupOption | null>(null);
  const [isCreateGroupFormOpen, setCreateGroupFormOpen] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isSecretValueVisible, setSecretValueVisible] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [secretGroupId, setSecretGroupId] = useState(UNGROUPED_SECRET_GROUP_VALUE);
  const [value, setValue] = useState("");
  const defaultEnvVarName = useMemo(() => {
    const resolver = new EnvVarNameResolver();
    return resolver.resolveDefaultEnvVarName(name);
  }, [name]);
  const groupOptions = useMemo(() => {
    const nextGroups = ephemeralSecretGroup && !props.groups.some((group) => group.id === ephemeralSecretGroup.id)
      ? [...props.groups, ephemeralSecretGroup]
      : props.groups;
    return [...nextGroups].sort((left, right) => left.name.localeCompare(right.name));
  }, [ephemeralSecretGroup, props.groups]);

  useEffect(() => {
    if (!props.isOpen) {
      setCreateGroupFormOpen(false);
      setDescription("");
      setDraftSecretGroupName("");
      setEnvVarName("");
      setEphemeralSecretGroup(null);
      setIsCreatingGroup(false);
      setSecretGroupId(UNGROUPED_SECRET_GROUP_VALUE);
      setSecretValueVisible(false);
      setLocalErrorMessage(null);
      setName("");
      setValue("");
    }
  }, [props.isOpen]);

  async function createSecretGroup() {
    setLocalErrorMessage(null);
    setIsCreatingGroup(true);

    try {
      const createdGroup = await props.onCreateGroup(draftSecretGroupName);
      setDraftSecretGroupName("");
      setEphemeralSecretGroup(createdGroup);
      setSecretGroupId(createdGroup.id);
      setCreateGroupFormOpen(false);
    } catch (error) {
      setLocalErrorMessage(error instanceof Error ? error.message : "Failed to create secret group.");
    } finally {
      setIsCreatingGroup(false);
    }
  }

  return (
    <Dialog
      disablePointerDismissal
      onOpenChange={props.onOpenChange}
      open={props.isOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create secret</DialogTitle>
          <DialogDescription>
            Add an encrypted company secret that sessions can attach and inject during command execution.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="secret-name">
              Name
            </label>
            <Input
              autoComplete="off"
              id="secret-name"
              onChange={(event) => {
                setName(event.target.value);
              }}
              placeholder="Github token"
              value={name}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-foreground" htmlFor="secret-group">
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
                  value: UNGROUPED_SECRET_GROUP_VALUE,
                },
                ...groupOptions.map((group) => ({
                  label: group.name,
                  value: group.id,
                })),
              ]}
              onValueChange={(nextValue) => {
                setSecretGroupId(nextValue ?? UNGROUPED_SECRET_GROUP_VALUE);
              }}
              value={secretGroupId}
            >
              <SelectTrigger id="secret-group">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNGROUPED_SECRET_GROUP_VALUE}>Ungrouped</SelectItem>
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
                  <label className="text-xs font-medium text-foreground" htmlFor="secret-new-group">
                    New group name
                  </label>
                  <Input
                    id="secret-new-group"
                    onChange={(event) => {
                      setDraftSecretGroupName(event.target.value);
                    }}
                    placeholder="Deployments"
                    value={draftSecretGroupName}
                  />
                </div>
                <Button
                  onClick={() => {
                    setCreateGroupFormOpen(false);
                    setDraftSecretGroupName("");
                    setLocalErrorMessage(null);
                  }}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={draftSecretGroupName.length === 0 || isCreatingGroup}
                  onClick={() => {
                    void createSecretGroup();
                  }}
                  type="button"
                >
                  {isCreatingGroup ? "Creating..." : "Create group"}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="secret-env-var">
              Environment variable (optional)
            </label>
            <Input
              autoComplete="off"
              id="secret-env-var"
              onChange={(event) => {
                setEnvVarName(event.target.value);
              }}
              placeholder={defaultEnvVarName ?? "Defaults from the name"}
              value={envVarName}
            />
            <p className="text-[11px] text-muted-foreground">
              Leave empty to use the default env var derived from the secret name.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="secret-description">
              Description (optional)
            </label>
            <textarea
              autoComplete="off"
              id="secret-description"
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              placeholder="Used for GitHub CLI calls against the company installation."
              value={description}
              className={cn(
                "min-h-24 w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
              )}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="secret-value">
              Secret value
            </label>
            <SecretValueInput
              id="secret-value"
              isVisible={isSecretValueVisible}
              onChange={setValue}
              onToggleVisibility={() => {
                setSecretValueVisible((currentValue) => !currentValue);
              }}
              placeholder="ghp_..."
              value={value}
            />
          </div>

          {localErrorMessage || props.errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {localErrorMessage || props.errorMessage}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              props.onOpenChange(false);
            }}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            data-primary-cta=""
            disabled={props.isSaving || !name.trim() || !value.trim()}
            onClick={async () => {
              setLocalErrorMessage(null);

              try {
                await props.onCreate({
                  description: description.trim() ? description : undefined,
                  envVarName: envVarName.trim() ? envVarName : undefined,
                  name: name.trim(),
                  secretGroupId: secretGroupId === UNGROUPED_SECRET_GROUP_VALUE ? null : secretGroupId,
                  value,
                });
              } catch (error) {
                setLocalErrorMessage(error instanceof Error ? error.message : "Failed to create secret.");
              }
            }}
            type="button"
          >
            Create secret
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
