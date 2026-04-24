import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { GithubIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
  OnboardingPageSuspense,
  OnboardingStepActions,
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
      description="CompanyHelm uses GitHub to access code and store plans and custom skills. Without GitHub, CompanyHelm cannot operate effectively."
      errorMessage={controller.errorMessage}
      helperText=""
      title="GitHub access"
    >
      {controller.hasGithubInstallation ? (
        <p className="text-sm leading-6 text-foreground">GitHub is connected and ready for repo discovery.</p>
      ) : null}
      <OnboardingStepActions
        cta={controller.hasGithubInstallation ? (
          <Button
            className="h-12 px-6 text-base"
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
            type="button"
          >
            <GithubIcon className="mr-2 size-5" />
            Continue with GitHub
          </Button>
        ) : (
          <Button
            className="h-12 px-6 text-base"
            disabled={controller.isCreateGithubInstallationUrlInFlight}
            onClick={() => {
              controller.openGithubInstall(
                OrganizationPath.href(organizationSlug, onboardingPath("github")),
              );
            }}
            type="button"
          >
            <GithubIcon className="mr-2 size-5" />
            {controller.isCreateGithubInstallationUrlInFlight ? "Preparing..." : "Connect GitHub"}
          </Button>
        )}
        skipControl={(
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
            variant="ghost"
          >
            Skip
          </Button>
        )}
      />
    </OnboardingStepFrame>
  );
}
