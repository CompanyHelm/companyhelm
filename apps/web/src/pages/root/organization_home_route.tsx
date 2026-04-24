import { useEffect } from "react";
import { OrganizationList, useOrganizationList, useUser } from "@/components/auth/auth_provider";
import { useNavigate } from "@tanstack/react-router";
import { config } from "@/config";
import { OrganizationPath } from "@/lib/organization_path";
import { OrganizationHomeDecision } from "./organization_home_decision";

/**
 * Turns the ambiguous `/` URL into either a deterministic org URL or an explicit company picker.
 */
export function OrganizationHomeRoute() {
  const navigate = useNavigate();
  const organizationListState = useOrganizationList({
    userMemberships: {
      keepPreviousData: true,
      pageSize: 100,
    },
  });
  const user = useUser();
  const memberships = organizationListState.userMemberships.data;
  const homeDecision = organizationListState.isLoaded
    ? OrganizationHomeDecision.resolve({
      authProvider: config.authProvider,
      memberships,
    })
    : null;
  const redirectOrganizationSlug = homeDecision?.kind === "redirect"
    ? homeDecision.organizationSlug
    : null;

  useEffect(() => {
    if (!redirectOrganizationSlug) {
      return;
    }

    void navigate({
      params: {
        organizationSlug: redirectOrganizationSlug,
      },
      replace: true,
      to: OrganizationPath.route("/"),
    });
  }, [navigate, redirectOrganizationSlug]);

  if (!organizationListState.isLoaded) {
    return null;
  }

  if (redirectOrganizationSlug) {
    return null;
  }

  const hasMemberships = memberships.length > 0;
  const isCompaniesFlow = homeDecision?.kind === "companies";

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="mb-5 space-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            {hasMemberships ? "Choose a company" : "Create a company"}
          </h1>
          {hasMemberships ? (
            <p className="text-sm text-muted-foreground">
              CompanyHelm uses the organization slug in the URL so each browser tab can stay pinned
              to its own company context.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              CompanyHelm needs a company slug in the URL before it can open an org-scoped page.
            </p>
          )}
        </div>
        {isCompaniesFlow ? (
          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            <p>This dev user does not belong to a company yet.</p>
            <button
              className="inline-flex rounded-md border border-border/70 bg-background px-3 py-2 font-medium text-foreground transition hover:bg-muted"
              onClick={() => {
                void navigate({
                  replace: true,
                  search: user.user?.id
                    ? {
                      userId: user.user.id,
                    }
                    : {},
                  to: "/companies",
                });
              }}
              type="button"
            >
              Choose company
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
