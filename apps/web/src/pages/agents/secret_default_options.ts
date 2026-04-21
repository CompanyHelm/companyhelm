export type SecretDefaultOptionRecord = {
  description?: string | null;
  envVarName: string;
  id: string;
  name: string;
  secretGroupId?: string | null;
};

/**
 * Applies the shared availability rules for agent default secret selectors. Direct defaults and
 * group defaults feed the same future-session environment, so grouped secrets are hidden from the
 * individual picker instead of being offered as duplicate direct attachments.
 */
export class SecretDefaultOptions {
  filterAvailableSecrets<SecretRecord extends SecretDefaultOptionRecord>(
    secrets: ReadonlyArray<SecretRecord>,
    attachedSecretIds: ReadonlySet<string>,
    attachedSecretGroupIds: ReadonlySet<string>,
  ): SecretRecord[] {
    return secrets.filter((secret) => {
      const isIncludedByAttachedGroup = this.isSecretIncludedByAttachedGroup(secret, attachedSecretGroupIds);
      return !attachedSecretIds.has(secret.id) && !isIncludedByAttachedGroup;
    });
  }

  private isSecretIncludedByAttachedGroup(
    secret: SecretDefaultOptionRecord,
    attachedSecretGroupIds: ReadonlySet<string>,
  ): boolean {
    return secret.secretGroupId ? attachedSecretGroupIds.has(secret.secretGroupId) : false;
  }
}
