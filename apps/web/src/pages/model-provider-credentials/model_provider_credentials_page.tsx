import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/react";
import { KeyRoundIcon, PlusIcon } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraphqlClient } from "@/lib/graphql_client";
import { CreateCredentialDialog } from "./create_credential_dialog";
import { CredentialsTable } from "./credentials_table";
import {
  ModelProviderCredentialsClient,
  type ModelProviderCredentialRecord,
} from "./model_provider_credentials_client";

export function ModelProviderCredentialsPage() {
  const auth = useAuth();
  const client = useMemo(() => {
    return new ModelProviderCredentialsClient(new GraphqlClient());
  }, []);
  const [credentials, setCredentials] = useState<ModelProviderCredentialRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadCredentials = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const token = await auth.getToken();
        if (!token) {
          throw new Error("Authentication required.");
        }

        const nextCredentials = await client.loadCredentials(token);
        if (isActive) {
          setCredentials(nextCredentials);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load credentials.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    if (auth.isLoaded && auth.isSignedIn) {
      void loadCredentials();
    }

    return () => {
      isActive = false;
    };
  }, [auth, client]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRoundIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle>Model provider credentials</CardTitle>
              <CardDescription>
                Store company-level provider keys for agent model access.
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Button
              onClick={() => {
                setCreateDialogOpen(true);
              }}
              size="sm"
            >
              <PlusIcon />
              Create credentials
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage && !isCreateDialogOpen ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <CredentialsTable credentials={credentials} isLoading={isLoading} />
        </CardContent>
      </Card>

      <CreateCredentialDialog
        errorMessage={isCreateDialogOpen ? errorMessage : null}
        isOpen={isCreateDialogOpen}
        isSaving={isSaving}
        onCreate={async (input) => {
          try {
            setSaving(true);
            setErrorMessage(null);
            const token = await auth.getToken();
            if (!token) {
              throw new Error("Authentication required.");
            }

            const credential = await client.createCredential(token, input);
            setCredentials((currentCredentials) => [credential, ...currentCredentials]);
            setCreateDialogOpen(false);
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Failed to create credential.");
          } finally {
            setSaving(false);
          }
        }}
        onOpenChange={setCreateDialogOpen}
      />
    </main>
  );
}
