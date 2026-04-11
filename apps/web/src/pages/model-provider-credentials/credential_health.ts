type CredentialHealthRecord = {
  errorMessage: string | null;
  status: string;
  type: string;
};

const DEFAULT_REFRESH_FAILURE_REASON = "Automatic token refresh failed for this subscription credential.";
const REFRESH_FAILURE_RECOVERY = "Create a new subscription credential and set it as default to restore model access.";

export function hasCredentialRefreshFailure(credential: CredentialHealthRecord): boolean {
  return credential.type === "oauth_token" && credential.status === "error";
}

export function getCredentialRefreshFailureReason(errorMessage: string | null | undefined): string {
  const normalizedMessage = String(errorMessage || "").trim();
  if (normalizedMessage) {
    return normalizedMessage;
  }

  return DEFAULT_REFRESH_FAILURE_REASON;
}

export function getCredentialRefreshFailureRecoveryMessage(): string {
  return REFRESH_FAILURE_RECOVERY;
}
