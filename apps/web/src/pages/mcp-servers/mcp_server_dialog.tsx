import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  DEFAULT_MCP_SERVER_CALL_TIMEOUT_MS,
  formatMcpServerCallTimeout,
  hasIncompleteMcpServerHeaders,
  parseMcpServerHeadersText,
  serializeMcpServerHeaders,
  type McpServerHeaderDraft,
} from "./mcp_server_headers";

export type EditableMcpServerRecord = {
  authType: "none" | "custom_headers" | "oauth";
  callTimeoutMs: number;
  description: string | null;
  enabled: boolean;
  headersText: string;
  id: string;
  name: string;
  oauthClientId: string | null;
  oauthConnectionStatus: "connected" | "degraded" | "not_connected" | null;
  oauthGrantedScopes: string[];
  oauthLastError: string | null;
  oauthRequestedScopes: string[];
  url: string;
};

interface McpServerDialogProps {
  deletingServerId: string | null;
  errorMessage: string | null;
  isOauthDisconnecting: boolean;
  isOauthStarting: boolean;
  isOpen: boolean;
  isSaving: boolean;
  onDelete(serverId: string): Promise<void>;
  onDisconnectOauth(serverId: string): Promise<void>;
  onOpenChange(open: boolean): void;
  onSave(input:
    | {
        authType: "none" | "custom_headers" | "oauth";
        callTimeoutMs: number;
        description?: string;
        enabled: boolean;
        headersText?: string;
        name: string;
        url: string;
      }
    | {
        authType: "none" | "custom_headers" | "oauth";
        callTimeoutMs: number;
        description?: string;
        enabled: boolean;
        headersText?: string;
        id: string;
        name: string;
        url: string;
      }
  ): Promise<void>;
  onStartOauth(input: {
    mcpServerId: string;
    oauthClientId?: string;
    oauthClientSecret?: string;
    requestedScopes: string[];
  }): Promise<void>;
  server: EditableMcpServerRecord | null;
}

type HeaderDraftRow = McpServerHeaderDraft & {
  id: string;
};

function parseRequestedScopesText(value: string): string[] {
  return [...new Set(value
    .split(/\s+/u)
    .map((scope) => scope.trim())
    .filter(Boolean))];
}

function getOauthStatusBadgeVariant(status: EditableMcpServerRecord["oauthConnectionStatus"] | undefined) {
  if (status === "connected") {
    return "positive";
  }
  if (status === "degraded") {
    return "warning";
  }

  return "outline";
}

