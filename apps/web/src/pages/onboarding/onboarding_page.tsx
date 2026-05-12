import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";

/**
 * OSS does not expose the hosted CompanyHelm onboarding flow. Preserve the legacy route by
 * redirecting directly back into the organization workspace.
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();

  useEffect(() => {
    void navigate({
      params: {
        organizationSlug,
      },
      replace: true,
      to: OrganizationPath.route("/"),
    });
  }, [navigate, organizationSlug]);

  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Opening workspace…</div>;
}
