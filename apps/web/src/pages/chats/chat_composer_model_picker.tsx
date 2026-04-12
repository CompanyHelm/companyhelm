import { useMemo, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChatSelectionDialog } from "./chat_selection_dialog";

export type ChatComposerModelOption = {
  description: string;
  id: string;
  modelProviderCredentialModelId: string;
  modelId: string;
  name: string;
  providerLabel: string;
  reasoningSupported: boolean;
  reasoningLevels: string[];
};

interface ChatComposerModelPickerProps {
  modelOptions: ChatComposerModelOption[];
  reasoningLevel: string;
  selectedModelOptionId: string;
  onModelChange(value: string): void;
  onReasoningLevelChange(value: string): void;
}

/**
 * Keeps the chat composer model controls compact while still exposing the full cross-provider
 * model catalog and any reasoning levels supported by the currently selected model.
 */
export function ChatComposerModelPicker(props: ChatComposerModelPickerProps) {
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const selectedModelOption = props.modelOptions.find((modelOption) => {
    return modelOption.id === props.selectedModelOptionId;
  }) ?? null;
  const selectedReasoningLevels = selectedModelOption?.reasoningLevels ?? [];
  const modelSelectionItems = useMemo(() => {
    return props.modelOptions.map((modelOption) => ({
      description: `${modelOption.providerLabel} • ${modelOption.description}`,
      id: modelOption.id,
      searchText: [
        modelOption.name,
        modelOption.providerLabel,
        modelOption.description,
      ].join(" "),
      title: modelOption.name,
    }));
  }, [props.modelOptions]);
  const selectedModelDisplayValue = selectedModelOption
    ? `${selectedModelOption.providerLabel} ${selectedModelOption.name}`
    : "Select model";
  const handleReasoningLevelChange = (value: string | null) => {
    if (typeof value !== "string") {
      return;
    }

    props.onReasoningLevelChange(value);
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 text-xs text-muted-foreground">
      <button
        className="flex h-7 w-auto max-w-[24rem] min-w-0 items-center gap-1.5 rounded-full border-0 bg-background/60 px-2.5 text-xs text-muted-foreground shadow-none transition hover:bg-background/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={props.modelOptions.length === 0}
        onClick={() => {
          setIsModelDialogOpen(true);
        }}
        type="button"
      >
        <span className="truncate">{selectedModelDisplayValue}</span>
        <ChevronDownIcon className="size-3.5 shrink-0" />
      </button>

      <ChatSelectionDialog
        contentClassName="sm:max-w-2xl"
        description="Search the available model catalog and use the keyboard to pick the active draft model."
        items={modelSelectionItems}
        noItemsMessage="No models are available for this chat."
        noResultsMessage="No models match your search."
        onOpenChange={setIsModelDialogOpen}
        onSelect={(modelOptionId) => {
          props.onModelChange(modelOptionId);
          setIsModelDialogOpen(false);
        }}
        open={isModelDialogOpen}
        searchPlaceholder="Search models"
        selectedItemId={props.selectedModelOptionId}
        title="Select model"
      />

      {selectedReasoningLevels.length > 0 ? (
        <Select
          items={selectedReasoningLevels.map((reasoningOption) => ({
            label: reasoningOption,
            value: reasoningOption,
          }))}
          onValueChange={handleReasoningLevelChange}
          value={props.reasoningLevel}
        >
          <SelectTrigger
            className="h-7 w-auto rounded-full border-0 bg-background/60 px-2.5 text-xs text-muted-foreground shadow-none focus-visible:ring-1 focus-visible:ring-ring/30"
            icon={<ChevronDownIcon className="size-3.5" />}
          >
            <SelectValue placeholder="Reasoning" />
          </SelectTrigger>
          <SelectContent>
            {selectedReasoningLevels.map((reasoningOption) => (
              <SelectItem key={reasoningOption} value={reasoningOption}>
                {reasoningOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
