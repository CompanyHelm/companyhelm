import { KeyRoundIcon, SlidersHorizontalIcon, SparklesIcon, WalletIcon } from "lucide-react";
import { ModelProviderIcon } from "@/components/model_provider_icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export type CompanyHelmWalletDepletedProviderLogo = {
  id: string;
  label: string;
};

interface CompanyHelmWalletDepletedDialogProps {
  currentPlanName: string;
  hasAlternateProvider: boolean;
  isOpen: boolean;
  providers: ReadonlyArray<CompanyHelmWalletDepletedProviderLogo>;
  onAddProvider(): void;
  onChooseAlternateProvider(): void;
  onOpenChange(nextOpen: boolean): void;
  onUpgrade(): void;
}

/**
 * Guides users away from a depleted managed-model wallet without leaving them in a generic error
 * state. The primary path is billing, while the secondary action changes depending on whether the
 * company already has another provider ready to use.
 */
export function CompanyHelmWalletDepletedDialog(props: CompanyHelmWalletDepletedDialogProps) {
  return (
    <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
      <DialogContent className="w-[min(94vw,34rem)] gap-5">
        <DialogHeader>
          <div className="mb-2 flex size-9 items-center justify-center rounded-md border border-border/70 bg-muted/40 text-primary">
            <SparklesIcon />
          </div>
          <DialogTitle>CompanyHelm AI credits are depleted</DialogTitle>
          <DialogDescription>
            Your workspace is currently on the {props.currentPlanName} plan. Upgrade to refresh managed
            CompanyHelm AI credits, or connect a provider key you already pay for.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
          <p className="text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Current plan
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{props.currentPlanName}</p>
        </div>

        <Button className="w-full" onClick={props.onUpgrade} size="lg" type="button">
          <WalletIcon data-icon="inline-start" />
          Upgrade
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            or
          </span>
          <Separator className="flex-1" />
        </div>

        {props.hasAlternateProvider ? (
          <div className="flex flex-col gap-3">
            <Button
              className="w-full"
              onClick={props.onChooseAlternateProvider}
              type="button"
              variant="outline"
            >
              <SlidersHorizontalIcon data-icon="inline-start" />
              Choose another provider
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Already have a subscription or API key?</p>
                <p className="mt-1 text-xs/relaxed text-muted-foreground">
                  Bring your own provider credentials and keep chatting with your existing model account.
                </p>
              </div>

              {props.providers.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {props.providers.map((provider) => (
                    <div key={provider.id} className="flex w-16 flex-col items-center gap-1">
                      <ModelProviderIcon
                        className="size-9 rounded-md border border-border/60 bg-background"
                        imageClassName="size-5"
                        label={provider.label}
                        providerId={provider.id}
                      />
                      <span className="max-w-full truncate text-center text-[0.625rem] leading-4 text-muted-foreground">
                        {provider.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <DialogFooter className="sm:justify-stretch">
              <Button
                className="w-full"
                onClick={props.onAddProvider}
                type="button"
                variant="outline"
              >
                <KeyRoundIcon data-icon="inline-start" />
                Add LLM Provider
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
