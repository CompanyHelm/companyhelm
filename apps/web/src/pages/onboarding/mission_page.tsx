import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { OrganizationPath } from "@/lib/organization_path";
import { Button } from "@/components/ui/button";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
  OnboardingNavigation,
  OnboardingPageSuspense,
  OnboardingStepFrame,
  navigateToOnboardingStep,
  useOnboardingFlowController,
} from "./flow";

export function MissionPage() {
  return (
    <OnboardingPageSuspense>
      <MissionPageContent />
    </OnboardingPageSuspense>
  );
}

function MissionPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const controller = useOnboardingFlowController();

  useEffect(() => {
    if (
      controller.onboarding.status === "completed"
      || controller.onboarding.status === "skipped"
      || controller.onboarding.status === "in_progress"
      || controller.setupResolved
    ) {
      void navigate({
        params: {
          organizationSlug,
        },
        replace: true,
        to: OrganizationPath.route("/onboarding"),
      });
      return;
    }

  }, [controller.onboarding.status, controller.setupResolved, navigate, organizationSlug]);

  return (
    <OnboardingStepFrame
      currentStep="mission"
      description="Capture the company mission and near-term goals so the CEO workflow starts with real context."
      errorMessage={controller.errorMessage}
      helperText="This seeds the CEO's first recommendations about agent structure, repo review, and useful skills."
      title="Company mission and goals"
    >
      <textarea
        className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        onChange={(event) => {
          controller.setMissionDraft(event.target.value);
          controller.clearErrorMessage();
        }}
        placeholder="Describe the mission, near-term goals, constraints, and what CompanyHelm should help with first."
        value={controller.missionDraft}
      />
      <OnboardingNavigation>
        <Button
          disabled={controller.isUpdateCompanyOnboardingInFlight || !controller.missionDraft.trim()}
          onClick={() => {
            controller.clearErrorMessage();
            void controller.updateOnboarding({
              companyMission: controller.missionDraft.trim(),
            }).then(() => {
              navigateToOnboardingStep({
                navigate,
                organizationSlug,
                step: "github",
              });
            }).catch(() => undefined);
          }}
          size="sm"
          type="button"
        >
          Save and continue
        </Button>
        <Button
          disabled={controller.isUpdateCompanyOnboardingInFlight}
          onClick={() => {
            controller.clearErrorMessage();
            void controller.updateOnboarding({
              skipMission: true,
            }).then(() => {
              navigateToOnboardingStep({
                navigate,
                organizationSlug,
                step: "github",
              });
            }).catch(() => undefined);
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          Skip for now
        </Button>
      </OnboardingNavigation>
    </OnboardingStepFrame>
  );
}
