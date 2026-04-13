import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { graphql, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";
import { resolveMcpOauthCallbackSearchFromWindow } from "./mcp_oauth_callback_search";
import type { mcpOauthCallbackPageCompleteMutation } from "./__generated__/mcpOauthCallbackPageCompleteMutation.graphql";

const mcpOauthCallbackPageCompleteMutationNode = graphql`
  mutation mcpOauthCallbackPageCompleteMutation($input: CompleteMcpServerOAuthInput!) {
    CompleteMcpServerOAuth(input: $input) {
      organizationSlug
      mcpServer {
        id
      }
    }
  }
`;

export function McpOauthCallbackPage() {
  const callbackHandledRef = useRef<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [commitCompleteOauth] =
    useMutation<mcpOauthCallbackPageCompleteMutation>(mcpOauthCallbackPageCompleteMutationNode);
  const callbackSearch = resolveMcpOauthCallbackSearchFromWindow();

  useEffect(() => {
    const callbackKey = [callbackSearch.code, callbackSearch.state].join("|");
    if (!callbackKey.replace(/\|/g, "")) {
      setErrorMessage("MCP OAuth callback is missing authorization details.");
      return;
    }
    if (callbackHandledRef.current === callbackKey) {
      return;
    }

    callbackHandledRef.current = callbackKey;

    if (!callbackSearch.code) {
      setErrorMessage("MCP OAuth callback is missing the authorization code.");
      return;
    }
    if (!callbackSearch.state) {
      setErrorMessage("MCP OAuth callback is missing the authorization state.");
      return;
    }

    setErrorMessage(null);

    commitCompleteOauth({
      variables: {
        input: {
          code: callbackSearch.code,
          state: callbackSearch.state,
        },
      },
      onCompleted: (response, errors) => {
        const nextErrorMessage = String(errors?.[0]?.message || "").trim();
        if (nextErrorMessage) {
          setErrorMessage(nextErrorMessage);
          return;
        }

        const organizationSlug = String(
          response.CompleteMcpServerOAuth?.organizationSlug || "",
        ).trim();
        if (typeof window !== "undefined") {
          window.location.replace(
            organizationSlug
              ? OrganizationPath.href(organizationSlug, "/mcp-servers")
              : "/",
          );
        }
      },
      onError: (error: Error) => {
        setErrorMessage(error.message || "Failed to connect the MCP server.");
      },
    });
  }, [callbackSearch.code, callbackSearch.state, commitCompleteOauth]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Connecting MCP server</CardTitle>
          <CardDescription>
            Finalizing the OAuth connection for this company&apos;s MCP server.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage ? (
            <>
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMessage}
              </div>
              <div>
                <Button render={<Link to="/" />} size="sm" variant="outline">
                  Back to app
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              <span>Completing OAuth and returning to MCP servers…</span>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
