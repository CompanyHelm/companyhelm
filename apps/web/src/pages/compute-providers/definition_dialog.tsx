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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ComputeProviderDefinitionDialogRecord = {
  description: string | null;
  daytonaApiUrl: string | null;
  id: string;
  name: string;
  provider: "daytona" | "e2b";
};

interface ComputeProviderDefinitionDialogProps {
  definition: ComputeProviderDefinitionDialogRecord | null;
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input:
    | {
        description?: string;
        daytona: {
          apiKey: string;
          apiUrl?: string;
        };
        name: string;
        provider: "daytona";
      }
    | {
        description?: string;
        e2b: {
          apiKey: string;
        };
        name: string;
        provider: "e2b";
      }
    | {
        daytona: {
          apiKey?: string;
          apiUrl?: string;
        };
        description?: string;
        id: string;
        name: string;
        provider: "daytona";
      }
    | {
        description?: string;
        e2b: {
          apiKey?: string;
        };
        id: string;
        name: string;
        provider: "e2b";
      }
  ) => Promise<void>;
}

function formatProviderLabel(provider: "daytona" | "e2b"): string {
  return provider === "e2b" ? "E2B" : "Daytona";
}

/**
 * Collects the typed configuration for one compute provider definition. The dialog keeps provider
 * selection and provider-specific fields in one place so the page can reuse it for both create and
 * edit flows.
 */
export function ComputeProviderDefinitionDialog(props: ComputeProviderDefinitionDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<"daytona" | "e2b">("daytona");
  const [daytonaApiUrl, setDaytonaApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const isEditing = props.definition !== null;

  useEffect(() => {
    if (!props.isOpen) {
      setName("");
      setDescription("");
      setProvider("daytona");
      setDaytonaApiUrl("");
      setApiKey("");
      return;
    }

    if (!props.definition) {
      setName("");
      setDescription("");
      setProvider("daytona");
      setDaytonaApiUrl("");
      setApiKey("");
      return;
    }

    setName(props.definition.name);
    setDescription(props.definition.description ?? "");
    setProvider(props.definition.provider);
    setDaytonaApiUrl(props.definition.daytonaApiUrl ?? "");
    setApiKey("");
  }, [props.definition, props.isOpen]);

  const title = isEditing ? "Edit compute provider" : "Create compute provider";
  const descriptionText = isEditing
    ? "Update the shared company definition that agents can use for environment provisioning."
    : "Add a shared Daytona or E2B definition that agents can use as their environment backend.";
  const apiKeyLabel = isEditing ? "API key (optional)" : "API key";
  const isSaveDisabled = useMemo(() => {
    if (name.trim().length === 0) {
      return true;
    }

    if (!isEditing && apiKey.trim().length === 0) {
      return true;
    }

    return false;
  }, [apiKey, daytonaApiUrl, isEditing, name, provider]);

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
            <Select
              items={[
                { label: "Daytona", value: "daytona" },
                { label: "E2B", value: "e2b" },
              ]}
              onValueChange={(value) => {
                setProvider(value as "daytona" | "e2b");
              }}
              value={provider}
            >
              <SelectTrigger disabled={isEditing} id="compute-provider-type">
                <SelectValue placeholder="Select a compute provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daytona">Daytona</SelectItem>
                <SelectItem value="e2b">E2B</SelectItem>
              </SelectContent>
            </Select>
            {isEditing ? (
              <p className="text-xs text-muted-foreground">
                Provider type is fixed after creation.
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Published range: {ComputeProviderLimitsCatalog.formatPublishedRangeSummary(provider)}
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
              placeholder={`${formatProviderLabel(provider)} sandbox configuration`}
              value={description}
            />
          </div>

          {provider === "daytona" ? (
            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="compute-provider-api-url">
                API URL (optional)
              </label>
              <Input
                id="compute-provider-api-url"
                onChange={(event) => {
                  setDaytonaApiUrl(event.target.value);
                }}
                placeholder="https://app.daytona.io/api"
                value={daytonaApiUrl}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the default Daytona API endpoint.
              </p>
            </div>
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
              placeholder={provider === "e2b" ? "e2b_api_key" : "daytona_api_key"}
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
            disabled={isSaveDisabled || props.isSaving}
            onClick={async () => {
              if (provider === "daytona") {
                await props.onSave(isEditing && props.definition
                  ? {
                      daytona: {
                        apiKey,
                        apiUrl: daytonaApiUrl.trim() ? daytonaApiUrl : undefined,
                      },
                      description,
                      id: props.definition.id,
                      name,
                      provider: "daytona",
                    }
                  : {
                      daytona: {
                        apiKey,
                        apiUrl: daytonaApiUrl.trim() ? daytonaApiUrl : undefined,
                      },
                      description,
                      name,
                      provider: "daytona",
                    });
                return;
              }

              await props.onSave(isEditing && props.definition
                ? {
                    description,
                    e2b: {
                      apiKey,
                    },
                    id: props.definition.id,
                    name,
                    provider: "e2b",
                  }
                : {
                    description,
                    e2b: {
                      apiKey,
                    },
                    name,
                    provider: "e2b",
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
