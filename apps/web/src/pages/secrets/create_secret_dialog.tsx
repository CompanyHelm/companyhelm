import { useEffect, useMemo, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { EnvVarNameResolver } from "./env_var_name_resolver";

interface CreateSecretDialogProps {
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  onCreate(input: {
    description?: string;
    envVarName?: string;
    name: string;
    value: string;
  }): Promise<void>;
  onOpenChange(open: boolean): void;
}

/**
 * Collects the minimum fields needed to create one encrypted company secret while leaving the
 * actual encryption and env-var defaulting to the API.
 */
export function CreateSecretDialog(props: CreateSecretDialogProps) {
  const [description, setDescription] = useState("");
  const [envVarName, setEnvVarName] = useState("");
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [isSecretValueVisible, setSecretValueVisible] = useState(false);
  const defaultEnvVarName = useMemo(() => {
    const resolver = new EnvVarNameResolver();
    return resolver.resolveDefaultEnvVarName(name);
  }, [name]);

  useEffect(() => {
    if (!props.isOpen) {
      setDescription("");
      setEnvVarName("");
      setSecretValueVisible(false);
      setLocalErrorMessage(null);
      setName("");
      setValue("");
    }
  }, [props.isOpen]);

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
            <div className="relative">
              <Input
                autoComplete="off"
                className="pr-10"
                id="secret-value"
                onChange={(event) => {
                  setValue(event.target.value);
                }}
                placeholder="ghp_..."
                type={isSecretValueVisible ? "text" : "password"}
                value={value}
              />
              <Button
                aria-label={isSecretValueVisible ? "Hide secret value" : "Show secret value"}
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={() => {
                  setSecretValueVisible((currentValue) => !currentValue);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                {isSecretValueVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </Button>
            </div>
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
            disabled={props.isSaving || !name.trim() || !value.trim()}
            onClick={async () => {
              setLocalErrorMessage(null);

              try {
                await props.onCreate({
                  description: description.trim() ? description : undefined,
                  envVarName: envVarName.trim() ? envVarName : undefined,
                  name: name.trim(),
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
