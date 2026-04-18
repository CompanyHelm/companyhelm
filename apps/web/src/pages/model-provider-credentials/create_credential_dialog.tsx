import { useEffect, useState } from "react";
import { MarkdownContent } from "@/components/markdown_content";
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
import { OauthCredentialFileParser } from "./oauth_credential_file_parser";
import {
  ModelProviderCredentialCatalog,
  type ModelProviderCredentialDialogProvider,
} from "./provider_catalog";

interface CreateCredentialDialogProps {
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  providers: ModelProviderCredentialDialogProvider[];
  onCreate(input: {
    accessToken?: string;
    accessTokenExpiresAtMilliseconds?: string;
    apiKey?: string;
    baseUrl?: string;
    isDefault?: boolean;
    name?: string;
    modelProvider: string;
    refreshToken?: string;
  }): Promise<void>;
  onOpenChange(open: boolean): void;
  suggestDefault: boolean;
}

export function CreateCredentialDialog(props: CreateCredentialDialogProps) {
  const [authFileContents, setAuthFileContents] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [modelProvider, setModelProvider] = useState(props.providers[0]?.id ?? "");
  const selectedProvider = props.providers.find((provider) => provider.id === modelProvider) ?? null;
  const usesEditableBaseUrl = selectedProvider
    ? ModelProviderCredentialCatalog.usesEditableBaseUrl(selectedProvider)
    : false;

  useEffect(() => {
    if (!props.isOpen) {
      setAuthFileContents("");
      setApiKey("");
      setBaseUrl(props.providers[0]?.baseUrl ?? "");
      setIsDefault(props.suggestDefault);
      setLocalErrorMessage(null);
      setName("");
      setModelProvider(props.providers[0]?.id ?? "");
    }
  }, [props.isOpen, props.providers, props.suggestDefault]);

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
              items={props.providers.map((provider) => ({
                label: provider.name,
                value: provider.id,
              }))}
              onValueChange={(value) => {
                const nextProvider = props.providers.find((provider) => provider.id === value) ?? null;
                setAuthFileContents("");
                setApiKey("");
                setBaseUrl(nextProvider?.baseUrl ?? "");
                setLocalErrorMessage(null);
                setModelProvider(value ?? "");
              }}
              value={modelProvider}
            >
              <SelectTrigger id="model-provider">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {props.providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="credential-name">
              Credential name (optional)
            </label>
            <Input
              autoComplete="off"
              id="credential-name"
              onChange={(event) => {
                setName(event.target.value);
              }}
              placeholder={selectedProvider?.name ?? "Provider credential"}
              value={name}
            />
            <p className="text-[11px] text-muted-foreground">
              Optional. Defaults to the provider name.
            </p>
          </div>

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
                Newly created agents will preselect this credential.
              </span>
            </div>
          </label>

          {selectedProvider?.authorizationInstructionsMarkdown ? (
            <div className="grid gap-2">
              <p className="text-xs font-medium text-foreground">Instructions</p>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs/relaxed text-muted-foreground">
                <MarkdownContent
                  content={selectedProvider.authorizationInstructionsMarkdown}
                  tone="muted"
                  variant="compact"
                />
              </div>
            </div>
          ) : null}

          {selectedProvider?.type === "oauth" ? (
            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="provider-auth-file">
                Auth File
              </label>
              <textarea
                autoComplete="off"
                id="provider-auth-file"
                onChange={(event) => {
                  setAuthFileContents(event.target.value);
                }}
                placeholder='{\n  "google-gemini-cli": {\n    "type": "oauth",\n    "access": "...",\n    "refresh": "...",\n    "expires": 1775358352922,\n    "projectId": "..."\n  }\n}'
                value={authFileContents}
                className={cn(
                  "min-h-32 w-full rounded-md border border-input bg-input/20 px-3 py-2 font-mono text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                )}
              />
              <p className="text-[11px] text-muted-foreground">
                Paste the full auth file JSON. Only the selected provider entry will be used.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {selectedProvider && ModelProviderCredentialCatalog.requiresBaseUrl(selectedProvider) ? (
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="provider-base-url">
                    Base URL
                  </label>
                  <Input
                    autoComplete="off"
                    id="provider-base-url"
                    onChange={(event) => {
                      setBaseUrl(event.target.value);
                    }}
                    placeholder="http://localhost:11434/v1"
                    readOnly={!usesEditableBaseUrl}
                    value={baseUrl}
                  />
                </div>
              ) : null}
              <div className="grid gap-2">
                <label className="text-xs font-medium text-foreground" htmlFor="provider-api-key">
                  API key
                </label>
                <Input
                  autoComplete="off"
                  id="provider-api-key"
                  onChange={(event) => {
                    setApiKey(event.target.value);
                  }}
                  placeholder={selectedProvider?.id === ModelProviderCredentialCatalog.NVIDIA_PROVIDER_ID
                    ? "nvapi-..."
                    : (selectedProvider?.submittedProviderId === "openai-compatible" ? "ollama" : "sk-...")}
                  type="password"
                  value={apiKey}
                />
              </div>
            </div>
          )}

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
            disabled={props.isSaving || !selectedProvider || (
              selectedProvider.type === "oauth" ? !authFileContents.trim() : !apiKey.trim()
            ) || (selectedProvider ? (
              ModelProviderCredentialCatalog.requiresBaseUrl(selectedProvider) && !baseUrl.trim()
            ) : false)}
            onClick={async () => {
              setLocalErrorMessage(null);
              if (!selectedProvider) {
                return;
              }

              try {
                if (selectedProvider.type === "oauth") {
                  const parser = new OauthCredentialFileParser();
                  const oauthCredential = parser.parse({
                    authFileContents,
                    providerId: selectedProvider.id,
                  });

                  await props.onCreate({
                    accessToken: oauthCredential.accessToken,
                    accessTokenExpiresAtMilliseconds: oauthCredential.accessTokenExpiresAtMilliseconds,
                    ...(isDefault ? { isDefault: true } : {}),
                    name,
                    modelProvider: selectedProvider.submittedProviderId,
                    refreshToken: oauthCredential.refreshToken,
                  });
                  return;
                }

                const resolvedBaseUrl = ModelProviderCredentialCatalog.resolveBaseUrl({
                  baseUrl,
                  provider: selectedProvider,
                });
                await props.onCreate({
                  apiKey,
                  ...(resolvedBaseUrl ? { baseUrl: resolvedBaseUrl } : {}),
                  ...(isDefault ? { isDefault: true } : {}),
                  name: ModelProviderCredentialCatalog.resolveCredentialName({
                    name,
                    provider: selectedProvider,
                  }),
                  modelProvider: selectedProvider.submittedProviderId,
                });
              } catch (error) {
                setLocalErrorMessage(
                  error instanceof Error ? error.message : "Failed to parse provider credentials.",
                );
              }
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
