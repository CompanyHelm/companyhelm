import { useEffect, useState } from "react";
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
import { formatProviderLabel } from "./provider_label";

interface CreateCredentialDialogProps {
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  onCreate(input: {
    apiKey: string;
    name?: string;
    modelProvider: "openai" | "anthropic";
  }): Promise<void>;
  onOpenChange(open: boolean): void;
}

export function CreateCredentialDialog(props: CreateCredentialDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [name, setName] = useState("");
  const [modelProvider, setModelProvider] = useState<"openai" | "anthropic">("openai");

  useEffect(() => {
    if (!props.isOpen) {
      setApiKey("");
      setName("");
      setModelProvider("openai");
    }
  }, [props.isOpen]);

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create credentials</DialogTitle>
          <DialogDescription>
            Add a provider API key for the currently active company.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="model-provider">
              Provider
            </label>
            <Select
              items={[
                { label: "OpenAI / Codex", value: "openai" },
                { label: "Anthropic", value: "anthropic" },
              ]}
              onValueChange={(value) => {
                setModelProvider(value as "openai" | "anthropic");
              }}
              value={modelProvider}
            >
              <SelectTrigger id="model-provider">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI / Codex</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="credential-name">
              Credential name
            </label>
            <Input
              autoComplete="off"
              id="credential-name"
              onChange={(event) => {
                setName(event.target.value);
              }}
              placeholder={formatProviderLabel(modelProvider)}
              value={name}
            />
            <p className="text-[11px] text-muted-foreground">
              Optional. Defaults to the provider name.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="provider-api-key">
              API_KEY
            </label>
            <Input
              autoComplete="off"
              id="provider-api-key"
              onChange={(event) => {
                setApiKey(event.target.value);
              }}
              placeholder="sk-..."
              type="password"
              value={apiKey}
            />
          </div>

          {props.errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {props.errorMessage}
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
            disabled={props.isSaving || !apiKey.trim()}
            onClick={async () => {
              await props.onCreate({
                apiKey,
                name,
                modelProvider,
              });
            }}
            type="button"
          >
            {props.isSaving ? "Creating..." : "Create credentials"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
