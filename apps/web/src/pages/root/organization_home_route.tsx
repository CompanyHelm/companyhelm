import { useEffect } from "react";
import { OrganizationList, useOrganization, useOrganizationList } from "@/components/auth/auth_provider";
import { useNavigate } from "@tanstack/react-router";
import { config } from "@/config";
import { OrganizationPath } from "@/lib/organization_path";

/**
 * Redirects signed-in users onto their current organization URL and falls back to Clerk's
 * organization picker when the session has no active organization yet.
 */
export function OrganizationHomeRoute() {
  const navigate = useNavigate();
  const organizationState = useOrganization();
  const organizationListState = useOrganizationList({
    userMemberships: {
      keepPreviousData: true,
      pageSize: 100,
    },
  });

  useEffect(() => {
    if (!organizationState.isLoaded || !organizationListState.isLoaded) {
      return;
    }

    if (organizationState.organization?.slug) {
      void navigate({
        params: {
          organizationSlug: organizationState.organization.slug,
        },
        replace: true,
        to: OrganizationPath.route("/"),
      });
      return;
    }

    const firstMembership = organizationListState.userMemberships.data?.[0] ?? null;
    if (firstMembership && organizationListState.setActive) {
      void organizationListState.setActive({
        organization: firstMembership.organization.id,
      });
    }
  }, [
    navigate,
    organizationListState,
    organizationListState.isLoaded,
    organizationListState.setActive,
    organizationListState.userMemberships.data,
    organizationState.isLoaded,
    organizationState.organization?.slug,
  ]);

  if (!organizationState.isLoaded || !organizationListState.isLoaded) {
    return null;
  }

  if (organizationState.organization?.slug) {
    return null;
  }

  const hasMemberships = organizationListState.userMemberships.data.length > 0;

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Choose a company</h1>
          <p className="text-sm text-muted-foreground">
            CompanyHelm uses the organization slug in the URL so each browser tab can stay pinned
            to its own company context.
          </p>
        </div>
        {config.authProvider === "dev" && !hasMemberships ? (
          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            <p>This dev user does not belong to a company yet.</p>
            <button
              className="inline-flex rounded-md border border-border/70 bg-background px-3 py-2 font-medium text-foreground transition hover:bg-muted"
              onClick={() => {
                void navigate({ replace: true, to: "/create-company" });
              }}
              type="button"
            >
              Create company
            </button>
          </div>
        ) : (
          <OrganizationList
            afterCreateOrganizationUrl="/orgs/:slug"
            afterSelectOrganizationUrl="/orgs/:slug"
            hidePersonal
          />
        )}
      </div>
    </div>
  );
}
