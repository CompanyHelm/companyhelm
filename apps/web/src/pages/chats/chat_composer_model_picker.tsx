import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, Settings2Icon } from "lucide-react";
import { type ModelOptionDefinition, type ModelOptionValue, type ModelOptionValues } from "@/components/model_options_control";
import { ModelProviderIcon } from "@/components/model_provider_icon";
import { ModelSelectionDialog, type ModelSelectionOption } from "@/components/model_selection_dialog";

export type ChatComposerModelOption = ModelSelectionOption & {
  description: string;
  modelProviderCredentialModelId: string | null | undefined;
  providerOptionId: string;
  providerId: string;
  modelOptions: ModelOptionDefinition[];
  reasoningSupported: boolean;
  reasoningLevels: string[];
};

interface ChatComposerModelPickerProps {
  modelOptions: ChatComposerModelOption[];
  selectedModelOptions: ModelOptionValues;
  reasoningLevel: string;
  selectedModelOptionId: string;
  onModelChange(value: string): void;
  onModelOptionsChange(value: ModelOptionValues): void;
  onReasoningLevelChange(value: string): void;
}

type ChatComposerSettingsGroup = {
  id: string;
  label: string;
  options: ChatComposerSettingsOption[];
  selectedLabel: string;
};

type ChatComposerSettingsOption = {
  description?: string | null;
  id: string;
  label: string;
  onSelect(): void;
  selected: boolean;
};

/**
 * Keeps the chat composer model controls compact while grouping reasoning and provider-specific
 * model settings into one submenu-driven options button beside the selected model.
 */
