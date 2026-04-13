import { useEffect, useMemo, useState } from "react";
import { ComputeProviderLimitsCatalog } from "@/compute_provider_limits_catalog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ComputeProviderDefinitionDialogRecord = {
  description: string | null;
  id: string;
  name: string;
  provider: "e2b";
};

interface ComputeProviderDefinitionDialogProps {
  definition: ComputeProviderDefinitionDialogRecord | null;
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  suggestDefault: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input:
    | {
        description?: string;
        e2b: {
          apiKey: string;
        };
        isDefault?: boolean;
        name: string;
      }
    | {
        description?: string;
        e2b: {
          apiKey?: string;
        };
        id: string;
        name: string;
      }
  ) => Promise<void>;
}

/**
 * Collects the typed configuration for one E2B compute provider definition. The dialog stays
 * intentionally small because CompanyHelm only supports E2B-backed compute definitions now.
 */
export function ComputeProviderDefinitionDialog(props: ComputeProviderDefinitionDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const isEditing = props.definition !== null;

  useEffect(() => {
    if (!props.isOpen) {
      setName("");
      setDescription("");
      setApiKey("");
      setIsDefault(props.suggestDefault);
      return;
    }

    if (!props.definition) {
      setName("");
      setDescription("");
      setApiKey("");
      setIsDefault(props.suggestDefault);
      return;
    }

    setName(props.definition.name);
    setDescription(props.definition.description ?? "");
    setApiKey("");
    setIsDefault(false);
  }, [props.definition, props.isOpen, props.suggestDefault]);

  const title = isEditing ? "Edit compute provider" : "Create compute provider";
  const descriptionText = isEditing
    ? "Update the shared E2B definition that agents can use for environment provisioning."
    : "Add a shared E2B definition that agents can use as their environment backend.";
  const apiKeyLabel = isEditing ? "API key (optional)" : "API key";
  const isSaveDisabled = useMemo(() => {
    if (name.trim().length === 0) {
      return true;
    }

    if (!isEditing && apiKey.trim().length === 0) {
      return true;
    }

    return false;
  }, [apiKey, isEditing, name]);

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="compute-provider-name">
              Name
            </label>
            <Input
              id="compute-provider-name"
              onChange={(event) => {
                setName(event.target.value);
              }}
              placeholder="Primary E2B"
              value={name}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="compute-provider-type">
              Provider
            </label>
            <Input
              disabled
              id="compute-provider-type"
              value="E2B"
            />
            <p className="text-xs text-muted-foreground">
              Published range: {ComputeProviderLimitsCatalog.formatPublishedRangeSummary()}
            </p>
            <p className="text-xs text-muted-foreground">
              {ComputeProviderLimitsCatalog.getPublishedRangeDisclaimer()}
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="compute-provider-description">
              Description (optional)
            </label>
            <Input
              id="compute-provider-description"
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              placeholder="E2B sandbox configuration"
              value={description}
            />
          </div>

          {!isEditing ? (
            <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
              <input
                checked={isDefault}
                className="mt-0.5 size-4 rounded border border-input bg-background"
                onChange={(event) => {
                  setIsDefault(event.target.checked);
                }}
                type="checkbox"
              />
              <div className="grid gap-1">
                <span className="text-xs font-medium text-foreground">Default for new agents</span>
                <span className="text-xs text-muted-foreground">
                  Newly created agents will preselect this environment provider.
                </span>
              </div>
            </label>
          ) : null}

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="compute-provider-api-key">
              {apiKeyLabel}
            </label>
            <Input
              id="compute-provider-api-key"
              onChange={(event) => {
                setApiKey(event.target.value);
              }}
              placeholder="e2b_api_key"
              type="password"
              value={apiKey}
            />
            {isEditing ? (
              <p className="text-xs text-muted-foreground">
                Leave empty to keep the current API key.
              </p>
            ) : null}
          </div>

          {props.errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {props.errorMessage}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={() => props.onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            data-primary-cta=""
            disabled={isSaveDisabled || props.isSaving}
            onClick={async () => {
              await props.onSave(isEditing && props.definition
                ? {
                    description,
                    e2b: {
                      apiKey,
                    },
                    id: props.definition.id,
                    name,
                  }
                : {
                    description,
                    e2b: {
                      apiKey,
                    },
                    ...(isDefault ? { isDefault: true } : {}),
                    name,
                  });
            }}
          >
            {props.isSaving ? "Saving…" : isEditing ? "Save changes" : "Create provider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
