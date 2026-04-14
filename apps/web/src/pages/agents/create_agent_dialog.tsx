import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
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
import { DefaultAttachmentSection } from "./default_attachment_section";

export type AgentCreateProviderOption = {
  id: string;
  modelProviderCredentialId: string;
  isDefault: boolean;
  label: string;
  modelProvider: string;
  defaultModelId: string | null | undefined;
  defaultReasoningLevel: string | null | undefined;
  models: Array<{
    id: string;
    modelProviderCredentialModelId: string;
    modelId: string;
    name: string;
    reasoningSupported: boolean;
    reasoningLevels: string[];
  }>;
};

export type AgentCreateSecretOption = {
  description: string | null | undefined;
  envVarName: string;
  id: string;
  name: string;
};

export type AgentCreateSecretGroupOption = {
  id: string;
  name: string;
};

export type AgentCreateSkillGroupOption = {
  id: string;
  name: string;
};

export type AgentCreateSkillOption = {
  description: string;
  id: string;
  name: string;
  skillGroupId: string | null | undefined;
};

export type AgentCreateMcpServerOption = {
  description: string | null | undefined;
  id: string;
  name: string;
  url: string;
};

export type AgentCreateComputeProviderDefinitionOption = {
  id: string;
  isDefault: boolean;
  label: string;
  provider: "e2b";
  templates: AgentCreateEnvironmentTemplateOption[];
};

export type AgentCreateEnvironmentTemplateOption = {
  computerUse: boolean;
  cpuCount: number;
  diskSpaceGb: number;
  memoryGb: number;
  name: string;
  templateId: string;
};

