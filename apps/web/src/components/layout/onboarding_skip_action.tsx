import { FastForwardIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelAction,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPrimaryAction,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type OnboardingSkipActionProps = {
  isSkipInFlight: boolean;
  onSkip(): void;
};

export function OnboardingSkipAction(props: OnboardingSkipActionProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className="font-sans text-xs font-medium leading-none"
          disabled={props.isSkipInFlight}
          variant="ghost"
        >
          {props.isSkipInFlight ? (
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
          ) : (
            <FastForwardIcon data-icon="inline-start" />
          )}
          Skip onboarding
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Skip onboarding?</AlertDialogTitle>
          <AlertDialogDescription>
            This will unlock the full workspace now. The CEO onboarding chat and workflow history
            will remain available if setup needs to be resumed later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancelAction>
            <AlertDialogCancelButton variant="outline">Keep setup</AlertDialogCancelButton>
          </AlertDialogCancelAction>
          <AlertDialogPrimaryAction>
            <AlertDialogActionButton
              disabled={props.isSkipInFlight}
              onClick={props.onSkip}
              variant="destructive"
            >
              <FastForwardIcon data-icon="inline-start" />
              Skip onboarding
            </AlertDialogActionButton>
          </AlertDialogPrimaryAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
