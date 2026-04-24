import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
  OnboardingNavigation,
  OnboardingPageSuspense,
  OnboardingStepFrame,
  onboardingPath,
  navigateToOnboardingStep,
  useOnboardingFlowController,
} from "./flow";

export function GithubPage() {
  return (
    <OnboardingPageSuspense>
      <GithubPageContent />
    </OnboardingPageSuspense>
  );
}

function GithubPageContent() {
  const navigate = useNavigate();
  const controller = useOnboardingFlowController();
  const organizationSlug = useCurrentOrganizationSlug();

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
  }, [
    controller.onboarding.status,
    controller.setupResolved,
    navigate,
    organizationSlug,
  ]);

  return (
    <OnboardingStepFrame
      currentStep="github"
      description="Connect GitHub now if you want the CEO to inspect repositories and propose agent ownership from the actual codebase."
      errorMessage={controller.errorMessage}
      helperText={controller.hasGithubInstallation
        ? "A GitHub installation is already connected for this company."
        : "If you skip this now, the CEO will still ask whether it should pull repos later, but with less immediate context."}
      title="GitHub access"
    >
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          The first CEO workflow should ask about checking out repos and reviewing them before proposing
          additional agents. Connecting GitHub here lets that happen immediately after onboarding.
        </p>
        {controller.hasGithubInstallation ? (
          <p className="text-foreground">GitHub is connected and ready for repo discovery.</p>
        ) : null}
      </div>
      <OnboardingNavigation>
        {controller.hasGithubInstallation ? (
          <Button
            disabled={controller.isUpdateCompanyOnboardingInFlight}
            onClick={() => {
              controller.clearErrorMessage();
              void controller.updateOnboarding({
                githubSetupStatus: "completed",
              }).then(() => {
                navigateToOnboardingStep({
                  navigate,
                  organizationSlug,
                  step: "model-provider",
                });
              }).catch(() => undefined);
            }}
            size="sm"
            type="button"
          >
            Continue with GitHub
          </Button>
        ) : (
          <Button
            disabled={controller.isCreateGithubInstallationUrlInFlight}
            onClick={() => {
              controller.openGithubInstall(
                OrganizationPath.href(organizationSlug, onboardingPath("github")),
              );
            }}
            size="sm"
            type="button"
          >
            {controller.isCreateGithubInstallationUrlInFlight ? "Preparing..." : "Connect GitHub"}
          </Button>
        )}
        <Button
          disabled={controller.isUpdateCompanyOnboardingInFlight}
          onClick={() => {
            controller.clearErrorMessage();
            void controller.updateOnboarding({
              githubSetupStatus: "skipped",
            }).then(() => {
              navigateToOnboardingStep({
                navigate,
                organizationSlug,
                step: "model-provider",
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
