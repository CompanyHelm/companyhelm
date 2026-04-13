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

export interface CreateDocumentDialogEditorState {
  name: string;
}

/**
 * Minimal creation dialog that only asks for the document title before routing
 * the user into the dedicated editor page for the newly created artifact.
 */
export function CreateDocumentDialog(props: {
  errorMessage: string | null;
  isOpen: boolean;
  isSaveDisabled: boolean;
  isSaving: boolean;
  onEditorStateChange: (state: CreateDocumentDialogEditorState) => void;
  onOpenChange: (isOpen: boolean) => void;
  onSave: () => void;
  state: CreateDocumentDialogEditorState;
}) {
  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent className="w-[min(92vw,60rem)]">
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
          <DialogDescription>
            Start a new company document and continue editing it on its own page.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {props.errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {props.errorMessage}
            </div>
          ) : null}

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="create-document-name">
              Name
            </label>
            <Input
              id="create-document-name"
              onChange={(event) => {
                props.onEditorStateChange({
                  name: event.target.value,
                });
              }}
              placeholder="Architecture principles"
              value={props.state.name}
            />
          </div>
        </div>

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
            disabled={props.isSaveDisabled}
            onClick={props.onSave}
            type="button"
          >
            {props.isSaving ? "Creating…" : "Create document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
