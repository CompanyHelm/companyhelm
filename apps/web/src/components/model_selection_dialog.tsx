import { useMemo } from "react";
import { SearchableSelectionDialog } from "@/components/searchable_selection_dialog";

export type ModelSelectionOption = {
  description?: string | null;
  id: string;
  modelId: string;
  name: string;
  providerLabel: string;
};

interface ModelSelectionDialogProps {
  description: string;
  noItemsMessage: string;
  open: boolean;
  options: readonly ModelSelectionOption[];
  selectedOptionId?: string | null;
  title?: string;
  onOpenChange(nextOpen: boolean): void;
  onSelect(optionId: string): void;
}

/**
 * Adapts provider-backed model records into the shared searchable picker so model selection keeps
 * the same search fields, empty states, and keyboard behavior everywhere it appears.
 */
export function ModelSelectionDialog(props: ModelSelectionDialogProps) {
  const selectionItems = useMemo(() => {
    return props.options.map((modelOption) => {
      const description = modelOption.description && modelOption.description.length > 0
        ? `${modelOption.providerLabel} • ${modelOption.description}`
        : modelOption.providerLabel;

      return {
        description,
        id: modelOption.id,
        searchText: [
          modelOption.name,
          modelOption.modelId,
          modelOption.providerLabel,
          modelOption.description ?? "",
        ].join(" "),
        title: modelOption.name,
      };
    });
  }, [props.options]);

  return (
    <SearchableSelectionDialog
      contentClassName="sm:max-w-2xl"
      description={props.description}
      items={selectionItems}
      noItemsMessage={props.noItemsMessage}
      noResultsMessage="No models match your search."
      onOpenChange={props.onOpenChange}
      onSelect={props.onSelect}
      open={props.open}
      searchPlaceholder="Search models"
      selectedItemId={props.selectedOptionId}
      title={props.title ?? "Select model"}
    />
  );
}
