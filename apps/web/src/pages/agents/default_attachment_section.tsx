import { useState } from "react";
import { Loader2Icon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DefaultAttachmentSectionOption = {
  description?: string | null;
  id: string;
  label: string;
  metaLabel?: string | null;
};

interface DefaultAttachmentSectionProps {
  addLabel: string;
  availableEmptyLabel: string;
  availableOptions: DefaultAttachmentSectionOption[];
  busyItemId?: string | null;
  currentLabel: string;
  disabled?: boolean;
  emptyStateLabel: string;
  onAdd(optionId: string): Promise<void> | void;
  onRemove(optionId: string): Promise<void> | void;
  placeholder: string;
  selectedOptions: DefaultAttachmentSectionOption[];
}

/**
 * Renders the shared dropdown-plus-pill attachment UI used by agent defaults. The component is
 * intentionally presentation-only so pages can decide whether selections are local draft state or
 * persisted Relay mutations.
 */
export function DefaultAttachmentSection(props: DefaultAttachmentSectionProps) {
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const isDisabled = props.disabled === true;

  return (
    <div className="grid gap-2">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{props.addLabel}</p>
      <Select
        disabled={isDisabled || props.availableOptions.length === 0}
        items={props.availableOptions.map((option) => ({
          label: option.label,
          value: option.id,
        }))}
        onValueChange={async (value) => {
          if (typeof value !== "string" || value.length === 0) {
            setPendingSelection(null);
            return;
          }

          setPendingSelection(value);
          try {
            await props.onAdd(value);
          } finally {
            setPendingSelection(null);
          }
        }}
        value={pendingSelection ?? undefined}
      >
        <SelectTrigger>
          <SelectValue placeholder={props.availableOptions.length > 0 ? props.placeholder : props.availableEmptyLabel} />
        </SelectTrigger>
        <SelectContent>
          {props.availableOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{props.currentLabel}</p>
        {props.selectedOptions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {props.selectedOptions.map((option) => (
              <Badge
                className="h-auto gap-2 rounded-full px-3 py-1 text-xs"
                key={option.id}
                variant="outline"
              >
                <span>{option.label}</span>
                {option.metaLabel ? (
                  <span className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                    {option.metaLabel}
                  </span>
                ) : null}
                <button
                  aria-label={`Remove ${option.label}`}
                  className="rounded-full p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isDisabled}
                  onClick={async () => {
                    await props.onRemove(option.id);
                  }}
                  type="button"
                >
                  {props.busyItemId === option.id ? (
                    <Loader2Icon className="size-3 animate-spin" />
                  ) : (
                    <XIcon className="size-3" />
                  )}
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {props.emptyStateLabel}
          </div>
        )}
      </div>
    </div>
  );
}
