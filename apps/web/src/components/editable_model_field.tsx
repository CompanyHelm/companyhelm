import { useEffect, useState } from "react";
import { Loader2Icon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelSelectionDialog, type ModelSelectionOption } from "./model_selection_dialog";

interface EditableModelFieldProps {
  displayValue?: string | null;
  emptyValueLabel: string;
  label: string;
  onSave: (value: string) => Promise<void>;
  options: readonly ModelSelectionOption[];
  value: string | null;
  variant?: "card" | "plain";
}

/**
 * Gives inline agent and chat settings the same searchable model dialog as the chat composer while
 * preserving the existing editable-field save, cancel, and error handling contract.
 */
export function EditableModelField(props: EditableModelFieldProps) {
  const [draftValue, setDraftValue] = useState(props.value ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setEditing] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const renderedValue = props.displayValue ?? props.options.find((option) => option.id === props.value)?.name ?? props.value;
  const variant = props.variant ?? "card";
  const containerClassName = variant === "plain"
    ? "grid gap-3"
    : "rounded-xl border border-border/60 bg-card/50 p-4";
  const labelClassName = variant === "plain"
    ? "text-sm font-medium text-muted-foreground"
    : "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground";
  const valueSpacingClassName = variant === "plain" ? "mt-0" : "mt-3";

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(props.value ?? "");
    }
  }, [isEditing, props.value]);

  const commitValue = async (nextValue: string) => {
    if (isSaving) {
      return;
    }

    if (nextValue === (props.value ?? "")) {
      setErrorMessage(null);
      setEditing(false);
      setOpen(false);
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await props.onSave(nextValue);
      setEditing(false);
      setOpen(false);
    } catch (error) {
      setOpen(false);
      setErrorMessage(error instanceof Error ? error.message : "Failed to update field.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={containerClassName}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={labelClassName}>
            {props.label}
          </p>
        </div>
        <Button
          disabled={isSaving || props.options.length === 0}
          onClick={() => {
            setDraftValue(props.value ?? "");
            setErrorMessage(null);
            setEditing(true);
            setOpen(true);
          }}
          size="icon"
          variant="ghost"
        >
          {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : <PencilIcon className="size-4" />}
        </Button>
      </div>

      <div className={valueSpacingClassName}>
        <p className="whitespace-pre-wrap text-sm text-foreground">
          {renderedValue && renderedValue.length > 0 ? renderedValue : props.emptyValueLabel}
        </p>
      </div>

      <ModelSelectionDialog
        description="Search the available model catalog and use the keyboard to pick the model."
        noItemsMessage="No models are available."
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen && !isSaving) {
            setEditing(false);
          }
        }}
        onSelect={(modelOptionId) => {
          setDraftValue(modelOptionId);
          void commitValue(modelOptionId);
        }}
        open={isOpen}
        options={props.options}
        selectedOptionId={draftValue}
      />

      {errorMessage ? (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
