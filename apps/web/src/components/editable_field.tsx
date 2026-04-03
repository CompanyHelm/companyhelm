import { useEffect, useRef, useState } from "react";
import { Loader2Icon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EditableFieldOption = {
  label: string;
  value: string;
};

type EditableFieldTextProps = {
  displayValue?: string | null;
  emptyValueLabel: string;
  fieldType: "number" | "text" | "textarea";
  label: string;
  onSave: (value: string) => Promise<void>;
  value: string | null;
};

type EditableFieldSelectProps = {
  displayValue?: string | null;
  emptyValueLabel: string;
  fieldType: "select";
  label: string;
  onSave: (value: string) => Promise<void>;
  options: EditableFieldOption[];
  value: string | null;
};

type EditableFieldProps = EditableFieldTextProps | EditableFieldSelectProps;

/**
 * Renders one inline-edit card that toggles between a read-only value and an editor while keeping
 * save, cancel, and feedback behavior consistent across settings and agent configuration pages.
 */
export function EditableField(props: EditableFieldProps) {
  const [draftValue, setDraftValue] = useState(props.value ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setEditing] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const renderedValue = props.displayValue ?? props.value;

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(props.value ?? "");
    }
  }, [isEditing, props.value]);

  useEffect(() => {
    if (!isEditing || props.fieldType === "select") {
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select?.();
  }, [isEditing, props.fieldType]);

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
      setErrorMessage(error instanceof Error ? error.message : "Failed to update field.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {props.label}
          </p>
        </div>
        <Button
          disabled={isSaving || (props.fieldType === "select" && props.options.length === 0)}
          onClick={() => {
            setDraftValue(props.value ?? "");
            setErrorMessage(null);
            setEditing(true);
            if (props.fieldType === "select") {
              setOpen(true);
            }
          }}
          size="icon"
          variant="ghost"
        >
          {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : <PencilIcon className="size-4" />}
        </Button>
      </div>

      <div className="mt-3">
        {(props.fieldType === "text" || props.fieldType === "number") && isEditing ? (
          <Input
            min={props.fieldType === "number" ? 1 : undefined}
            onBlur={async (event) => {
              await commitValue(event.target.value);
            }}
            onChange={(event) => {
              setDraftValue(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDraftValue(props.value ?? "");
                setErrorMessage(null);
                setEditing(false);
                return;
              }

              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            ref={(node) => {
              inputRef.current = node;
            }}
            step={props.fieldType === "number" ? 1 : undefined}
            type={props.fieldType === "number" ? "number" : "text"}
            value={draftValue}
          />
        ) : null}

        {props.fieldType === "textarea" && isEditing ? (
          <textarea
            className="min-h-32 w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            onBlur={async (event) => {
              await commitValue(event.target.value);
            }}
            onChange={(event) => {
              setDraftValue(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDraftValue(props.value ?? "");
                setErrorMessage(null);
                setEditing(false);
                return;
              }

              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            ref={(node) => {
              inputRef.current = node;
            }}
            rows={6}
            value={draftValue}
          />
        ) : null}

        {props.fieldType === "select" && isEditing ? (
          <Select
            items={props.options}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen && !isSaving) {
                setEditing(false);
              }
            }}
            onValueChange={async (value) => {
              const nextValue = value ?? "";
              setDraftValue(nextValue);
              await commitValue(nextValue);
            }}
            open={isOpen}
            value={draftValue}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${props.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {props.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {!isEditing ? (
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {(renderedValue && renderedValue.length > 0) ? renderedValue : props.emptyValueLabel}
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
