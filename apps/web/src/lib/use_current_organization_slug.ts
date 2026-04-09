import { useOrganization } from "@clerk/react";
import { useParams } from "@tanstack/react-router";

/**
 * Resolves the current organization slug from the org-scoped route when present and falls back to
 * Clerk's active organization for pages that intentionally sit outside the org URL prefix.
 */
export function useCurrentOrganizationSlug(): string {
  const routeParams = useParams({ strict: false }) as {
    organizationSlug?: string;
  };
  const organizationState = useOrganization();
  const organizationSlug = routeParams.organizationSlug ?? organizationState.organization?.slug ?? null;
  if (!organizationSlug || organizationSlug.trim().length === 0) {
    throw new Error("CompanyHelm requires an active organization slug.");
  }

  return organizationSlug.trim();
}
