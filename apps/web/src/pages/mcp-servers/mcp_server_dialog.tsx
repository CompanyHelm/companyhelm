import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { fetchQuery, graphql, useRelayEnvironment } from "react-relay";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_MCP_SERVER_CALL_TIMEOUT_MS,
  formatMcpServerCallTimeout,
  hasIncompleteMcpServerHeaders,
  parseMcpServerHeadersText,
  serializeMcpServerHeaders,
  type McpServerHeaderDraft,
} from "./mcp_server_headers";
import type { mcpServerDialogAuthTypeQuery } from "./__generated__/mcpServerDialogAuthTypeQuery.graphql";

export type EditableMcpServerRecord = {
  authType: "none" | "authorization_header" | "oauth_client_credentials" | "oauth_authorization_code";
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
  isClientCredentialsConnecting: boolean;
  isOauthDisconnecting: boolean;
  isOauthStarting: boolean;
  isOpen: boolean;
  isSaving: boolean;
  onConnectClientCredentials(input: {
    mcpServerId: string;
    oauthClientId?: string;
    oauthClientSecret?: string;
    requestedScopes: string[];
  }): Promise<void>;
  onDelete(serverId: string): Promise<void>;
  onDisconnectOauth(serverId: string): Promise<void>;
  onOpenChange(open: boolean): void;
  onSave(input:
    | {
        authType: EditableMcpServerRecord["authType"];
        callTimeoutMs: number;
        description?: string;
        enabled: boolean;
        headersText?: string;
        name: string;
        url: string;
      }
    | {
        authType: EditableMcpServerRecord["authType"];
        callTimeoutMs: number;
        description?: string;
        enabled: boolean;
        headersText?: string;
        id: string;
        name: string;
        url: string;
      }
  ): Promise<void>;
  onSaveAndStartOauth(input: {
    authType: "oauth_authorization_code";
    callTimeoutMs: number;
    description?: string;
    enabled: boolean;
    headersText?: string;
    name: string;
    oauthClientId?: string;
    oauthClientSecret?: string;
    requestedScopes: string[];
    url: string;
  }): Promise<void>;
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

type McpServerOauthDetectedAuthType = "oauth_client_credentials" | "oauth_authorization_code";
type McpServerAuthDetection = {
  detailMessage: string | null;
  detectedAuthType: McpServerOauthDetectedAuthType | null;
  requiresManualClient: boolean;
  wasAutoDetected: boolean;
};

const mcpServerDialogAuthTypeQueryNode = graphql`
  query mcpServerDialogAuthTypeQuery($url: String!) {
    McpServerAuthType(url: $url) {
      detectedAuthType
      detailMessage
      requiresManualClient
      wasAutoDetected
    }
  }
`;

function parseRequestedScopesText(value: string): string[] {
  return [...new Set(value
    .split(/\s+/u)
    .map((scope) => scope.trim())
    .filter(Boolean))];
}

function normalizeDetectedAuthType(value: string | null | undefined): McpServerOauthDetectedAuthType | null {
  if (value === "oauth_client_credentials" || value === "oauth_authorization_code") {
    return value;
  }

  return null;
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
  const environment = useRelayEnvironment();
  const [authType, setAuthType] = useState<EditableMcpServerRecord["authType"]>("none");
  const [authorizationHeaderValue, setAuthorizationHeaderValue] = useState("");
  const [authDetection, setAuthDetection] = useState<McpServerAuthDetection | null>(null);
  const [callTimeoutMs, setCallTimeoutMs] = useState(String(DEFAULT_MCP_SERVER_CALL_TIMEOUT_MS));
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [headerDrafts, setHeaderDrafts] = useState<HeaderDraftRow[]>([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isAuthDetectionLoading, setAuthDetectionLoading] = useState(false);
  const [isAuthTypeOverrideEnabled, setAuthTypeOverrideEnabled] = useState(false);
  const [name, setName] = useState("");
  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const [requestedScopesText, setRequestedScopesText] = useState("");
  const [url, setUrl] = useState("");
  const initialUrlRef = useRef("");
  const detectionRequestIdRef = useRef(0);
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
      initialUrlRef.current = "";
      setAuthType("none");
      setAuthorizationHeaderValue("");
      setAuthDetection(null);
      setAuthDetectionLoading(false);
      setAuthTypeOverrideEnabled(false);
      setCallTimeoutMs(String(DEFAULT_MCP_SERVER_CALL_TIMEOUT_MS));
      setDescription("");
      setEnabled(true);
      setHeaderDrafts([createHeaderDraft()]);
      setIsAdvancedOpen(false);
      setName("");
      setOauthClientId("");
      setOauthClientSecret("");
      setRequestedScopesText("");
      setUrl("");
      return;
    }

    const parsedHeaders = parseMcpServerHeadersText(props.server.headersText);
    const authorizationHeader = parsedHeaders.find((header) => header.name.toLowerCase() === "authorization");

    initialUrlRef.current = props.server.url;
    setAuthType(props.server.authType);
    setAuthorizationHeaderValue(authorizationHeader?.value ?? "");
    setAuthDetection(null);
    setAuthDetectionLoading(false);
    setAuthTypeOverrideEnabled(false);
    setCallTimeoutMs(String(props.server.callTimeoutMs));
    setDescription(props.server.description ?? "");
    setEnabled(props.server.enabled);
    setHeaderDrafts(
      parsedHeaders
        .filter((header) => header.name.toLowerCase() !== "authorization")
        .map((header) => createHeaderDraft(header))
        .concat(parsedHeaders.some((header) => header.name.toLowerCase() !== "authorization") ? [] : [createHeaderDraft()]),
    );
    setIsAdvancedOpen(false);
    setName(props.server.name);
    setOauthClientId(props.server.oauthClientId ?? "");
    setOauthClientSecret("");
    setRequestedScopesText(props.server.oauthRequestedScopes.join(" "));
    setUrl(props.server.url);
  }, [props.isOpen, props.server]);

  const isUrlChangedSinceLoad = url.trim() !== initialUrlRef.current.trim();

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    const trimmedUrl = url.trim();
    if (trimmedUrl.length === 0) {
      setAuthDetection(null);
      setAuthDetectionLoading(false);
      if (!isAuthTypeOverrideEnabled && (!isEditing || isUrlChangedSinceLoad)) {
        setAuthType("none");
      }
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      setAuthDetection(null);
      setAuthDetectionLoading(false);
      return;
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      setAuthDetection(null);
      setAuthDetectionLoading(false);
      return;
    }

    if (isEditing && !isUrlChangedSinceLoad) {
      setAuthDetection(null);
      setAuthDetectionLoading(false);
      return;
    }

    const timeoutHandle = window.setTimeout(() => {
      const requestId = ++detectionRequestIdRef.current;
      setAuthDetectionLoading(true);
      fetchQuery<mcpServerDialogAuthTypeQuery>(
        environment,
        mcpServerDialogAuthTypeQueryNode,
        {
          url: parsedUrl.toString(),
        },
      )
        .toPromise()
        .then((response) => {
          if (requestId !== detectionRequestIdRef.current) {
            return;
          }

          const detectionResponse = response?.McpServerAuthType;
          const nextDetection: McpServerAuthDetection = {
            detailMessage: detectionResponse?.detailMessage ?? null,
            detectedAuthType: normalizeDetectedAuthType(detectionResponse?.detectedAuthType),
            requiresManualClient: Boolean(detectionResponse?.requiresManualClient),
            wasAutoDetected: Boolean(detectionResponse?.wasAutoDetected),
          };
          setAuthDetection(nextDetection);
          if (!isAuthTypeOverrideEnabled) {
            setAuthType(nextDetection.detectedAuthType ?? "none");
          }
        })
        .catch((error: unknown) => {
          if (requestId !== detectionRequestIdRef.current) {
            return;
          }

          setAuthDetection({
            detailMessage: error instanceof Error ? error.message : "Could not auto-detect auth type.",
            detectedAuthType: null,
            requiresManualClient: false,
            wasAutoDetected: false,
          });
          if (!isAuthTypeOverrideEnabled) {
            setAuthType("none");
          }
        })
        .finally(() => {
          if (requestId === detectionRequestIdRef.current) {
            setAuthDetectionLoading(false);
          }
        });
    }, 500);

    return () => {
      window.clearTimeout(timeoutHandle);
    };
  }, [environment, isAuthTypeOverrideEnabled, isEditing, isUrlChangedSinceLoad, props.isOpen, url]);

  useEffect(() => {
    if (!isAuthTypeOverrideEnabled && authDetection?.wasAutoDetected && authDetection.detectedAuthType) {
      setAuthType(authDetection.detectedAuthType);
    }
  }, [authDetection, isAuthTypeOverrideEnabled]);

  const title = isEditing ? "Edit MCP server" : "Create MCP server";
  const descriptionText = isEditing
    ? "Update the shared remote HTTP MCP server definition and its auth type."
    : "Add a shared remote HTTP MCP server definition that agents can attach as a default.";
  const normalizedCallTimeoutMs = Number(callTimeoutMs);
  const requestedScopes = parseRequestedScopesText(requestedScopesText);
  const headersText = serializeMcpServerHeaders([
    ...(authType === "authorization_header" && authorizationHeaderValue.trim()
      ? [{
          name: "Authorization",
          value: authorizationHeaderValue.trim(),
        }]
      : []),
    ...headerDrafts,
  ]);
  const hasIncompleteHeaders = hasIncompleteMcpServerHeaders(headerDrafts);
  const advancedSummary = Number.isFinite(normalizedCallTimeoutMs) && normalizedCallTimeoutMs > 0
    ? `Timeout ${formatMcpServerCallTimeout(normalizedCallTimeoutMs)}`
    : "Timeout required";
  const requiresAuthorizationHeader = authType === "authorization_header" && authorizationHeaderValue.trim().length === 0;
  const isSaveDisabled = name.trim().length === 0
    || url.trim().length === 0
    || hasIncompleteHeaders
    || requiresAuthorizationHeader
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
  const canManageAuthorizationCodeConnection = isEditing
    && props.server?.authType === "oauth_authorization_code"
    && authType === "oauth_authorization_code";
  const canManageClientCredentialsConnection = isEditing
    && props.server?.authType === "oauth_client_credentials"
    && authType === "oauth_client_credentials";
  const hasAutoDetectedAuthType = Boolean(authDetection?.wasAutoDetected && authDetection.detectedAuthType);
  const isAuthTypeLocked = hasAutoDetectedAuthType && !isAuthTypeOverrideEnabled;
  const shouldShowAuthorizationCodeManualClientFields = authType === "oauth_authorization_code"
    && authDetection?.requiresManualClient === true;
  const shouldShowEditOauthFooterActions = isEditing
    && (authType === "oauth_authorization_code" || authType === "oauth_client_credentials");
  const isEditOauthFooterActionDisabled = props.isSaving
    || !props.server
    || (authType === "oauth_authorization_code" && props.server.authType !== "oauth_authorization_code")
    || (authType === "oauth_client_credentials" && props.server.authType !== "oauth_client_credentials");
  const shouldSaveAndStartOauth = !isEditing && authType === "oauth_authorization_code";
  const isPrimaryActionPending = props.isSaving || (shouldSaveAndStartOauth && props.isOauthStarting);
  const headerLabel = authType === "none" ? "Headers (optional)" : "Additional headers (optional)";
  const headerDescription = authType === "oauth_authorization_code" || authType === "oauth_client_credentials"
    ? "These headers are sent alongside the OAuth bearer token on every MCP request."
    : authType === "authorization_header"
      ? "These headers are sent alongside the configured Authorization header on every MCP request."
      : "Add request headers that should be sent with MCP calls. Empty rows are ignored.";
  const authTypeOptions: Array<{
    description: string;
    label: string;
    value: EditableMcpServerRecord["authType"];
  }> = [
    {
      description: "Use no built-in authentication for the MCP endpoint.",
      label: "None",
      value: "none",
    },
    {
      description: "Send a manually configured Authorization header with each MCP request.",
      label: "Authorization header",
      value: "authorization_header",
    },
    {
      description: "Use OAuth 2.0 client credentials to fetch bearer tokens from the auth server.",
      label: "OAuth client credentials",
      value: "oauth_client_credentials",
    },
    {
      description: "Use OAuth 2.1 authorization code with PKCE and browser sign-in.",
      label: "OAuth authorization code",
      value: "oauth_authorization_code",
    },
  ];

  return (
    <Dialog disablePointerDismissal onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
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
            <div className="grid gap-1">
              <p className="text-[11px] text-muted-foreground">
                Remote MCP servers are currently HTTP-only and should expose a streamable HTTP endpoint.
              </p>
              {isAuthDetectionLoading ? (
                <p className="text-[11px] text-muted-foreground">Detecting auth type…</p>
              ) : null}
              {authDetection?.detailMessage ? (
                <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                  {authDetection.wasAutoDetected ? (
                    <Badge variant="positive">Auto-detected</Badge>
                  ) : (
                    <Badge variant="outline">Detection</Badge>
                  )}
                  <span>{authDetection.detailMessage}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            <span className="text-xs font-medium text-foreground">Auth type</span>
            <div className="grid gap-2">
              <Select
                items={authTypeOptions.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setAuthType(value as EditableMcpServerRecord["authType"]);
                }}
                value={authType}
              >
                <SelectTrigger disabled={isAuthTypeLocked} id="mcp-server-auth-type">
                  <SelectValue placeholder="Select an auth type" />
                </SelectTrigger>
                <SelectContent>
                  {authTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {authTypeOptions.find((option) => option.value === authType)?.description}
              </p>
              {hasAutoDetectedAuthType ? (
                <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
                  <input
                    checked={isAuthTypeOverrideEnabled}
                    className="mt-0.5 size-4 rounded border border-input bg-background"
                    onChange={(event) => {
                      setAuthTypeOverrideEnabled(event.target.checked);
                    }}
                    type="checkbox"
                  />
                  <div className="grid gap-1">
                    <span className="text-xs font-medium text-foreground">Override auto-detected auth type</span>
                    <span className="text-xs text-muted-foreground">
                      Keep the detected OAuth type unless you explicitly want to force a different configuration.
                    </span>
                  </div>
                </label>
              ) : null}
            </div>
          </div>

          {authType === "authorization_header" ? (
            <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="grid gap-1">
                <span className="text-sm font-medium text-foreground">Authorization header</span>
                <span className="text-xs text-muted-foreground">
                  Set the full Authorization header value that should be sent with each MCP request.
                </span>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-medium text-foreground" htmlFor="mcp-server-authorization-header">
                  Authorization value
                </label>
                <Input
                  id="mcp-server-authorization-header"
                  onChange={(event) => {
                    setAuthorizationHeaderValue(event.target.value);
                  }}
                  placeholder="Bearer example-token"
                  value={authorizationHeaderValue}
                />
                {requiresAuthorizationHeader ? (
                  <p className="text-[11px] text-destructive">
                    Authorization header auth requires a header value.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {authType === "oauth_authorization_code" ? (
            <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="grid gap-1">
                  <span className="text-sm font-medium text-foreground">OAuth authorization code</span>
                  <span className="text-xs text-muted-foreground">
                    Uses browser sign-in with PKCE and stores company-scoped OAuth credentials for lazy refresh.
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

              {shouldShowAuthorizationCodeManualClientFields ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground" htmlFor="mcp-server-oauth-client-id">
                      Manual override client ID
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
                      Manual override client secret
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
              ) : null}

              {props.server?.oauthGrantedScopes.length ? (
                <p className="text-[11px] text-muted-foreground">
                  Granted scopes: {props.server.oauthGrantedScopes.join(" ")}
                </p>
              ) : null}

              {canManageAuthorizationCodeConnection ? (
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
                      : "Save the MCP server with OAuth authorization code enabled before starting the browser flow."
                    : "Use Save & connect OAuth to create the server and start the browser flow."}
                </p>
              )}
            </div>
          ) : null}

          {authType === "oauth_client_credentials" ? (
            <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="grid gap-1">
                  <span className="text-sm font-medium text-foreground">OAuth client credentials</span>
                  <span className="text-xs text-muted-foreground">
                    Uses client ID and client secret to fetch bearer tokens directly from the auth server.
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
                <label className="text-xs font-medium text-foreground" htmlFor="mcp-server-client-credentials-scopes">
                  Requested scopes
                </label>
                <Input
                  id="mcp-server-client-credentials-scopes"
                  onChange={(event) => {
                    setRequestedScopesText(event.target.value);
                  }}
                  placeholder="read:repo mcp:tools"
                  value={requestedScopesText}
                />
                <p className="text-[11px] text-muted-foreground">
                  Space-delimited scopes to request during the client-credentials token exchange.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="mcp-server-client-credentials-id">
                    Client ID
                  </label>
                  <Input
                    id="mcp-server-client-credentials-id"
                    onChange={(event) => {
                      setOauthClientId(event.target.value);
                    }}
                    placeholder="client-id"
                    value={oauthClientId}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="mcp-server-client-credentials-secret">
                    Client secret
                  </label>
                  <Input
                    id="mcp-server-client-credentials-secret"
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

              {canManageClientCredentialsConnection ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={props.isClientCredentialsConnecting || props.isSaving}
                    onClick={async () => {
                      await props.onConnectClientCredentials({
                        mcpServerId: props.server!.id,
                        oauthClientId: oauthClientId.trim() || undefined,
                        oauthClientSecret: oauthClientSecret.trim() || undefined,
                        requestedScopes,
                      });
                    }}
                    size="sm"
                    type="button"
                  >
                    {props.isClientCredentialsConnecting
                      ? "Connecting…"
                      : props.server?.oauthConnectionStatus === "connected"
                        ? "Reconnect client credentials"
                        : "Connect client credentials"}
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
                      ? "Save your MCP server changes before connecting or disconnecting client credentials."
                      : "Save the MCP server with OAuth client credentials enabled before connecting."
                    : "Create the MCP server first, then reopen it here to connect client credentials."}
                </p>
              )}
            </div>
          ) : null}

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
                    placeholder={index === 0 ? "X-Workspace" : "Header name"}
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
                    placeholder={index === 0 ? "acme" : "Header value"}
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
            {shouldShowEditOauthFooterActions ? (
              <>
                {authType === "oauth_authorization_code" ? (
                  <>
                    <Button
                      disabled={isEditOauthFooterActionDisabled || props.isOauthStarting}
                      onClick={async () => {
                        await props.onStartOauth({
                          mcpServerId: props.server!.id,
                          oauthClientId: oauthClientId.trim() || undefined,
                          oauthClientSecret: oauthClientSecret.trim() || undefined,
                          requestedScopes,
                        });
                      }}
                      type="button"
                      variant="outline"
                    >
                      {props.isOauthStarting
                        ? "Redirecting…"
                        : props.server?.oauthConnectionStatus === "connected"
                          ? "Reconnect OAuth"
                          : "Connect OAuth"}
                    </Button>
                    <Button
                      disabled={isEditOauthFooterActionDisabled || props.isOauthDisconnecting}
                      onClick={async () => {
                        await props.onDisconnectOauth(props.server!.id);
                      }}
                      type="button"
                      variant="outline"
                    >
                      {props.isOauthDisconnecting ? "Disconnecting…" : "Disconnect OAuth"}
                    </Button>
                  </>
                ) : null}
                {authType === "oauth_client_credentials" ? (
                  <>
                    <Button
                      disabled={isEditOauthFooterActionDisabled || props.isClientCredentialsConnecting}
                      onClick={async () => {
                        await props.onConnectClientCredentials({
                          mcpServerId: props.server!.id,
                          oauthClientId: oauthClientId.trim() || undefined,
                          oauthClientSecret: oauthClientSecret.trim() || undefined,
                          requestedScopes,
                        });
                      }}
                      type="button"
                      variant="outline"
                    >
                      {props.isClientCredentialsConnecting
                        ? "Connecting…"
                        : props.server?.oauthConnectionStatus === "connected"
                          ? "Reconnect client credentials"
                          : "Connect client credentials"}
                    </Button>
                    <Button
                      disabled={isEditOauthFooterActionDisabled || props.isOauthDisconnecting}
                      onClick={async () => {
                        await props.onDisconnectOauth(props.server!.id);
                      }}
                      type="button"
                      variant="outline"
                    >
                      {props.isOauthDisconnecting ? "Disconnecting…" : "Disconnect OAuth"}
                    </Button>
                  </>
                ) : null}
              </>
            ) : null}
            <Button onClick={() => props.onOpenChange(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button
              data-primary-cta=""
              disabled={isSaveDisabled || isPrimaryActionPending}
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
                if (shouldSaveAndStartOauth) {
                  await props.onSaveAndStartOauth({
                    ...payload,
                    authType: "oauth_authorization_code",
                    oauthClientId: oauthClientId.trim() || undefined,
                    oauthClientSecret: oauthClientSecret.trim() || undefined,
                    requestedScopes,
                  });
                  return;
                }

                await props.onSave(isEditing && props.server
                  ? {
                      ...payload,
                      id: props.server.id,
                    }
                  : payload);
              }}
              type="button"
            >
              {props.isSaving
                ? "Saving…"
                : shouldSaveAndStartOauth && props.isOauthStarting
                  ? "Redirecting…"
                  : isEditing
                    ? "Save changes"
                    : shouldSaveAndStartOauth
                      ? "Save & connect OAuth"
                      : "Create MCP server"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