export function McpServerDialog(props: McpServerDialogProps) {
  const [authType, setAuthType] = useState<EditableMcpServerRecord["authType"]>("none");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [headerDrafts, setHeaderDrafts] = useState<HeaderDraftRow[]>([]);
  const [callTimeoutMs, setCallTimeoutMs] = useState(String(DEFAULT_MCP_SERVER_CALL_TIMEOUT_MS));
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [requestedScopesText, setRequestedScopesText] = useState("");
  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const nextHeaderDraftIdRef = useRef(0);
  const isEditing = props.server !== null;

  useEffect(() => {
    nextHeaderDraftIdRef.current = 0;
    const createHeaderDraft = (draft?: Partial<McpServerHeaderDraft>): HeaderDraftRow => ({
      id: `mcp-server-header-${nextHeaderDraftIdRef.current++}`,
      name: draft?.name ?? "",
      value: draft?.value ?? "",
    });

    if (!props.isOpen || !props.server) {
      setAuthType("none");
      setName("");
      setDescription("");
      setUrl("");
      setHeaderDrafts([createHeaderDraft()]);
      setCallTimeoutMs(String(DEFAULT_MCP_SERVER_CALL_TIMEOUT_MS));
      setIsAdvancedOpen(false);
      setEnabled(true);
      setRequestedScopesText("");
      setOauthClientId("");
      setOauthClientSecret("");
      return;
    }

    setAuthType(props.server.authType);
    setName(props.server.name);
    setDescription(props.server.description ?? "");
    setUrl(props.server.url);
    const parsedHeaders = parseMcpServerHeadersText(props.server.headersText);
    setHeaderDrafts(
      parsedHeaders.length > 0
        ? parsedHeaders.map((header) => createHeaderDraft(header))
        : [createHeaderDraft()],
    );
    setCallTimeoutMs(String(props.server.callTimeoutMs));
    setIsAdvancedOpen(false);
    setEnabled(props.server.enabled);
    setRequestedScopesText(props.server.oauthRequestedScopes.join(" "));
    setOauthClientId(props.server.oauthClientId ?? "");
    setOauthClientSecret("");
  }, [props.isOpen, props.server]);

  const title = isEditing ? "Edit MCP server" : "Create MCP server";
  const descriptionText = isEditing
    ? "Update the shared remote HTTP MCP server definition and its auth mode."
    : "Add a shared remote HTTP MCP server definition that agents can attach as a default.";
  const normalizedCallTimeoutMs = Number(callTimeoutMs);
  const hasIncompleteHeaders = hasIncompleteMcpServerHeaders(headerDrafts);
  const headersText = serializeMcpServerHeaders(headerDrafts);
  const advancedSummary = Number.isFinite(normalizedCallTimeoutMs) && normalizedCallTimeoutMs > 0
    ? `Timeout ${formatMcpServerCallTimeout(normalizedCallTimeoutMs)}`
    : "Timeout required";
  const isSaveDisabled = name.trim().length === 0
    || url.trim().length === 0
    || hasIncompleteHeaders
    || !Number.isFinite(normalizedCallTimeoutMs)
    || normalizedCallTimeoutMs < 1;
  const hasUnsavedServerChanges = Boolean(
    isEditing
      && props.server
      && (
        props.server.authType !== authType
        || props.server.name !== name.trim()
        || (props.server.description ?? "") !== description.trim()
        || props.server.url !== url.trim()
        || props.server.headersText !== headersText
        || props.server.callTimeoutMs !== Math.floor(normalizedCallTimeoutMs || 0)
        || props.server.enabled !== enabled
      ),
  );
  const canManageOauthConnection = isEditing
    && props.server?.authType === "oauth"
    && authType === "oauth"
    && !hasUnsavedServerChanges;
  const requestedScopes = parseRequestedScopesText(requestedScopesText);
  const headerLabel = authType === "oauth" ? "Additional headers (optional)" : "Headers (optional)";
  const headerDescription = authType === "oauth"
    ? "These headers are sent alongside the OAuth bearer token on every MCP request."
    : "Add request headers that should be sent with MCP calls. Empty rows are ignored.";

  return (
    <Dialog disablePointerDismissal onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <span className="text-xs font-medium text-foreground">Auth mode</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                {
                  description: "Use no built-in auth and rely only on the server URL plus optional headers.",
                  label: "No auth",
                  value: "none",
                },
                {
                  description: "Use static request headers managed with the MCP server definition.",
                  label: "Custom headers",
                  value: "custom_headers",
                },
                {
                  description: "Use OAuth 2.1 authorization code with PKCE and lazy token refresh.",
                  label: "OAuth",
                  value: "oauth",
                },
              ].map((option) => {
                const isSelected = authType === option.value;
                return (
                  <button
                    className={[
                      "rounded-xl border px-3 py-3 text-left transition",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/60 bg-muted/10 hover:bg-muted/30",
                    ].join(" ")}
                    key={option.value}
                    onClick={() => {
                      setAuthType(option.value as EditableMcpServerRecord["authType"]);
                    }}
                    type="button"
                  >
                    <div className="grid gap-1">
                      <span className="text-sm font-medium text-foreground">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {authType === "oauth" ? (
            <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="grid gap-1">
                  <span className="text-sm font-medium text-foreground">OAuth connection</span>
                  <span className="text-xs text-muted-foreground">
                    OAuth credentials are stored per company and refreshed only when MCP authorization is needed.
                  </span>
                </div>
                <Badge variant={getOauthStatusBadgeVariant(props.server?.oauthConnectionStatus)}>
                  {props.server?.oauthConnectionStatus ?? "not_connected"}
                </Badge>
              </div>

              {props.server?.oauthLastError ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  {props.server.oauthLastError}
                </div>
              ) : null}

              <div className="grid gap-2">
                <label className="text-xs font-medium text-foreground" htmlFor="mcp-server-oauth-scopes">
                  Requested scopes
                </label>
                <Input
                  id="mcp-server-oauth-scopes"
                  onChange={(event) => {
                    setRequestedScopesText(event.target.value);
                  }}
                  placeholder="read:repo mcp:tools"
                  value={requestedScopesText}
                />
                <p className="text-[11px] text-muted-foreground">
                  Space-delimited scopes. Leave blank if the server does not require explicit scopes.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="mcp-server-oauth-client-id">
                    Manual client ID (optional)
                  </label>
                  <Input
                    id="mcp-server-oauth-client-id"
                    onChange={(event) => {
                      setOauthClientId(event.target.value);
                    }}
                    placeholder="client-id"
                    value={oauthClientId}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="mcp-server-oauth-client-secret">
                    Manual client secret (optional)
                  </label>
                  <Input
                    id="mcp-server-oauth-client-secret"
                    onChange={(event) => {
                      setOauthClientSecret(event.target.value);
                    }}
                    placeholder="client-secret"
                    type="password"
                    value={oauthClientSecret}
                  />
                </div>
              </div>

              {props.server?.oauthGrantedScopes.length ? (
                <p className="text-[11px] text-muted-foreground">
                  Granted scopes: {props.server.oauthGrantedScopes.join(" ")}
                </p>
              ) : null}

              {canManageOauthConnection ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={props.isOauthStarting || props.isSaving}
                    onClick={async () => {
                      await props.onStartOauth({
                        mcpServerId: props.server!.id,
                        oauthClientId: oauthClientId.trim() || undefined,
                        oauthClientSecret: oauthClientSecret.trim() || undefined,
                        requestedScopes,
                      });
                    }}
                    size="sm"
                    type="button"
                  >
                    {props.isOauthStarting
                      ? "Redirecting…"
                      : props.server?.oauthConnectionStatus === "connected"
                        ? "Reconnect OAuth"
                        : "Connect OAuth"}
                  </Button>
                  <Button
                    disabled={props.isOauthDisconnecting || props.isSaving}
                    onClick={async () => {
                      await props.onDisconnectOauth(props.server!.id);
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {props.isOauthDisconnecting ? "Disconnecting…" : "Disconnect OAuth"}
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {isEditing
                    ? hasUnsavedServerChanges
                      ? "Save your MCP server changes before starting or disconnecting OAuth."
                      : "Save the MCP server with OAuth enabled before starting the authorization flow."
                    : "Create the MCP server first, then reconnect here to start OAuth."}
                </p>
              )}
            </div>
          ) : null}

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="mcp-server-name">
              Name
            </label>
            <Input
              id="mcp-server-name"
              onChange={(event) => {
                setName(event.target.value);
              }}
              placeholder="GitHub MCP"
              value={name}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="mcp-server-url">
              URL
            </label>
            <Input
              id="mcp-server-url"
              onChange={(event) => {
                setUrl(event.target.value);
              }}
              placeholder="https://mcp.example.com"
              value={url}
            />
            <p className="text-[11px] text-muted-foreground">
              Remote MCP servers are currently HTTP-only and should expose a streamable HTTP endpoint.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="mcp-server-description">
              Description (optional)
            </label>
            <Input
              id="mcp-server-description"
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              placeholder="Shared MCP connector for the company GitHub org"
              value={description}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-foreground" htmlFor="mcp-server-header-name-0">
                {headerLabel}
              </label>
              <Button
                onClick={() => {
                  setHeaderDrafts((currentValue) => [
                    ...currentValue,
                    {
                      id: `mcp-server-header-${nextHeaderDraftIdRef.current++}`,
                      name: "",
                      value: "",
                    },
                  ]);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <PlusIcon className="size-3" />
                Add header
              </Button>
            </div>
            <div className="grid gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
              {headerDrafts.map((headerDraft, index) => (
                <div className="grid gap-2 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]" key={headerDraft.id}>
                  <Input
                    aria-label={`Header ${index + 1} name`}
                    id={index === 0 ? "mcp-server-header-name-0" : undefined}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setHeaderDrafts((currentValue) => currentValue.map((currentHeaderDraft) => {
                        if (currentHeaderDraft.id !== headerDraft.id) {
                          return currentHeaderDraft;
                        }

                        return {
                          ...currentHeaderDraft,
                          name: nextValue,
                        };
                      }));
                    }}
                    placeholder={index === 0 ? "Authorization" : "Header name"}
                    value={headerDraft.name}
                  />
                  <Input
                    aria-label={`Header ${index + 1} value`}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setHeaderDrafts((currentValue) => currentValue.map((currentHeaderDraft) => {
                        if (currentHeaderDraft.id !== headerDraft.id) {
                          return currentHeaderDraft;
                        }

                        return {
                          ...currentHeaderDraft,
                          value: nextValue,
                        };
                      }));
                    }}
                    placeholder={index === 0 ? "Bearer example-token" : "Header value"}
                    value={headerDraft.value}
                  />
                  <Button
                    aria-label={`Remove header ${index + 1}`}
                    onClick={() => {
                      setHeaderDrafts((currentValue) => {
                        const nextValue = currentValue.filter((currentHeaderDraft) => currentHeaderDraft.id !== headerDraft.id);
                        if (nextValue.length > 0) {
                          return nextValue;
                        }

                        return [{
                          id: `mcp-server-header-${nextHeaderDraftIdRef.current++}`,
                          name: "",
                          value: "",
                        }];
                      });
                    }}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2Icon className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {headerDescription}
            </p>
            {hasIncompleteHeaders ? (
              <p className="text-[11px] text-destructive">Each header needs both a name and a value.</p>
            ) : null}
          </div>

          <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-3">
            <button
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => {
                setIsAdvancedOpen((currentValue) => !currentValue);
              }}
              type="button"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Advanced</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Adjust optional network behavior for this remote MCP server.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">{advancedSummary}</span>
                {isAdvancedOpen ? (
                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {isAdvancedOpen ? (
              <div className="grid gap-2 border-t border-border/60 pt-3">
                <label className="text-xs font-medium text-foreground" htmlFor="mcp-server-call-timeout">
                  Call timeout (ms)
                </label>
                <Input
                  id="mcp-server-call-timeout"
                  min="1"
                  onChange={(event) => {
                    setCallTimeoutMs(event.target.value);
                  }}
                  type="number"
                  value={callTimeoutMs}
                />
                <p className="text-[11px] text-muted-foreground">
                  Defaults to {formatMcpServerCallTimeout(DEFAULT_MCP_SERVER_CALL_TIMEOUT_MS)}.
                </p>
              </div>
            ) : null}
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
            <input
              checked={enabled}
              className="mt-0.5 size-4 rounded border border-input bg-background"
              onChange={(event) => {
                setEnabled(event.target.checked);
              }}
              type="checkbox"
            />
            <div className="grid gap-1">
              <span className="text-xs font-medium text-foreground">Enabled</span>
              <span className="text-xs text-muted-foreground">
                Disabled MCP servers stay in the catalog but cannot be selected for new agent defaults.
              </span>
            </div>
          </label>

          {props.errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {props.errorMessage}
            </div>
          ) : null}
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          {isEditing && props.server ? (
            <Button
              disabled={props.deletingServerId === props.server.id || props.isSaving}
              onClick={async () => {
                await props.onDelete(props.server!.id);
              }}
              type="button"
              variant="destructive"
            >
              Delete MCP server
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button onClick={() => props.onOpenChange(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={isSaveDisabled || props.isSaving}
              onClick={async () => {
                const payload = {
                  authType,
                  callTimeoutMs: Math.floor(normalizedCallTimeoutMs),
                  description: description.trim() ? description : undefined,
                  enabled,
                  headersText,
                  name: name.trim(),
                  url: url.trim(),
                };
                await props.onSave(isEditing && props.server
                  ? {
                      ...payload,
                      id: props.server.id,
                    }
                  : payload);
              }}
              type="button"
            >
              {props.isSaving ? "Saving…" : isEditing ? "Save changes" : "Create MCP server"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
