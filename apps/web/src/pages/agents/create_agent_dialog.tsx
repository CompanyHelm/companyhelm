import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { ComputeProviderLimitsCatalog } from "@/compute_provider_limits_catalog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

export type AgentCreateProviderOption = {
  id: string;
  isDefault: boolean;
  label: string;
  modelProvider: string;
  defaultModelId: string | null;
  defaultReasoningLevel: string | null;
  models: Array<{
    id: string;
    modelId: string;
    name: string;
    reasoningLevels: string[];
  }>;
};

export type AgentCreateSecretOption = {
  description: string | null;
  envVarName: string;
  id: string;
  name: string;
};

export type AgentCreateComputeProviderDefinitionOption = {
  id: string;
  isDefault: boolean;
  label: string;
  provider: "daytona" | "e2b";
};

interface CreateAgentDialogProps {
  computeProviderDefinitionOptions: AgentCreateComputeProviderDefinitionOption[];
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  providerOptions: AgentCreateProviderOption[];
  secretOptions: AgentCreateSecretOption[];
  onCreate(input: {
    environmentRequirements?: {
        minCpuCount: number;
        minDiskSpaceGb: number;
        minMemoryGb: number;
      };
    defaultComputeProviderDefinitionId: string;
    modelProviderCredentialId: string;
    modelProviderCredentialModelId: string;
    name: string;
    reasoningLevel?: string;
    secretIds?: string[];
    systemPrompt?: string;
  }): Promise<void>;
  onOpenChange(open: boolean): void;
}

/**
 * Collects the baseline agent configuration plus optional advanced defaults. The advanced section
 * lets users attach reusable company secrets and override the minimum compute shape for future
 * environments without forcing those fields on every agent creation.
 */
