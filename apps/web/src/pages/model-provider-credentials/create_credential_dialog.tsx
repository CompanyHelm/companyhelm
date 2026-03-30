import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
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

interface CreateCredentialDialogProps {
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  providers: Array<{
    authorizationInstructionsMarkdown: string | null;
    id: string;
    name: string;
    type: "api_key" | "oauth";
  }>;
  onCreate(input: {
    accessToken?: string;
    accessTokenExpiresAtMilliseconds?: string;
    apiKey?: string;
    name?: string;
    modelProvider: string;
    refreshToken?: string;
  }): Promise<void>;
  onOpenChange(open: boolean): void;
}

export function CreateCredentialDialog(props: CreateCredentialDialogProps) {
  const [authFileContents, setAuthFileContents] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [modelProvider, setModelProvider] = useState(props.providers[0]?.id ?? "");
  const selectedProvider = props.providers.find((provider) => provider.id === modelProvider) ?? null;

  useEffect(() => {
    if (!props.isOpen) {
      setAuthFileContents("");
      setApiKey("");
      setLocalErrorMessage(null);
      setName("");
      setModelProvider(props.providers[0]?.id ?? "");
    }
  }, [props.isOpen, props.providers]);

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
                setAuthFileContents("");
                setApiKey("");
                setLocalErrorMessage(null);
                setModelProvider(value);
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

          {selectedProvider?.authorizationInstructionsMarkdown ? (
            <div className="grid gap-2">
              <p className="text-xs font-medium text-foreground">Instructions</p>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs/relaxed text-muted-foreground">
                <ReactMarkdown
                  components={{
                    a: ({ children, ...anchorProps }) => (
                      <a
                        {...anchorProps}
                        className="font-medium text-foreground underline underline-offset-4"
                        rel="noreferrer"
                        target="_blank"
                      >
                        {children}
                      </a>
                    ),
                    code: ({ children, className, ...codeProps }) => {
                      const inline = !className;
                      if (inline) {
                        return (
                          <code
                            {...codeProps}
                            className="rounded bg-background px-1 py-0.5 font-mono text-[11px] text-foreground"
                          >
                            {children}
                          </code>
                        );
                      }

                      return (
                        <code
                          {...codeProps}
                          className="block overflow-x-auto rounded-md bg-background px-3 py-2 font-mono text-[11px] text-foreground"
                        >
                          {children}
                        </code>
                      );
                    },
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    pre: ({ children }) => <div className="my-2 last:mb-0">{children}</div>,
                  }}
                >
                  {selectedProvider.authorizationInstructionsMarkdown}
                </ReactMarkdown>
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
                placeholder='{\n  "openai-codex": {\n    "type": "oauth",\n    "access": "...",\n    "refresh": "...",\n    "expires": 1775358352922\n  }\n}'
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
                placeholder="sk-..."
                type="password"
                value={apiKey}
              />
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
            disabled={props.isSaving || !selectedProvider || (
              selectedProvider.type === "oauth" ? !authFileContents.trim() : !apiKey.trim()
            )}
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
                    name,
                    modelProvider: selectedProvider.id,
                    refreshToken: oauthCredential.refreshToken,
                  });
                  return;
                }

                await props.onCreate({
                  apiKey,
                  name,
                  modelProvider: selectedProvider.id,
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
