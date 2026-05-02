import { useEffect, useRef, useState } from "react";
import { Loader2Icon, Maximize2Icon, PencilIcon } from "lucide-react";
import { MarkdownContent } from "@/components/markdown_content";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type EditableFieldOption = {
  label: string;
  value: string;
};

type EditableFieldFullscreenPreview = {
  buttonLabel: string;
  description: string;
  title: string;
};

type EditableFieldTextProps = {
  displayValue?: string | null;
  editMode?: "fullscreen" | "inline";
  emptyValueLabel: string;
  fieldType: "number" | "text" | "textarea";
  label: string;
  max?: number;
  min?: number;
  onSave: (value: string) => Promise<void>;
  readOnlyFormat?: "markdown" | "plain";
  readOnlyFullscreen?: EditableFieldFullscreenPreview;
  readOnlyPreviewClassName?: string;
  readOnly?: boolean;
  value: string | null;
};

type EditableFieldSelectProps = {
  displayValue?: string | null;
  emptyValueLabel: string;
  fieldType: "select";
  label: string;
  onSave: (value: string) => Promise<void>;
  options: EditableFieldOption[];
  readOnly?: boolean;
  value: string | null;
};

type EditableFieldProps = EditableFieldTextProps | EditableFieldSelectProps;

type EditableFieldVariant = "card" | "plain";

interface EditableFieldLayoutProps {
  labelSize?: "default" | "large";
  variant?: EditableFieldVariant;
}

/**
 * Renders one inline-edit card that toggles between a read-only value and an editor while keeping
 * save, cancel, and feedback behavior consistent across settings and agent configuration pages.
 */
