import { KeyRoundIcon, SparklesIcon, WalletIcon } from "lucide-react";
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
 * state. The primary path is billing, while credential owners can immediately switch to their own
 * provider or add one.
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
                <ModelProviderIcon
                  key={provider.id}
                  className="size-9 rounded-md border border-border/60 bg-background"
                  imageClassName="size-5"
                  label={provider.label}
                  providerId={provider.id}
                />
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-stretch">
          {props.hasAlternateProvider ? (
            <Button
              className="w-full"
              onClick={props.onChooseAlternateProvider}
              type="button"
              variant="outline"
            >
              Choose another provider
            </Button>
          ) : null}
          <Button
            className="w-full"
            onClick={props.onAddProvider}
            type="button"
            variant={props.hasAlternateProvider ? "secondary" : "outline"}
          >
            <KeyRoundIcon data-icon="inline-start" />
            Add LLM Provider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
