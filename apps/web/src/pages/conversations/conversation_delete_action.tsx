import { Loader2Icon, Trash2Icon } from "lucide-react";
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

type ConversationDeleteActionProperties = {
  buttonClassName: string;
  buttonTitle: string;
  conversationLabel: string;
  isDeleting: boolean;
  onDelete: () => Promise<void> | void;
};

export function ConversationDeleteAction(properties: ConversationDeleteActionProperties) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          aria-label={properties.buttonTitle}
          className={properties.buttonClassName}
          disabled={properties.isDeleting}
          title={properties.buttonTitle}
          type="button"
        >
          {properties.isDeleting
            ? <Loader2Icon className="size-4 animate-spin" />
            : <Trash2Icon className="size-4" />}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete conversation</AlertDialogTitle>
          <AlertDialogDescription>
            Delete the canonical transcript for {properties.conversationLabel}? This permanently removes the persisted conversation history for both participants.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancelAction asChild>
            <AlertDialogCancelButton variant="outline">Cancel</AlertDialogCancelButton>
          </AlertDialogCancelAction>
          <AlertDialogPrimaryAction asChild>
            <AlertDialogActionButton
              disabled={properties.isDeleting}
              onClick={() => {
                void properties.onDelete();
              }}
              variant="destructive"
            >
              {properties.isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogActionButton>
          </AlertDialogPrimaryAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
