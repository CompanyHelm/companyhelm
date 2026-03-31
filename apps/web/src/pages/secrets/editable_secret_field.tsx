import { useEffect, useRef, useState } from "react";
import { EyeIcon, EyeOffIcon, Loader2Icon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditableSecretFieldProps {
  displayValue: string;
  emptyEditCancels?: boolean;
  label: string;
  onSave(value: string): Promise<void>;
  placeholder?: string;
  value?: string;
  valueType?: "password" | "text";
}

/**
 * Renders one inline-editable field for the secret editor modal. It keeps the resting view
 * read-only, then switches to a small editor that autosaves on blur or Enter.
 */
export function EditableSecretField(props: EditableSecretFieldProps) {
  const [draftValue, setDraftValue] = useState(props.value ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isValueVisible, setValueVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(props.value ?? "");
      setValueVisible(false);
    }
  }, [isEditing, props.value]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    inputRef.current?.focus();
    if (props.valueType !== "password") {
      inputRef.current?.select?.();
    }
  }, [isEditing, props.valueType]);

  const commitValue = async (nextValue: string) => {
    if (isSaving) {
      return;
    }

    const normalizedValue = nextValue.trim();
    if (normalizedValue.length === 0 && props.emptyEditCancels !== false) {
      setDraftValue(props.value ?? "");
      setErrorMessage(null);
      setEditing(false);
      return;
    }

    if (props.valueType !== "password" && normalizedValue === (props.value ?? "")) {
      setErrorMessage(null);
      setEditing(false);
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await props.onSave(normalizedValue);
      setEditing(false);
      if (props.valueType === "password") {
        setDraftValue("");
      }
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
          disabled={isSaving}
          onClick={() => {
            setDraftValue(props.valueType === "password" ? "" : (props.value ?? ""));
            setErrorMessage(null);
            setEditing(true);
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : <PencilIcon className="size-4" />}
        </Button>
      </div>

      <div className="mt-3">
        {isEditing ? (
          <div className="relative">
            <Input
              className={props.valueType === "password" ? "pr-10" : undefined}
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
              placeholder={props.placeholder}
              ref={inputRef}
              type={props.valueType === "password" && isValueVisible ? "text" : (props.valueType ?? "text")}
              value={draftValue}
            />
            {props.valueType === "password" ? (
              <Button
                aria-label={isValueVisible ? "Hide secret value" : "Show secret value"}
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={() => {
                  setValueVisible((currentValue) => !currentValue);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                {isValueVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-foreground">{props.displayValue}</p>
        )}
      </div>

      {errorMessage ? (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
