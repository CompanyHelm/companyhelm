import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
  OnboardingPageLoadingState,
  OnboardingPageSuspense,
  onboardingPath,
} from "./flow";

export function ModelProviderPage() {
  return (
    <OnboardingPageSuspense>
      <ModelProviderPageContent />
    </OnboardingPageSuspense>
  );
}

function ModelProviderPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();

  useEffect(() => {
    void navigate({
      params: {
        organizationSlug,
      },
      replace: true,
      to: OrganizationPath.route(onboardingPath("create-agents")),
    });
  }, [navigate, organizationSlug]);

  return <OnboardingPageLoadingState message="Opening Operator onboarding chat..." />;
}
