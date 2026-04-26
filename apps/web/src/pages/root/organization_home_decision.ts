import type { CompanyHelmAuthProviderName, CompanyHelmOrganizationMembership } from "@/auth/companyhelm_auth";

export class OrganizationHomeDecision {
  /**
   * Resolves the neutral `/` entry point into either a concrete org URL or an explicit chooser.
   * This keeps company context owned by the URL instead of reusing Clerk's browser-wide active org.
   */
  static resolve(input: {
    authProvider: CompanyHelmAuthProviderName;
    memberships: CompanyHelmOrganizationMembership[];
    selectedOrganizationId?: string | null;
  }) {
    const selectedMembership = input.selectedOrganizationId
      ? input.memberships.find((membership) => membership.organization.id === input.selectedOrganizationId)
      : null;
    if (selectedMembership) {
      return {
        kind: "redirect" as const,
        organizationSlug: selectedMembership.organization.slug,
      };
    }

    if (input.memberships.length === 1) {
      return {
        kind: "redirect" as const,
        organizationSlug: input.memberships[0].organization.slug,
      };
    }

    if (input.memberships.length === 0 && input.authProvider === "dev") {
      return {
        kind: "companies" as const,
      };
    }

    return {
      kind: "organization-list" as const,
    };
  }
}
