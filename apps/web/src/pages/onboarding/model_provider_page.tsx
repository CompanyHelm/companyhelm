import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { KeyRoundIcon } from "lucide-react";
import { ModelProviderIcon } from "@/components/model_provider_icon";
import { Button } from "@/components/ui/button";
import { OrganizationPath } from "@/lib/organization_path";
import { cn } from "@/lib/utils";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { formatProviderLabel } from "@/pages/model-provider-credentials/provider_label";
import {
  OnboardingModelProviderDialog,
  OnboardingPageSuspense,
  OnboardingStepActions,
  OnboardingStepFrame,
  navigateToOnboardingStep,
  useOnboardingFlowController,
} from "./flow";

const supportedLlmProviders = [
  {
    label: "OpenAI",
    providerId: "openai",
  },
  {
    label: "Anthropic",
    providerId: "anthropic",
  },
  {
    label: "Gemini",
    providerId: "google-gemini-cli",
  },
  {
    label: "OpenRouter",
    providerId: "openrouter",
  },
  {
    label: "NVIDIA",
    providerId: "nvidia",
  },
  {
    label: "Any OpenAI Compatible Provider",
    providerId: "openai-compatible",
  },
] as const;

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
  }, [
    controller.githubResolved,
    controller.onboarding.status,
    controller.setupResolved,
    navigate,
    organizationSlug,
  ]);

  return (
    <>
      <OnboardingStepFrame
        currentStep="model-provider"
        description="Add your own LLM provider for broader model support. If you skip, CompanyHelm will use its managed provider."
        errorMessage={controller.errorMessage}
        helperText=""
        title="Model provider setup"
      >
        <div className="mt-6 space-y-6">
          {controller.hasThirdPartyCredential ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
              <p className="font-medium">LLM provider credentials are connected</p>
              <ul className="mt-2 grid gap-1">
                {controller.modelProviderCredentials.map((credential) => (
                  <li className="flex items-center gap-2" key={credential.id}>
                    <ModelProviderIcon
                      className="size-4 rounded-sm bg-transparent"
                      imageClassName="size-3"
                      label={credential.name}
                      providerId={credential.modelProvider}
                    />
                    <span>
                      {credential.name} · {formatProviderLabel(credential.modelProvider, {
                        baseUrl: credential.baseUrl,
                        isManaged: credential.isManaged,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-900 dark:text-amber-200">
              CompanyHelm-managed access currently has low token limits and higher prices.
              Using your own provider is strongly recommended.
            </p>
          )}
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Supported providers
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-6">
              {supportedLlmProviders.map((provider) => (
                <div
                  className={cn(
                    "flex flex-col items-center gap-2 text-center",
                    provider.providerId === "openai-compatible" ? "w-40" : "w-20",
                  )}
                  key={provider.providerId}
                >
                  <ModelProviderIcon
                    className="size-12 rounded-xl"
                    imageClassName="size-7"
                    label={provider.label}
                    providerId={provider.providerId}
                  />
                  <span className="text-sm font-medium text-foreground">{provider.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <OnboardingStepActions
          backControl={(
            <Button
              onClick={() => {
                navigateToOnboardingStep({
                  navigate,
                  organizationSlug,
                  step: "github",
                });
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Back
            </Button>
          )}
          cta={(
            <Button
              className="h-12 px-6 text-base"
              disabled={controller.isAddModelProviderCredentialInFlight}
              onClick={() => {
                controller.setCredentialDialogOpen(true);
              }}
              type="button"
            >
              <KeyRoundIcon className="mr-2 size-5" />
              Add LLM provider
            </Button>
          )}
          rightControls={(
            <>
              {controller.hasThirdPartyCredential ? null : (
                <Button
                  disabled={controller.isUpdateCompanyOnboardingInFlight}
                  onClick={() => {
                    controller.clearErrorMessage();
                    void controller.updateOnboarding({
                      llmSetupStatus: "company_managed",
                    }).then(() => {
                      navigateToOnboardingStep({
                        navigate,
                        organizationSlug,
                        step: "mission",
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
                disabled={!controller.hasThirdPartyCredential || controller.isUpdateCompanyOnboardingInFlight}
                onClick={() => {
                  controller.clearErrorMessage();
                  void controller.updateOnboarding({
                    llmSetupStatus: "third_party",
                  }).then(() => {
                    navigateToOnboardingStep({
                      navigate,
                      organizationSlug,
                      step: "mission",
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
      <OnboardingModelProviderDialog
        controller={controller}
        onCompleted={() => undefined}
      />
    </>
  );
}
