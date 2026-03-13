export interface GithubAppConfig {
  appUrl: string;
  appClientId: string;
  appPrivateKeyPem: string;
}

function normalizeRequiredValue(value: string, fieldName: string): string {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`GitHub App config field "${fieldName}" is required.`);
  }
  return normalized;
}

export function normalizeGithubAppConfig(config: GithubAppConfig): GithubAppConfig {
  const appUrl = normalizeRequiredValue(config.appUrl, "appUrl");
  try {
    new URL(appUrl);
  } catch {
    throw new Error(`GitHub App config field "appUrl" must be a valid URL.`);
  }

  const appClientId = normalizeRequiredValue(config.appClientId, "appClientId");
  const rawPem = String(config.appPrivateKeyPem || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!rawPem) {
    throw new Error('GitHub App config field "appPrivateKeyPem" is required.');
  }

  return {
    appUrl,
    appClientId,
    appPrivateKeyPem: `${rawPem}\n`,
  };
}
