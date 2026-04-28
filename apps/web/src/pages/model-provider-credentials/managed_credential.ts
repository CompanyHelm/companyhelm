export const MANAGED_MODEL_PROVIDER_CREDENTIAL_ID = "managed";

export function isManagedModelProviderCredentialId(credentialId: string): boolean {
  return credentialId === MANAGED_MODEL_PROVIDER_CREDENTIAL_ID;
}
