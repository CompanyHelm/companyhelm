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
      description="CompanyHelm uses GitHub to access code and store plans and custom skills."
      errorMessage={controller.errorMessage}
      helperText=""
      title="GitHub access"
    >
      {controller.hasGithubInstallation ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
          <p className="font-medium">Github is connected</p>
          <ul className="mt-2 grid gap-1">
            {controller.githubInstallations.map((installation) => (
              <li className="flex items-center gap-2" key={installation.id}>
                <GithubIcon className="size-4" />
                <span>{installation.accountLogin ?? `Installation ${installation.installationId}`}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-900 dark:text-amber-200">
          Without GitHub, CompanyHelm cannot operate effectively.
        </p>
      )}
      <OnboardingStepActions
        cta={(
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
            {controller.isCreateGithubInstallationUrlInFlight ? "Preparing..." : "Connect Github"}
          </Button>
        )}
        hideBack
        rightControls={(
          <>
            {controller.hasGithubInstallation ? null : (
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
            <Button
              disabled={!controller.hasGithubInstallation || controller.isUpdateCompanyOnboardingInFlight}
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
              variant="outline"
            >
              Continue
            </Button>
          </>
        )}
      />
    </OnboardingStepFrame>
  );
}
