import { useEffect, useRef, type CSSProperties } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SecretValueInputProps {
  autoFocus?: boolean;
  id?: string;
  isVisible: boolean;
  onBlur?: (value: string) => void | Promise<void>;
  onCancel?: () => void;
  onChange(value: string): void;
  onToggleVisibility(): void;
  placeholder?: string;
  value: string;
}

/**
 * Renders the secret value editor as a textarea so multiline secrets preserve their exact
 * formatting while still supporting show and hide affordances. The control auto-grows up to ten
 * visible lines, then falls back to internal scrolling.
 */
export function SecretValueInput(props: SecretValueInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 20;
    const borderHeight = Number.parseFloat(computedStyle.borderTopWidth)
      + Number.parseFloat(computedStyle.borderBottomWidth);
    const paddingHeight = Number.parseFloat(computedStyle.paddingTop)
      + Number.parseFloat(computedStyle.paddingBottom);
    const maxHeight = (lineHeight * 10) + borderHeight + paddingHeight;
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, lineHeight + borderHeight + paddingHeight), maxHeight);

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [props.value]);

  useEffect(() => {
    if (!props.autoFocus) {
      return;
    }

    textareaRef.current?.focus();
  }, [props.autoFocus]);

  return (
    <div className="relative">
      <textarea
        autoComplete="off"
        className={cn(
          "min-h-7 w-full rounded-md border border-input bg-input/20 px-2 py-1.5 pr-10 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 md:text-xs/relaxed dark:bg-input/30",
          "resize-none",
        )}
        id={props.id}
        onBlur={(event) => {
          void props.onBlur?.(event.target.value);
        }}
        onChange={(event) => {
          props.onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            props.onCancel?.();
            return;
          }

          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        placeholder={props.placeholder}
        ref={textareaRef}
        rows={1}
        spellCheck={false}
        style={(
          props.isVisible
            ? undefined
            : { WebkitTextSecurity: "disc" }
        ) as CSSProperties | undefined}
        value={props.value}
      />
      <Button
        aria-label={props.isVisible ? "Hide secret value" : "Show secret value"}
        className="absolute right-1 top-2 h-8 w-8"
        onClick={props.onToggleVisibility}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        size="icon"
        type="button"
        variant="ghost"
      >
        {props.isVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </Button>
    </div>
  );
}
