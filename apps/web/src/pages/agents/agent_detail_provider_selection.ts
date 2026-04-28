import type { AgentCreateProviderOption } from "./create_agent_dialog";

export type AgentDetailProviderFieldOption = {
  label: string;
  value: string;
};

/**
 * Keeps the agent detail provider select aligned with Relay-safe option ids so platform virtual
 * providers and user-provided credentials can share the same control.
 */
export class AgentDetailProviderSelection {
  static toFieldOptions(providerOptions: AgentCreateProviderOption[]): AgentDetailProviderFieldOption[] {
    return providerOptions.map((option) => ({
      label: option.label,
      value: option.id,
    }));
  }

  static resolveFieldValue(providerOption: AgentCreateProviderOption | null): string {
    return providerOption?.id ?? "";
  }
}
