import { useState } from "react";
import { ChevronDownIcon, Loader2Icon, XIcon } from "lucide-react";
import { SearchableSelectionDialog } from "@/components/searchable_selection_dialog";
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
  searchDialog?: {
    description: string;
    noResultsMessage: string;
    searchPlaceholder: string;
    title: string;
  };
  selectedOptions: DefaultAttachmentSectionOption[];
}

/**
 * Renders the shared dropdown-plus-pill attachment UI used by agent defaults. The component is
 * intentionally presentation-only so pages can decide whether selections are local draft state or
 * persisted Relay mutations.
 */
export function DefaultAttachmentSection(props: DefaultAttachmentSectionProps) {
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const isDisabled = props.disabled === true;
  const isAddDisabled = isDisabled || props.availableOptions.length === 0;
  const searchableItems = props.availableOptions.map((option) => ({
    description: [option.metaLabel, option.description].filter((value): value is string => Boolean(value)).join(" • "),
    id: option.id,
    searchText: [option.label, option.metaLabel ?? "", option.description ?? ""].join(" "),
    title: option.label,
  }));

  const addOption = async (optionId: string) => {
    setPendingSelection(optionId);
    try {
      await props.onAdd(optionId);
    } finally {
      setPendingSelection(null);
    }
  };

  return (
    <div className="grid gap-2">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{props.addLabel}</p>
      {props.searchDialog ? (
        <>
          <button
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-input/20 px-3 text-left text-sm outline-none transition hover:bg-input/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50"
            disabled={isAddDisabled}
            onClick={() => {
              setIsSearchDialogOpen(true);
            }}
            type="button"
          >
            <span className={props.availableOptions.length > 0 ? "truncate text-foreground" : "truncate text-muted-foreground"}>
              {props.availableOptions.length > 0 ? props.placeholder : props.availableEmptyLabel}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
          <SearchableSelectionDialog
            description={props.searchDialog.description}
            items={searchableItems}
            noItemsMessage={props.availableEmptyLabel}
            noResultsMessage={props.searchDialog.noResultsMessage}
            onOpenChange={setIsSearchDialogOpen}
            onSelect={(optionId) => {
              setIsSearchDialogOpen(false);
              void addOption(optionId);
            }}
            open={isSearchDialogOpen}
            searchPlaceholder={props.searchDialog.searchPlaceholder}
            selectedItemId={pendingSelection}
            title={props.searchDialog.title}
          />
        </>
      ) : (
        <Select
          disabled={isAddDisabled}
          items={props.availableOptions.map((option) => ({
            label: option.label,
            value: option.id,
          }))}
          onValueChange={async (value) => {
            if (typeof value !== "string" || value.length === 0) {
              setPendingSelection(null);
              return;
            }

            await addOption(value);
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
      )}

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
