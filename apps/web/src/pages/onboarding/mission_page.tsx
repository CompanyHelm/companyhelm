import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { OrganizationPath } from "@/lib/organization_path";
import { Button } from "@/components/ui/button";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
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
    if (!controller.githubResolved) {
      navigateToOnboardingStep({
        navigate,
        organizationSlug,
        replace: true,
        step: "github",
      });
      return;
    }
    if (!controller.llmResolved) {
      navigateToOnboardingStep({
        navigate,
        organizationSlug,
        replace: true,
        step: "model-provider",
      });
    }

  }, [
    controller.githubResolved,
    controller.llmResolved,
    controller.onboarding.status,
    controller.setupResolved,
    navigate,
    organizationSlug,
  ]);

  return (
    <OnboardingStepFrame
      currentStep="mission"
      description="Tell CompanyHelm what you want it to achieve for the business before the CEO chat starts."
      errorMessage={controller.errorMessage}
      helperText="These goals are passed directly into the CEO onboarding workflow as its starting context."
      title="Business goals"
    >
      <textarea
        className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        onChange={(event) => {
          controller.setMissionDraft(event.target.value);
          controller.clearErrorMessage();
        }}
        placeholder="Describe the business outcome you want, the immediate goals, constraints, and what CompanyHelm should help achieve first."
        value={controller.missionDraft}
      />
      <div className="mt-8 flex flex-col items-center gap-4">
        <Button
          className="h-12 px-6 text-base"
          disabled={controller.isUpdateCompanyOnboardingInFlight || !controller.missionDraft.trim()}
          onClick={() => {
            controller.clearErrorMessage();
            void controller.updateOnboarding({
              companyMission: controller.missionDraft.trim(),
            }).then(() => {
              void navigate({
                params: {
                  organizationSlug,
                },
                to: OrganizationPath.route("/onboarding"),
              });
            }).catch(() => undefined);
          }}
          type="button"
        >
          Continue onboarding
        </Button>
        <div className="relative flex h-9 w-full items-center justify-center">
          <Button
            className="absolute left-0"
            onClick={() => {
              navigateToOnboardingStep({
                navigate,
                organizationSlug,
                step: "model-provider",
              });
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Back
          </Button>
          <Button
            disabled={controller.isUpdateCompanyOnboardingInFlight}
            onClick={() => {
              controller.clearErrorMessage();
              void controller.updateOnboarding({
                skipMission: true,
              }).then(() => {
                void navigate({
                  params: {
                    organizationSlug,
                  },
                  to: OrganizationPath.route("/onboarding"),
                });
              }).catch(() => undefined);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Skip
          </Button>
        </div>
      </div>
    </OnboardingStepFrame>
  );
}
