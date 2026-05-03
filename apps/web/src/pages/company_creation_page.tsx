import { Suspense, useState } from "react";
import { graphql, useMutation } from "react-relay";
import { Link, useNavigate } from "@tanstack/react-router";
import { Building2Icon, Loader2Icon, PlusIcon } from "lucide-react";
import { useOrganizationList } from "@/components/auth/auth_provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OrganizationPath } from "@/lib/organization_path";
import type { companyCreationPageCreateMutation } from "./__generated__/companyCreationPageCreateMutation.graphql";

const companyCreationPageCreateMutationNode = graphql`
  mutation companyCreationPageCreateMutation($input: CreateCompanyInput!) {
    CreateCompany(input: $input) {
      id
      name
      slug
      clerkOrganizationId
    }
  }
`;

/**
 * Owns the CompanyHelm company creation flow that Clerk's organization switcher delegates to,
 * keeping the application database in charge of slug allocation and optional Clerk linking.
 */
export function CompanyCreationPage() {
  return (
    <Suspense fallback={<CompanyCreationPageShell />}>
      <CompanyCreationPageContent />
    </Suspense>
  );
}

function CompanyCreationPageContent() {
  const navigate = useNavigate();
  const organizationListState = useOrganizationList();
  const [companyName, setCompanyName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [commitCreateCompany, isCreateCompanyInFlight] = useMutation<companyCreationPageCreateMutation>(
    companyCreationPageCreateMutationNode,
  );
  const trimmedCompanyName = companyName.trim();
  const canSubmit = trimmedCompanyName.length > 0 && !isCreateCompanyInFlight;

  function createCompany() {
    if (!canSubmit) {
      return;
    }

    setErrorMessage(null);
    commitCreateCompany({
      onCompleted: (response) => {
        const company = response.CreateCompany;
        if (!company.clerkOrganizationId) {
          setErrorMessage("Company was created, but no Clerk organization was linked.");
          return;
        }
        if (!organizationListState.setActive) {
          setErrorMessage("Company was created, but the active organization could not be changed.");
          return;
        }

        void organizationListState.setActive({
          organization: company.clerkOrganizationId,
        }).then(() => {
          void navigate({
            params: {
              organizationSlug: company.slug,
            },
            to: OrganizationPath.route("/"),
          });
        }).catch((error) => {
          setErrorMessage(error instanceof Error ? error.message : "Failed to activate the new company.");
        });
      },
      onError: (error) => {
        setErrorMessage(error.message);
      },
      variables: {
        input: {
          name: trimmedCompanyName,
        },
      },
    });
  }

  return (
    <CompanyCreationPageShell
      canSubmit={canSubmit}
      companyName={companyName}
      errorMessage={errorMessage}
      isSubmitting={isCreateCompanyInFlight}
      onCompanyNameChange={setCompanyName}
      onSubmit={createCompany}
    />
  );
}

function CompanyCreationPageShell(props: {
  canSubmit?: boolean;
  companyName?: string;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onCompanyNameChange?: (companyName: string) => void;
  onSubmit?: () => void;
} = {}) {
  const isSubmitting = props.isSubmitting ?? false;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2Icon aria-hidden="true" />
          </div>
          <CardTitle>Create company</CardTitle>
          <CardDescription>
            Add a CompanyHelm workspace for this self-hosted installation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              props.onSubmit?.();
            }}
          >
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="company-name">
                Company name
              </label>
              <Input
                aria-invalid={Boolean(props.errorMessage)}
                autoComplete="organization"
                disabled={isSubmitting}
                id="company-name"
                onChange={(event) => props.onCompanyNameChange?.(event.target.value)}
                placeholder="Acme Operations"
                value={props.companyName ?? ""}
              />
            </div>
            {props.errorMessage ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {props.errorMessage}
              </p>
            ) : null}
          </form>
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <Button render={<Link to="/" />} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={!props.canSubmit} onClick={props.onSubmit} type="button">
            {isSubmitting ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
            Create
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