interface CreateAgentDialogProps {
  computeProviderDefinitionOptions: AgentCreateComputeProviderDefinitionOption[];
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  providerOptions: AgentCreateProviderOption[];
  secretOptions: AgentCreateSecretOption[];
  secretGroupOptions: AgentCreateSecretGroupOption[];
  skillGroupOptions: AgentCreateSkillGroupOption[];
  skillOptions: AgentCreateSkillOption[];
  mcpServerOptions: AgentCreateMcpServerOption[];
  onCreate(input: {
    defaultComputeProviderDefinitionId: string;
    defaultEnvironmentTemplateId: string;
    modelProviderCredentialId: string;
    modelProviderCredentialModelId: string;
    name: string;
    reasoningLevel?: string;
    secretGroupIds?: string[];
    secretIds?: string[];
    skillGroupIds?: string[];
    skillIds?: string[];
    mcpServerIds?: string[];
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
  const [environmentTemplateId, setEnvironmentTemplateId] = useState("");
  const [providerOptionId, setProviderOptionId] = useState("");
  const [modelOptionId, setModelOptionId] = useState("");
  const [reasoningLevel, setReasoningLevel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [selectedSecretGroupIds, setSelectedSecretGroupIds] = useState<string[]>([]);
  const [selectedSecretIds, setSelectedSecretIds] = useState<string[]>([]);
  const [selectedSkillGroupIds, setSelectedSkillGroupIds] = useState<string[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedMcpServerIds, setSelectedMcpServerIds] = useState<string[]>([]);
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
  const selectedEnvironmentTemplateOption = useMemo(() => {
    return selectedComputeProviderDefinitionOption?.templates.find(
      (templateOption) => templateOption.templateId === environmentTemplateId,
    ) ?? null;
  }, [environmentTemplateId, selectedComputeProviderDefinitionOption]);
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

  useEffect(() => {
    if (!props.isOpen) {
      setAgentName("");
      setIsAdvancedOpen(false);
      setComputeProviderDefinitionId("");
      setEnvironmentTemplateId("");
      setProviderOptionId("");
      setModelOptionId("");
      setReasoningLevel("");
      setSystemPrompt("");
      setSelectedSecretGroupIds([]);
      setSelectedSecretIds([]);
      setSelectedSkillGroupIds([]);
      setSelectedSkillIds([]);
      setSelectedMcpServerIds([]);
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
    if (!selectedComputeProviderDefinitionOption) {
      setEnvironmentTemplateId("");
      return;
    }

    if (
      selectedComputeProviderDefinitionOption.templates.some(
        (templateOption) => templateOption.templateId === environmentTemplateId,
      )
    ) {
      return;
    }

    setEnvironmentTemplateId(selectedComputeProviderDefinitionOption.templates[0]?.templateId ?? "");
  }, [environmentTemplateId, selectedComputeProviderDefinitionOption]);

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
  const advancedSummary = [
    selectedSecretGroupIds.length > 0
      ? `${selectedSecretGroupIds.length} secret group${selectedSecretGroupIds.length === 1 ? "" : "s"}`
      : null,
    selectedSecretIds.length > 0 ? `${selectedSecretIds.length} secret${selectedSecretIds.length === 1 ? "" : "s"}` : null,
    selectedSkillGroupIds.length > 0
      ? `${selectedSkillGroupIds.length} group${selectedSkillGroupIds.length === 1 ? "" : "s"}`
      : null,
    selectedSkillIds.length > 0 ? `${selectedSkillIds.length} skill${selectedSkillIds.length === 1 ? "" : "s"}` : null,
    selectedMcpServerIds.length > 0 ? `${selectedMcpServerIds.length} MCP${selectedMcpServerIds.length === 1 ? "" : "s"}` : null,
  ].filter((value): value is string => Boolean(value)).join(" • ");
  const selectedSecretOptions = useMemo(() => {
    return props.secretOptions
      .filter((secretOption) => selectedSecretIds.includes(secretOption.id))
      .map((secretOption) => ({
        description: secretOption.description,
        id: secretOption.id,
        label: secretOption.name,
        metaLabel: secretOption.envVarName,
      }));
  }, [props.secretOptions, selectedSecretIds]);
  const selectedSecretGroupOptions = useMemo(() => {
    return props.secretGroupOptions
      .filter((secretGroupOption) => selectedSecretGroupIds.includes(secretGroupOption.id))
      .map((secretGroupOption) => ({
        id: secretGroupOption.id,
        label: secretGroupOption.name,
      }));
  }, [props.secretGroupOptions, selectedSecretGroupIds]);
  const availableSecretGroupOptions = useMemo(() => {
    const attachedSecretGroupIds = new Set(selectedSecretGroupIds);
    return props.secretGroupOptions
      .filter((secretGroupOption) => !attachedSecretGroupIds.has(secretGroupOption.id))
      .map((secretGroupOption) => ({
        id: secretGroupOption.id,
        label: secretGroupOption.name,
      }));
  }, [props.secretGroupOptions, selectedSecretGroupIds]);
  const availableSecretOptions = useMemo(() => {
    const attachedSecretIds = new Set(selectedSecretIds);
    return props.secretOptions
      .filter((secretOption) => !attachedSecretIds.has(secretOption.id))
      .map((secretOption) => ({
        description: secretOption.description,
        id: secretOption.id,
        label: `${secretOption.name} (${secretOption.envVarName})`,
        metaLabel: secretOption.envVarName,
      }));
  }, [props.secretOptions, selectedSecretIds]);
  const selectedSkillGroupOptions = useMemo(() => {
    return props.skillGroupOptions
      .filter((skillGroupOption) => selectedSkillGroupIds.includes(skillGroupOption.id))
      .map((skillGroupOption) => ({
        id: skillGroupOption.id,
        label: skillGroupOption.name,
      }));
  }, [props.skillGroupOptions, selectedSkillGroupIds]);
  const availableSkillGroupOptions = useMemo(() => {
    const attachedSkillGroupIds = new Set(selectedSkillGroupIds);
    return props.skillGroupOptions
      .filter((skillGroupOption) => !attachedSkillGroupIds.has(skillGroupOption.id))
      .map((skillGroupOption) => ({
        id: skillGroupOption.id,
        label: skillGroupOption.name,
      }));
  }, [props.skillGroupOptions, selectedSkillGroupIds]);
  const selectedSkillOptions = useMemo(() => {
    return props.skillOptions
      .filter((skillOption) => selectedSkillIds.includes(skillOption.id))
      .map((skillOption) => ({
        description: skillOption.description,
        id: skillOption.id,
        label: skillOption.name,
      }));
  }, [props.skillOptions, selectedSkillIds]);
  const availableSkillOptions = useMemo(() => {
    const attachedSkillIds = new Set(selectedSkillIds);
    return props.skillOptions
      .filter((skillOption) => !attachedSkillIds.has(skillOption.id))
      .map((skillOption) => ({
        description: skillOption.description,
        id: skillOption.id,
        label: skillOption.name,
      }));
  }, [props.skillOptions, selectedSkillIds]);
  const selectedMcpServerOptions = useMemo(() => {
    return props.mcpServerOptions
      .filter((mcpServerOption) => selectedMcpServerIds.includes(mcpServerOption.id))
      .map((mcpServerOption) => ({
        description: mcpServerOption.description,
        id: mcpServerOption.id,
        label: mcpServerOption.name,
        metaLabel: (() => {
          try {
            return new URL(mcpServerOption.url).host;
          } catch {
            return mcpServerOption.url;
          }
        })(),
      }));
  }, [props.mcpServerOptions, selectedMcpServerIds]);
  const availableMcpServerOptions = useMemo(() => {
    const attachedMcpServerIds = new Set(selectedMcpServerIds);
    return props.mcpServerOptions
      .filter((mcpServerOption) => !attachedMcpServerIds.has(mcpServerOption.id))
      .map((mcpServerOption) => ({
        description: mcpServerOption.description,
        id: mcpServerOption.id,
        label: mcpServerOption.name,
        metaLabel: (() => {
          try {
            return new URL(mcpServerOption.url).host;
          } catch {
            return mcpServerOption.url;
          }
        })(),
      }));
  }, [props.mcpServerOptions, selectedMcpServerIds]);
  const isCreateDisabled = agentName.length === 0
    || computeProviderDefinitionId.length === 0
    || environmentTemplateId.length === 0
    || providerOptionId.length === 0
    || modelOptionId.length === 0
    || (isReasoningLevelRequired && reasoningLevel.length === 0);

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
                setComputeProviderDefinitionId(value ?? "");
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
                setProviderOptionId(value ?? "");
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
            <label className="text-xs font-medium text-foreground" htmlFor="agent-environment-template">
              Environment template
            </label>
            <Select
              items={(selectedComputeProviderDefinitionOption?.templates ?? []).map((templateOption) => ({
                label: templateOption.name,
                value: templateOption.templateId,
              }))}
              onValueChange={(value) => {
                setEnvironmentTemplateId(value ?? "");
              }}
              value={environmentTemplateId}
            >
              <SelectTrigger id="agent-environment-template">
                <SelectValue placeholder="Select an environment template" />
              </SelectTrigger>
              <SelectContent>
                {(selectedComputeProviderDefinitionOption?.templates ?? []).map((templateOption) => (
                  <SelectItem key={templateOption.templateId} value={templateOption.templateId}>
                    {templateOption.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEnvironmentTemplateOption ? (
              <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{selectedEnvironmentTemplateOption.name}</p>
                <p className="mt-1">
                  {selectedEnvironmentTemplateOption.cpuCount} vCPU • {selectedEnvironmentTemplateOption.memoryGb} GB RAM
                  • {selectedEnvironmentTemplateOption.diskSpaceGb} GB disk
                </p>
                <p className="mt-1">
                  Computer use: {selectedEnvironmentTemplateOption.computerUse ? "Enabled" : "Disabled"}
                </p>
              </div>
            ) : null}
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
                setModelOptionId(value ?? "");
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
                  setReasoningLevel(value ?? "");
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
                  Add default secrets, skill groups, skills, and MCP servers that should be stored on the agent.
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
                <DefaultAttachmentSection
                  addLabel="Add secret group"
                  availableEmptyLabel="All company secret groups already added"
                  availableOptions={availableSecretGroupOptions}
                  currentLabel="Current secret groups"
                  emptyStateLabel="No secret groups selected yet."
                  onAdd={(secretGroupId) => {
                    setSelectedSecretGroupIds((currentValue) => [...currentValue, secretGroupId]);
                  }}
                  onRemove={(secretGroupId) => {
                    setSelectedSecretGroupIds((currentValue) => currentValue.filter((value) => value !== secretGroupId));
                  }}
                  placeholder="Select a secret group"
                  selectedOptions={selectedSecretGroupOptions}
                />

                <DefaultAttachmentSection
                  addLabel="Add default secret"
                  availableEmptyLabel="All company secrets already added"
                  availableOptions={availableSecretOptions}
                  currentLabel="Current default secrets"
                  emptyStateLabel="No default secrets selected yet."
                  onAdd={(secretId) => {
                    setSelectedSecretIds((currentValue) => [...currentValue, secretId]);
                  }}
                  onRemove={(secretId) => {
                    setSelectedSecretIds((currentValue) => currentValue.filter((value) => value !== secretId));
                  }}
                  placeholder="Select a secret"
                  selectedOptions={selectedSecretOptions}
                />

                <DefaultAttachmentSection
                  addLabel="Add skill group"
                  availableEmptyLabel="All company skill groups already added"
                  availableOptions={availableSkillGroupOptions}
                  currentLabel="Current skill groups"
                  emptyStateLabel="No skill groups selected yet."
                  onAdd={(skillGroupId) => {
                    setSelectedSkillGroupIds((currentValue) => [...currentValue, skillGroupId]);
                  }}
                  onRemove={(skillGroupId) => {
                    setSelectedSkillGroupIds((currentValue) => currentValue.filter((value) => value !== skillGroupId));
                  }}
                  placeholder="Select a skill group"
                  selectedOptions={selectedSkillGroupOptions}
                />

                <DefaultAttachmentSection
                  addLabel="Add individual skill"
                  availableEmptyLabel="All company skills already added"
                  availableOptions={availableSkillOptions}
                  currentLabel="Current individual skills"
                  emptyStateLabel="No individual skills selected yet."
                  onAdd={(skillId) => {
                    setSelectedSkillIds((currentValue) => [...currentValue, skillId]);
                  }}
                  onRemove={(skillId) => {
                    setSelectedSkillIds((currentValue) => currentValue.filter((value) => value !== skillId));
                  }}
                  placeholder="Select a skill"
                  selectedOptions={selectedSkillOptions}
                />

                <DefaultAttachmentSection
                  addLabel="Add MCP server"
                  availableEmptyLabel="All company MCP servers already added"
                  availableOptions={availableMcpServerOptions}
                  currentLabel="Current MCP servers"
                  emptyStateLabel="No MCP servers selected yet."
                  onAdd={(mcpServerId) => {
                    setSelectedMcpServerIds((currentValue) => [...currentValue, mcpServerId]);
                  }}
                  onRemove={(mcpServerId) => {
                    setSelectedMcpServerIds((currentValue) => currentValue.filter((value) => value !== mcpServerId));
                  }}
                  placeholder="Select an MCP server"
                  selectedOptions={selectedMcpServerOptions}
                />
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
            data-primary-cta=""
            disabled={props.isSaving || isCreateDisabled}
            onClick={async () => {
              if (!selectedProviderOption || !selectedModelOption) {
                return;
              }

              await props.onCreate({
                defaultComputeProviderDefinitionId: computeProviderDefinitionId,
                defaultEnvironmentTemplateId: environmentTemplateId,
                modelProviderCredentialId: selectedProviderOption.modelProviderCredentialId,
                modelProviderCredentialModelId: selectedModelOption.modelProviderCredentialModelId,
                name: agentName,
                reasoningLevel: reasoningLevel.length === 0 ? undefined : reasoningLevel,
                secretGroupIds: selectedSecretGroupIds.length > 0 ? selectedSecretGroupIds : undefined,
                secretIds: selectedSecretIds.length > 0 ? selectedSecretIds : undefined,
                skillGroupIds: selectedSkillGroupIds.length > 0 ? selectedSkillGroupIds : undefined,
                skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
                mcpServerIds: selectedMcpServerIds.length > 0 ? selectedMcpServerIds : undefined,
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
