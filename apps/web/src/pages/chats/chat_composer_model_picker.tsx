import { ChevronDownIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ChatComposerModelOption = {
  description: string;
  id: string;
  modelId: string;
  name: string;
  providerLabel: string;
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
  const selectedModelOption = props.modelOptions.find((modelOption) => {
    return modelOption.id === props.selectedModelOptionId;
  }) ?? null;
  const selectedReasoningLevels = selectedModelOption?.reasoningLevels ?? [];

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
      <Select
        items={props.modelOptions.map((modelOption) => ({
          label: `${modelOption.providerLabel} ${modelOption.name}`,
          value: modelOption.id,
        }))}
        onValueChange={props.onModelChange}
        value={props.selectedModelOptionId}
      >
        <SelectTrigger
          className="h-8 w-auto max-w-[24rem] min-w-0 rounded-full border-0 bg-background/60 px-3 text-xs text-muted-foreground shadow-none focus-visible:ring-1 focus-visible:ring-ring/30"
          icon={<ChevronDownIcon className="size-3.5" />}
        >
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent className="max-h-[24rem] overflow-y-auto">
          {props.modelOptions.map((modelOption) => (
            <SelectItem key={modelOption.id} value={modelOption.id}>
              <div className="grid min-w-0 gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">{modelOption.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {modelOption.providerLabel}
                  {" • "}
                  {modelOption.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedReasoningLevels.length > 0 ? (
        <Select
          items={selectedReasoningLevels.map((reasoningOption) => ({
            label: reasoningOption,
            value: reasoningOption,
          }))}
          onValueChange={props.onReasoningLevelChange}
          value={props.reasoningLevel}
        >
          <SelectTrigger
            className="h-8 w-auto rounded-full border-0 bg-background/60 px-3 text-xs text-muted-foreground shadow-none focus-visible:ring-1 focus-visible:ring-ring/30"
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
