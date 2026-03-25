import { useEffect, useMemo, useState } from "react";
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
  label: string;
  modelProvider: string;
  models: Array<{
    id: string;
    modelId: string;
    name: string;
    reasoningLevels: string[];
  }>;
};

interface CreateAgentDialogProps {
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  providerOptions: AgentCreateProviderOption[];
  onCreate(input: {
    modelProviderCredentialId: string;
    modelProviderCredentialModelId: string;
    name: string;
    reasoningLevel?: string;
    systemPrompt?: string;
  }): Promise<void>;
  onOpenChange(open: boolean): void;
}

/**
 * Collects the minimum agent configuration needed to persist an agent with a provider-backed
 * default model, optional reasoning level, and optional system prompt.
 */
export function CreateAgentDialog(props: CreateAgentDialogProps) {
  const [agentName, setAgentName] = useState("");
  const [providerOptionId, setProviderOptionId] = useState("");
  const [modelOptionId, setModelOptionId] = useState("");
  const [reasoningLevel, setReasoningLevel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const selectedProviderOption = useMemo(() => {
    return props.providerOptions.find((providerOption) => providerOption.id === providerOptionId);
  }, [props.providerOptions, providerOptionId]);
  const selectedModelOption = useMemo(() => {
    return selectedProviderOption?.models.find((modelOption) => modelOption.id === modelOptionId);
  }, [modelOptionId, selectedProviderOption]);
  const selectedReasoningLevels = selectedModelOption?.reasoningLevels ?? [];

  useEffect(() => {
    if (!props.isOpen) {
      setAgentName("");
      setProviderOptionId("");
      setModelOptionId("");
      setReasoningLevel("");
      setSystemPrompt("");
    }
  }, [props.isOpen]);

  useEffect(() => {
    if (selectedProviderOption?.models.some((modelOption) => modelOption.id === modelOptionId)) {
      return;
    }

    setModelOptionId("");
    setReasoningLevel("");
  }, [modelOptionId, selectedProviderOption]);

  useEffect(() => {
    if (selectedReasoningLevels.length === 0) {
      setReasoningLevel("");
      return;
    }

    if (!selectedReasoningLevels.includes(reasoningLevel)) {
      setReasoningLevel(selectedReasoningLevels[0] ?? "");
    }
  }, [reasoningLevel, selectedReasoningLevels]);

  const isReasoningLevelRequired = selectedReasoningLevels.length > 0;
  const isCreateDisabled = agentName.length === 0
    || providerOptionId.length === 0
    || modelOptionId.length === 0
    || (isReasoningLevelRequired && reasoningLevel.length === 0);

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create agent</DialogTitle>
          <DialogDescription>
            Set a default provider, model, reasoning level, and system prompt for this agent.
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
            <label className="text-xs font-medium text-foreground" htmlFor="agent-provider">
              Provider
            </label>
            <Select
              items={props.providerOptions.map((providerOption) => ({
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
                {props.providerOptions.map((providerOption) => (
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
              items={(selectedProviderOption?.models ?? []).map((modelOption) => ({
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
                {(selectedProviderOption?.models ?? []).map((modelOption) => (
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
              System prompt
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
                modelProviderCredentialId: providerOptionId,
                modelProviderCredentialModelId: modelOptionId,
                name: agentName,
                reasoningLevel: reasoningLevel.length === 0 ? undefined : reasoningLevel,
                systemPrompt,
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