export function CreateAgentDialog(props: CreateAgentDialogProps) {
  const [agentName, setAgentName] = useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [computeProviderDefinitionId, setComputeProviderDefinitionId] = useState("");
  const [providerOptionId, setProviderOptionId] = useState("");
  const [modelOptionId, setModelOptionId] = useState("");
  const [reasoningLevel, setReasoningLevel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [selectedSecretIds, setSelectedSecretIds] = useState<string[]>([]);
  const [minCpuCount, setMinCpuCount] = useState("");
  const [minMemoryGb, setMinMemoryGb] = useState("");
  const [minDiskSpaceGb, setMinDiskSpaceGb] = useState("");
  const selectedProviderOption = useMemo(() => {
    return props.providerOptions.find((providerOption) => providerOption.id === providerOptionId);
  }, [props.providerOptions, providerOptionId]);
  const selectedComputeProviderDefinitionOption = useMemo(() => {
    return props.computeProviderDefinitionOptions.find(
      (definitionOption) => definitionOption.id === computeProviderDefinitionId,
    );
  }, [computeProviderDefinitionId, props.computeProviderDefinitionOptions]);
  const selectedModelOption = useMemo(() => {
    return selectedProviderOption?.models.find((modelOption) => modelOption.id === modelOptionId);
  }, [modelOptionId, selectedProviderOption]);
  const orderedComputeProviderDefinitionOptions = useMemo(() => {
    return props.computeProviderDefinitionOptions
      .map((definitionOption, index) => ({
        definitionOption,
        index,
      }))
      .sort((left, right) => {
        const leftIsSelected = left.definitionOption.id === computeProviderDefinitionId;
        const rightIsSelected = right.definitionOption.id === computeProviderDefinitionId;
        if (leftIsSelected !== rightIsSelected) {
          return leftIsSelected ? -1 : 1;
        }

        if (left.definitionOption.isDefault !== right.definitionOption.isDefault) {
          return left.definitionOption.isDefault ? -1 : 1;
        }

        return left.index - right.index;
      })
      .map(({ definitionOption }) => definitionOption);
  }, [computeProviderDefinitionId, props.computeProviderDefinitionOptions]);
  const orderedProviderOptions = useMemo(() => {
    return props.providerOptions
      .map((providerOption, index) => ({
        index,
        providerOption,
      }))
      .sort((left, right) => {
        const leftIsSelected = left.providerOption.id === providerOptionId;
        const rightIsSelected = right.providerOption.id === providerOptionId;
        if (leftIsSelected !== rightIsSelected) {
          return leftIsSelected ? -1 : 1;
        }

        if (left.providerOption.isDefault !== right.providerOption.isDefault) {
          return left.providerOption.isDefault ? -1 : 1;
        }

        return left.index - right.index;
      })
      .map(({ providerOption }) => providerOption);
  }, [props.providerOptions, providerOptionId]);
  const orderedModelOptions = useMemo(() => {
    const defaultModelOptionId = selectedProviderOption?.models.find(
      (modelOption) => modelOption.modelId === selectedProviderOption.defaultModelId,
    )?.id;

    return (selectedProviderOption?.models ?? [])
      .map((modelOption, index) => ({
        index,
        modelOption,
      }))
      .sort((left, right) => {
        const leftIsSelected = left.modelOption.id === modelOptionId;
        const rightIsSelected = right.modelOption.id === modelOptionId;
        if (leftIsSelected !== rightIsSelected) {
          return leftIsSelected ? -1 : 1;
        }

        const leftIsDefault = left.modelOption.id === defaultModelOptionId;
        const rightIsDefault = right.modelOption.id === defaultModelOptionId;
        if (leftIsDefault !== rightIsDefault) {
          return leftIsDefault ? -1 : 1;
        }

        return left.index - right.index;
      })
      .map(({ modelOption }) => modelOption);
  }, [modelOptionId, selectedProviderOption]);
  const selectedReasoningLevels = selectedModelOption?.reasoningLevels ?? [];
  const selectedComputeProviderCpuBounds = selectedComputeProviderDefinitionOption
    ? ComputeProviderLimitsCatalog.getCpuBounds(selectedComputeProviderDefinitionOption.provider)
    : {
        max: undefined,
        min: 1,
      };
  const selectedComputeProviderMemoryBounds = selectedComputeProviderDefinitionOption
    ? ComputeProviderLimitsCatalog.getMemoryBounds(selectedComputeProviderDefinitionOption.provider)
    : {
        max: undefined,
        min: 1,
      };
  const selectedComputeProviderDiskBounds = selectedComputeProviderDefinitionOption
    ? ComputeProviderLimitsCatalog.getDiskBounds(selectedComputeProviderDefinitionOption.provider)
    : {
        max: undefined,
        min: 1,
      };

  useEffect(() => {
    if (!props.isOpen) {
      setAgentName("");
      setIsAdvancedOpen(false);
      setComputeProviderDefinitionId("");
      setProviderOptionId("");
      setModelOptionId("");
      setReasoningLevel("");
      setSystemPrompt("");
      setSelectedSecretIds([]);
      setMinCpuCount("");
      setMinMemoryGb("");
      setMinDiskSpaceGb("");
    }
  }, [props.isOpen]);

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    if (!props.computeProviderDefinitionOptions.some((option) => option.id === computeProviderDefinitionId)) {
      const defaultComputeProviderDefinition = props.computeProviderDefinitionOptions.find((option) => option.isDefault)
        ?? props.computeProviderDefinitionOptions[0]
        ?? null;
      setComputeProviderDefinitionId(defaultComputeProviderDefinition?.id ?? "");
    }

    if (!props.providerOptions.some((option) => option.id === providerOptionId)) {
      const defaultProviderOption = props.providerOptions.find((option) => option.isDefault)
        ?? props.providerOptions[0]
        ?? null;
      setProviderOptionId(defaultProviderOption?.id ?? "");
    }
  }, [
    computeProviderDefinitionId,
    props.computeProviderDefinitionOptions,
    props.isOpen,
    props.providerOptions,
    providerOptionId,
  ]);

  useEffect(() => {
    if (!selectedProviderOption) {
      setModelOptionId("");
      setReasoningLevel("");
      return;
    }

    if (selectedProviderOption.models.some((modelOption) => modelOption.id === modelOptionId)) {
      return;
    }

    const defaultModelOption = selectedProviderOption.models.find(
      (modelOption) => modelOption.modelId === selectedProviderOption.defaultModelId,
    );
    setModelOptionId(defaultModelOption?.id ?? selectedProviderOption.models[0]?.id ?? "");
    setReasoningLevel("");
  }, [modelOptionId, selectedProviderOption]);

  useEffect(() => {
    if (selectedReasoningLevels.length === 0) {
      setReasoningLevel("");
      return;
    }

    if (!selectedReasoningLevels.includes(reasoningLevel)) {
      const defaultReasoningLevel = selectedProviderOption?.defaultReasoningLevel;
      setReasoningLevel(
        defaultReasoningLevel && selectedReasoningLevels.includes(defaultReasoningLevel)
          ? defaultReasoningLevel
          : (selectedReasoningLevels[0] ?? ""),
      );
    }
  }, [reasoningLevel, selectedProviderOption?.defaultReasoningLevel, selectedReasoningLevels]);

  const isReasoningLevelRequired = selectedReasoningLevels.length > 0;
  const hasAnyComputeRequirement = minCpuCount.length > 0 || minMemoryGb.length > 0 || minDiskSpaceGb.length > 0;
  const hasCompleteComputeRequirements = minCpuCount.length > 0 && minMemoryGb.length > 0 && minDiskSpaceGb.length > 0;
  const parsedMinCpuCount = minCpuCount.length > 0 ? Number(minCpuCount) : null;
  const parsedMinMemoryGb = minMemoryGb.length > 0 ? Number(minMemoryGb) : null;
  const parsedMinDiskSpaceGb = minDiskSpaceGb.length > 0 ? Number(minDiskSpaceGb) : null;
  const computeRequirementErrorMessage = (hasAnyComputeRequirement && !hasCompleteComputeRequirements)
    ? "Enter CPU, memory, and disk together, or leave all three blank."
    : (parsedMinCpuCount !== null && (!Number.isInteger(parsedMinCpuCount) || parsedMinCpuCount <= 0))
      ? "CPU must be a positive integer."
      : (parsedMinMemoryGb !== null && (!Number.isInteger(parsedMinMemoryGb) || parsedMinMemoryGb <= 0))
        ? "Memory must be a positive integer."
        : (parsedMinDiskSpaceGb !== null && (!Number.isInteger(parsedMinDiskSpaceGb) || parsedMinDiskSpaceGb <= 0))
          ? "Disk must be a positive integer."
          : (hasCompleteComputeRequirements && selectedComputeProviderDefinitionOption)
            ? ComputeProviderLimitsCatalog.getValidationMessage(
              selectedComputeProviderDefinitionOption.provider,
              {
                minCpuCount: parsedMinCpuCount!,
                minDiskSpaceGb: parsedMinDiskSpaceGb!,
                minMemoryGb: parsedMinMemoryGb!,
              },
            )
            : null;
  const advancedSummary = [
    selectedSecretIds.length > 0 ? `${selectedSecretIds.length} secret${selectedSecretIds.length === 1 ? "" : "s"}` : null,
    hasAnyComputeRequirement ? "custom compute" : null,
  ].filter((value): value is string => Boolean(value)).join(" • ");
  const shouldScrollSecrets = props.secretOptions.length > 7;
  const isCreateDisabled = agentName.length === 0
    || computeProviderDefinitionId.length === 0
    || providerOptionId.length === 0
    || modelOptionId.length === 0
    || (isReasoningLevelRequired && reasoningLevel.length === 0)
    || computeRequirementErrorMessage !== null;

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create agent</DialogTitle>
          <DialogDescription>
            Set a default environment provider, model provider, model, reasoning level, and system prompt for this agent.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="agent-name">
              Name
            </label>
            <Input
              id="agent-name"
              onChange={(event) => {
                setAgentName(event.target.value);
              }}
              placeholder="Research Agent"
              value={agentName}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="agent-compute-provider">
              Environment provider
            </label>
            <Select
              items={orderedComputeProviderDefinitionOptions.map((definitionOption) => ({
                label: definitionOption.label,
                value: definitionOption.id,
              }))}
              onValueChange={(value) => {
                setComputeProviderDefinitionId(value);
              }}
              value={computeProviderDefinitionId}
            >
              <SelectTrigger id="agent-compute-provider">
                <SelectValue placeholder="Select an environment provider" />
              </SelectTrigger>
              <SelectContent>
                {orderedComputeProviderDefinitionOptions.map((definitionOption) => (
                  <SelectItem key={definitionOption.id} value={definitionOption.id}>
                    {definitionOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="agent-provider">
              Provider
            </label>
            <Select
              items={orderedProviderOptions.map((providerOption) => ({
                label: providerOption.label,
                value: providerOption.id,
              }))}
              onValueChange={(value) => {
                setProviderOptionId(value);
              }}
              value={providerOptionId}
            >
              <SelectTrigger id="agent-provider">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {orderedProviderOptions.map((providerOption) => (
                  <SelectItem key={providerOption.id} value={providerOption.id}>
                    {providerOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="agent-model">
              Model
            </label>
            <Select
              items={orderedModelOptions.map((modelOption) => ({
                label: modelOption.name,
                value: modelOption.id,
              }))}
              onValueChange={(value) => {
                setModelOptionId(value);
              }}
              value={modelOptionId}
            >
              <SelectTrigger id="agent-model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {orderedModelOptions.map((modelOption) => (
                  <SelectItem key={modelOption.id} value={modelOption.id}>
                    {modelOption.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isReasoningLevelRequired ? (
            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="agent-reasoning-level">
                Reasoning level
              </label>
              <Select
                items={selectedReasoningLevels.map((level) => ({
                  label: level,
                  value: level,
                }))}
                onValueChange={(value) => {
                  setReasoningLevel(value);
                }}
                value={reasoningLevel}
              >
                <SelectTrigger id="agent-reasoning-level">
                  <SelectValue placeholder="Select a reasoning level" />
                </SelectTrigger>
                <SelectContent>
                  {selectedReasoningLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="agent-system-prompt">
              System prompt (optional)
            </label>
            <textarea
              id="agent-system-prompt"
              onChange={(event) => {
                setSystemPrompt(event.target.value);
              }}
              placeholder="You are a concise research assistant."
              rows={6}
              value={systemPrompt}
              className="min-h-28 w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-3">
            <button
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => {
                setIsAdvancedOpen((currentValue) => !currentValue);
              }}
              type="button"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Advanced</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add default secrets or override the minimum compute requirements for new environments.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {advancedSummary.length > 0 ? (
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {advancedSummary}
                  </span>
                ) : null}
                {isAdvancedOpen ? (
                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {isAdvancedOpen ? (
              <div className="grid gap-4 border-t border-border/60 pt-3">
                <div className="grid gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Default secrets
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Selected secrets are attached to future sessions created from this agent.
                    </p>
                  </div>

                  {props.secretOptions.length > 0 ? (
                    <div className={shouldScrollSecrets ? "max-h-[28rem] overflow-y-auto pr-1" : undefined}>
                      <div className="grid gap-2">
                        {props.secretOptions.map((secretOption) => {
                          const isSelected = selectedSecretIds.includes(secretOption.id);

                          return (
                            <button
                              key={secretOption.id}
                              aria-pressed={isSelected}
                              className={`rounded-lg border px-3 py-3 text-left transition ${
                                isSelected
                                  ? "border-primary/60 bg-primary/10"
                                  : "border-border/60 bg-background/40 hover:border-border hover:bg-background/70"
                              }`}
                              onClick={() => {
                                setSelectedSecretIds((currentValue) => {
                                  if (currentValue.includes(secretOption.id)) {
                                    return currentValue.filter((secretId) => secretId !== secretOption.id);
                                  }

                                  return [...currentValue, secretOption.id];
                                });
                              }}
                              type="button"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-foreground">{secretOption.name}</p>
                                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                  {secretOption.envVarName}
                                </span>
                              </div>
                              {secretOption.description ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {secretOption.description}
                                </p>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No reusable company secrets are available yet.
                    </p>
                  )}
                </div>

                <div className="grid gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Minimum compute
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Leave all three fields blank to use the default minimum of 1 CPU, 3 GB RAM, and 10 GB disk.
                    </p>
                    {selectedComputeProviderDefinitionOption ? (
                      <>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Published range: {ComputeProviderLimitsCatalog.formatPublishedRangeSummary(
                            selectedComputeProviderDefinitionOption.provider,
                          )}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {ComputeProviderLimitsCatalog.getPublishedRangeDisclaimer()}
                        </p>
                      </>
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-medium text-foreground" htmlFor="agent-min-cpu">
                        CPU (optional)
                      </label>
                      <Input
                        id="agent-min-cpu"
                        max={selectedComputeProviderCpuBounds.max}
                        min={selectedComputeProviderCpuBounds.min}
                        onChange={(event) => {
                          setMinCpuCount(event.target.value);
                        }}
                        placeholder="1"
                        type="number"
                        value={minCpuCount}
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-medium text-foreground" htmlFor="agent-min-memory">
                        Memory (GB) (optional)
                      </label>
                      <Input
                        id="agent-min-memory"
                        max={selectedComputeProviderMemoryBounds.max}
                        min={selectedComputeProviderMemoryBounds.min}
                        onChange={(event) => {
                          setMinMemoryGb(event.target.value);
                        }}
                        placeholder="3"
                        type="number"
                        value={minMemoryGb}
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-medium text-foreground" htmlFor="agent-min-disk">
                        Disk (GB) (optional)
                      </label>
                      <Input
                        id="agent-min-disk"
                        max={selectedComputeProviderDiskBounds.max}
                        min={selectedComputeProviderDiskBounds.min}
                        onChange={(event) => {
                          setMinDiskSpaceGb(event.target.value);
                        }}
                        placeholder="10"
                        type="number"
                        value={minDiskSpaceGb}
                      />
                    </div>
                  </div>

                  {computeRequirementErrorMessage ? (
                    <p className="text-xs text-destructive">
                      {computeRequirementErrorMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {props.errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {props.errorMessage}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              props.onOpenChange(false);
            }}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            disabled={props.isSaving || isCreateDisabled}
            onClick={async () => {
              await props.onCreate({
                environmentRequirements: hasCompleteComputeRequirements
                  ? {
                    minCpuCount: parsedMinCpuCount!,
                    minDiskSpaceGb: parsedMinDiskSpaceGb!,
                    minMemoryGb: parsedMinMemoryGb!,
                  }
                  : undefined,
                defaultComputeProviderDefinitionId: computeProviderDefinitionId,
                modelProviderCredentialId: providerOptionId,
                modelProviderCredentialModelId: modelOptionId,
                name: agentName,
                reasoningLevel: reasoningLevel.length === 0 ? undefined : reasoningLevel,
                secretIds: selectedSecretIds.length > 0 ? selectedSecretIds : undefined,
                systemPrompt: systemPrompt.length === 0 ? undefined : systemPrompt,
              });
            }}
            type="button"
          >
            {props.isSaving ? "Creating..." : "Create agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