export function EditableField(props: EditableFieldProps & EditableFieldLayoutProps) {
  const [draftValue, setDraftValue] = useState(props.value ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setEditing] = useState(false);
  const [isFullscreenOpen, setFullscreenOpen] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [isPreviewOverflowing, setPreviewOverflowing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | HTMLParagraphElement | null>(null);
  const renderedValue = props.displayValue ?? props.value;
  const hasRenderedValue = renderedValue !== null && renderedValue !== undefined && renderedValue.length > 0;
  const shouldRenderMarkdown = props.fieldType !== "select" && props.readOnlyFormat === "markdown";
  const readOnlyFullscreen = props.fieldType !== "select" ? props.readOnlyFullscreen : undefined;
  const readOnlyPreviewClassName = props.fieldType !== "select" ? props.readOnlyPreviewClassName : undefined;
  const editMode = props.fieldType !== "select" ? (props.editMode ?? "inline") : "inline";
  const isFullscreenEditMode = editMode === "fullscreen" && readOnlyFullscreen !== undefined;
  const isInlineEditing = isEditing && !isFullscreenEditMode;
  const shouldShowFullscreen = !isEditing && hasRenderedValue && readOnlyFullscreen !== undefined;
  const variant = props.variant ?? "card";
  const labelSize = props.labelSize ?? "default";
  const containerClassName = variant === "plain"
    ? "grid gap-3"
    : "rounded-xl border border-border/60 bg-card/50 p-4";
  const labelClassName = labelSize === "large"
    ? "text-lg font-semibold tracking-tight text-foreground"
    : variant === "plain"
      ? "text-sm font-medium text-muted-foreground"
      : "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground";
  const valueSpacingClassName = variant === "plain" ? "mt-0" : "mt-3";

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

  useEffect(() => {
    if (!shouldShowFullscreen || !readOnlyPreviewClassName) {
      setPreviewOverflowing(false);
      return;
    }

    const previewElement = previewRef.current;
    if (!previewElement) {
      setPreviewOverflowing(false);
      return;
    }

    const measuredPreviewElement = previewElement;

    function measurePreviewOverflow() {
      setPreviewOverflowing(
        measuredPreviewElement.scrollHeight > measuredPreviewElement.clientHeight + 1
          || measuredPreviewElement.scrollWidth > measuredPreviewElement.clientWidth + 1,
      );
    }

    measurePreviewOverflow();
    window.addEventListener("resize", measurePreviewOverflow);

    return () => {
      window.removeEventListener("resize", measurePreviewOverflow);
    };
  }, [readOnlyPreviewClassName, renderedValue, shouldShowFullscreen]);

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

  const startEditing = () => {
    setDraftValue(props.value ?? "");
    setErrorMessage(null);
    setEditing(true);

    if (props.fieldType === "select") {
      setOpen(true);
      return;
    }

    if (isFullscreenEditMode) {
      setFullscreenOpen(true);
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
        <div className="flex shrink-0 items-center gap-1">
          {shouldShowFullscreen ? (
            <Button
              aria-label={readOnlyFullscreen.buttonLabel}
              onClick={() => {
                setFullscreenOpen(true);
              }}
              size="icon"
              title="Full screen"
              variant="ghost"
            >
              <Maximize2Icon className="size-3.5" />
            </Button>
          ) : null}
          {props.readOnly ? null : (
            <Button
              disabled={isSaving || (props.fieldType === "select" && props.options.length === 0)}
              onClick={startEditing}
              size="icon"
              variant="ghost"
            >
              {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : <PencilIcon className="size-4" />}
            </Button>
          )}
        </div>
      </div>

      <div className={valueSpacingClassName}>
        {(props.fieldType === "text" || props.fieldType === "number") && isInlineEditing ? (
          <Input
            max={props.fieldType === "number" ? props.max : undefined}
            min={props.fieldType === "number" ? (props.min ?? 1) : undefined}
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

        {props.fieldType === "textarea" && isInlineEditing ? (
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

        {!isInlineEditing ? (
          hasRenderedValue ? (
            <div className="relative">
              {shouldRenderMarkdown ? (
                <div
                  className={cn("min-w-0 text-sm text-foreground", readOnlyPreviewClassName)}
                  ref={previewRef}
                >
                  <MarkdownContent content={renderedValue} />
                </div>
              ) : (
                <p
                  className={cn("whitespace-pre-wrap text-sm text-foreground", readOnlyPreviewClassName)}
                  ref={previewRef}
                >
                  {renderedValue}
                </p>
              )}
              {shouldShowFullscreen && isPreviewOverflowing ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-background via-background/95 to-transparent" />
              ) : null}
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {props.emptyValueLabel}
            </p>
          )
        ) : null}
      </div>

      {readOnlyFullscreen ? (
        <Dialog
          onOpenChange={(nextOpen) => {
            setFullscreenOpen(nextOpen);
            if (!nextOpen && isFullscreenEditMode && !isSaving) {
              setDraftValue(props.value ?? "");
              setErrorMessage(null);
              setEditing(false);
            }
          }}
          open={isFullscreenOpen}
        >
          <DialogContent className="flex h-[90vh] w-[90vw] max-w-none flex-col overflow-hidden p-0">
            <DialogHeader className="border-b border-border/60 px-6 pt-6 pb-4">
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="min-w-0">
                  <DialogTitle>{readOnlyFullscreen.title}</DialogTitle>
                  <DialogDescription>{readOnlyFullscreen.description}</DialogDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {props.readOnly ? null : isEditing && isFullscreenEditMode ? (
                    <>
                      <Button
                        disabled={isSaving}
                        onClick={() => {
                          setDraftValue(props.value ?? "");
                          setErrorMessage(null);
                          setEditing(false);
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={isSaving}
                        onClick={() => {
                          void commitValue(draftValue);
                        }}
                        size="sm"
                      >
                        {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button
                      disabled={isSaving}
                      onClick={() => {
                        if (isFullscreenEditMode) {
                          startEditing();
                          return;
                        }

                        setFullscreenOpen(false);
                        startEditing();
                      }}
                      size="sm"
                      variant="outline"
                    >
                      {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : <PencilIcon className="size-4" />}
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>
            <div className="modern-scrollbar flex-1 overflow-y-auto px-6 py-5">
              {isEditing && isFullscreenEditMode && props.fieldType === "textarea" ? (
                <textarea
                  className="min-h-full w-full resize-none rounded-md border border-input bg-input/20 px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  onChange={(event) => {
                    setDraftValue(event.target.value);
                  }}
                  value={draftValue}
                />
              ) : isEditing && isFullscreenEditMode && (props.fieldType === "text" || props.fieldType === "number") ? (
                <Input
                  max={props.fieldType === "number" ? props.max : undefined}
                  min={props.fieldType === "number" ? (props.min ?? 1) : undefined}
                  onChange={(event) => {
                    setDraftValue(event.target.value);
                  }}
                  step={props.fieldType === "number" ? 1 : undefined}
                  type={props.fieldType === "number" ? "number" : "text"}
                  value={draftValue}
                />
              ) : shouldRenderMarkdown ? (
                <MarkdownContent content={renderedValue ?? ""} />
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground [overflow-wrap:anywhere]">
                  {renderedValue ?? ""}
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {errorMessage ? (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
