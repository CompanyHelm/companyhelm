/**
 * Persists the browser-local company selection that should be reopened when the user visits `/`.
 * The stored value is the stable organization id, while redirects are resolved through current
 * memberships so renamed slugs keep working and stale access is ignored.
 */
export class SelectedOrganizationStorage {
  static readonly STORAGE_KEY = "companyhelm-selected-organization-id";

  static readOrganizationId(storage?: Pick<Storage, "getItem">): string | null {
    const sourceStorage = storage ?? SelectedOrganizationStorage.resolveStorage();
    if (!sourceStorage) {
      return null;
    }

    try {
      const storedOrganizationId = sourceStorage.getItem(SelectedOrganizationStorage.STORAGE_KEY);
      if (!storedOrganizationId || storedOrganizationId.length === 0) {
        return null;
      }

      return storedOrganizationId;
    } catch {
      return null;
    }
  }

  static writeOrganizationId(organizationId: string, storage?: Pick<Storage, "setItem">): void {
    if (organizationId.length === 0) {
      return;
    }

    const targetStorage = storage ?? SelectedOrganizationStorage.resolveStorage();
    if (!targetStorage) {
      return;
    }

    try {
      targetStorage.setItem(SelectedOrganizationStorage.STORAGE_KEY, organizationId);
    } catch {
      return;
    }
  }

  private static resolveStorage(): Storage | undefined {
    if (typeof window === "undefined") {
      return undefined;
    }

    return window.localStorage;
  }
}
