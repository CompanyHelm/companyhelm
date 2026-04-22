import type { AgentCreateProviderOption } from "./create_agent_dialog";

export type AgentDetailProviderFieldOption = {
  label: string;
  value: string;
};

/**
 * Keeps the agent detail provider select aligned with the persisted credential ids expected by
 * UpdateAgent while the GraphQL create-option records keep separate Relay-safe projection ids.
 */
export class AgentDetailProviderSelection {
  static toFieldOptions(providerOptions: AgentCreateProviderOption[]): AgentDetailProviderFieldOption[] {
    return providerOptions.map((option) => ({
      label: option.label,
      value: option.modelProviderCredentialId,
    }));
  }

  static resolveFieldValue(providerOption: AgentCreateProviderOption | null): string {
    return providerOption?.modelProviderCredentialId ?? "";
  }
}