export function ChatComposerModelPicker(props: ChatComposerModelPickerProps) {
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [activeSettingsGroupId, setActiveSettingsGroupId] = useState<string | null>(null);
  const [settingsMenuPosition, setSettingsMenuPosition] = useState<{ bottom: number; left: number; width: number } | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const selectedModelOption = props.modelOptions.find((modelOption) => {
    return modelOption.id === props.selectedModelOptionId;
  }) ?? null;
  const selectedReasoningLevels = selectedModelOption?.reasoningLevels ?? [];
  const modelSelectionOptions = useMemo(() => {
    return props.modelOptions.map((modelOption) => ({
      description: modelOption.description,
      id: modelOption.id,
      modelId: modelOption.modelId,
      name: modelOption.name,
      providerId: modelOption.providerId,
      providerLabel: modelOption.providerLabel,
    }));
  }, [props.modelOptions]);
  const settingsGroups = useMemo(() => {
    const groups: ChatComposerSettingsGroup[] = [];
    if (selectedReasoningLevels.length > 0) {
      groups.push({
        id: "reasoningLevel",
        label: "Reasoning level",
        selectedLabel: props.reasoningLevel || "Default",
        options: selectedReasoningLevels.map((level) => ({
          id: level,
          label: level,
          selected: level === props.reasoningLevel,
          onSelect: () => {
            props.onReasoningLevelChange(level);
          },
        })),
      });
    }

    for (const definition of selectedModelOption?.modelOptions ?? []) {
      if (definition.type !== "select" || !definition.options?.length) {
        continue;
      }

      const selectedValue = Object.prototype.hasOwnProperty.call(props.selectedModelOptions, definition.key)
        ? props.selectedModelOptions[definition.key]
        : definition.defaultValue ?? null;
      const selectedChoice = definition.options.find((option) => option.value === selectedValue);
      groups.push({
        id: `modelOption:${definition.key}`,
        label: definition.name,
        selectedLabel: selectedChoice?.name ?? "Default",
        options: definition.options.map((option) => ({
          description: option.description ?? null,
          id: `${definition.key}:${encodeModelOptionMenuValue(option.value)}`,
          label: option.name,
          selected: option.value === selectedValue,
          onSelect: () => {
            props.onModelOptionsChange({
              ...props.selectedModelOptions,
              [definition.key]: option.value,
            });
          },
        })),
      });
    }

    return groups;
  }, [props, selectedModelOption?.modelOptions, selectedReasoningLevels]);
  const activeSettingsGroup = settingsGroups.find((group) => group.id === activeSettingsGroupId)
    ?? settingsGroups[0]
    ?? null;
  const settingsSummary = settingsGroups.map((group) => group.selectedLabel).join(" · ");
  const selectedModelDisplayValue = selectedModelOption
    ? `${selectedModelOption.providerLabel} ${selectedModelOption.name}`
    : "Select model";

  useEffect(() => {
    if (!settingsGroups.some((group) => group.id === activeSettingsGroupId)) {
      setActiveSettingsGroupId(settingsGroups[0]?.id ?? null);
    }
  }, [activeSettingsGroupId, settingsGroups]);

  useEffect(() => {
    if (!isSettingsMenuOpen) {
      return undefined;
    }

    updateSettingsMenuPosition(settingsButtonRef.current, setSettingsMenuPosition);
    const handleResize = () => {
      updateSettingsMenuPosition(settingsButtonRef.current, setSettingsMenuPosition);
    };
    window.addEventListener("resize", handleResize);

    const handlePointerDown = (event: PointerEvent) => {
      if (menuContainerRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsSettingsMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isSettingsMenuOpen]);

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
        {selectedModelOption ? (
          <ModelProviderIcon
            className="size-5 rounded-full bg-transparent"
            imageClassName="size-3.5"
            label={selectedModelOption.providerLabel}
            providerId={selectedModelOption.providerId}
          />
        ) : null}
        <span className="truncate">{selectedModelDisplayValue}</span>
        <ChevronDownIcon className="size-3.5 shrink-0" />
      </button>

      <ModelSelectionDialog
        description="Search the available model catalog and use the keyboard to pick the active draft model."
        noItemsMessage="No models are available for this chat."
        onOpenChange={setIsModelDialogOpen}
        onSelect={(modelOptionId) => {
          props.onModelChange(modelOptionId);
          setIsModelDialogOpen(false);
        }}
        open={isModelDialogOpen}
        options={modelSelectionOptions}
        selectedOptionId={props.selectedModelOptionId}
      />

      {settingsGroups.length > 0 ? (
        <div ref={menuContainerRef} className="relative">
          <button
            ref={settingsButtonRef}
            aria-expanded={isSettingsMenuOpen}
            aria-haspopup="menu"
            aria-label="Model settings"
            className="flex h-7 w-auto max-w-[16rem] items-center gap-1.5 rounded-full border-0 bg-background/60 px-2.5 text-xs text-muted-foreground shadow-none transition hover:bg-background/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30"
            onClick={() => {
              updateSettingsMenuPosition(settingsButtonRef.current, setSettingsMenuPosition);
              setIsSettingsMenuOpen((isOpen) => !isOpen);
            }}
            type="button"
          >
            <Settings2Icon className="size-3.5" />
            <span className="truncate">{settingsSummary}</span>
            <ChevronDownIcon className="size-3.5" />
          </button>
          {isSettingsMenuOpen ? (
            <div
              className="fixed z-[100] flex h-64 overflow-hidden rounded-xl border border-border/70 bg-popover text-popover-foreground shadow-xl"
              style={{
                bottom: settingsMenuPosition?.bottom ?? 64,
                left: settingsMenuPosition?.left ?? 16,
                width: settingsMenuPosition?.width ?? 448,
              }}
            >
              <div className="w-52 overflow-y-auto border-r border-border/60 p-1.5">
                {settingsGroups.map((group) => (
                  <button
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-muted/70 data-[active=true]:bg-muted data-[active=true]:text-foreground"
                    data-active={group.id === activeSettingsGroup?.id}
                    key={group.id}
                    onClick={() => {
                      setActiveSettingsGroupId(group.id);
                    }}
                    onMouseEnter={() => {
                      setActiveSettingsGroupId(group.id);
                    }}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{group.label}</span>
                      <span className="block truncate text-muted-foreground">{group.selectedLabel}</span>
                    </span>
                    <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
              {activeSettingsGroup ? (
                <div className="w-60 overflow-y-auto p-1.5">
                  <p className="px-2.5 py-1.5 text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
                    {activeSettingsGroup.label}
                  </p>
                  {activeSettingsGroup.options.map((option) => (
                    <button
                      className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-muted/70 data-[selected=true]:text-foreground"
                      data-selected={option.selected}
                      key={option.id}
                      onClick={() => {
                        option.onSelect();
                        setIsSettingsMenuOpen(false);
                      }}
                      type="button"
                    >
                      <span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center">
                        {option.selected ? <CheckIcon className="size-3.5" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{option.label}</span>
                        {option.description ? (
                          <span className="mt-0.5 block text-[0.6875rem]/relaxed text-muted-foreground">
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function encodeModelOptionMenuValue(value: ModelOptionValue | undefined): string {
  return JSON.stringify(value ?? null);
}

function updateSettingsMenuPosition(
  button: HTMLButtonElement | null,
  setPosition: (position: { bottom: number; left: number; width: number }) => void,
): void {
  const menuWidth = window.innerWidth < 640 ? Math.min(320, window.innerWidth - 32) : 448;
  if (!button) {
    setPosition({ bottom: 64, left: 16, width: menuWidth });
    return;
  }

  const buttonRect = button.getBoundingClientRect();
  const left = Math.min(
    Math.max(16, buttonRect.right - menuWidth),
    Math.max(16, window.innerWidth - menuWidth - 16),
  );
  setPosition({
    bottom: window.innerHeight - buttonRect.top + 8,
    left,
    width: menuWidth,
  });
}
