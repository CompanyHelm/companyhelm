import { useEffect, useState } from "react";
import { AlertTriangleIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface DeleteCompanyDialogProps {
  companyName: string;
  errorMessage: string | null;
  isDeleting: boolean;
  isOpen: boolean;
  onDelete(confirmationName: string): Promise<void>;
  onOpenChange(open: boolean): void;
}

/**
 * Gates the irreversible company deletion mutation behind exact-name confirmation so accidental
 * clicks cannot create a durable deletion request.
 */
export function DeleteCompanyDialog(props: DeleteCompanyDialogProps) {
  const [confirmationName, setConfirmationName] = useState("");
  const isConfirmed = confirmationName === props.companyName;

  useEffect(() => {
    if (!props.isOpen) {
      setConfirmationName("");
    }
  }, [props.isOpen]);

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent className="w-[min(92vw,34rem)]">
        <DialogHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-md border border-destructive/25 bg-destructive/10 text-destructive">
            <AlertTriangleIcon className="size-4" />
          </div>
          <DialogTitle>Delete company</DialogTitle>
          <DialogDescription>
            This removes the Clerk organization and schedules CompanyHelm data cleanup for {props.companyName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <label className="text-xs font-medium text-foreground" htmlFor="delete-company-confirmation-name">
            Type {props.companyName} to confirm
          </label>
          <Input
            autoComplete="off"
            id="delete-company-confirmation-name"
            onChange={(event) => {
              setConfirmationName(event.target.value);
            }}
            value={confirmationName}
          />
        </div>

        {props.errorMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {props.errorMessage}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            onClick={() => {
              props.onOpenChange(false);
            }}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            data-primary-cta=""
            disabled={!isConfirmed || props.isDeleting}
            onClick={async () => {
              await props.onDelete(confirmationName);
            }}
            type="button"
            variant="destructive"
          >
            {props.isDeleting ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
            Delete company
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
