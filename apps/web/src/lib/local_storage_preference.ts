/**
 * Centralizes small browser-local UI preferences so components can persist chrome state without
 * duplicating localStorage guards or accepting malformed persisted values.
 */
export class LocalStoragePreference {
  static readBoolean(storageKey: string, defaultValue: boolean, storage?: Pick<Storage, "getItem">): boolean {
    const sourceStorage = storage ?? this.resolveStorage();
    if (!sourceStorage) {
      return defaultValue;
    }

    try {
      const storedValue = sourceStorage.getItem(storageKey);
      if (storedValue === "true") {
        return true;
      }
      if (storedValue === "false") {
        return false;
      }
    } catch {
      return defaultValue;
    }

    return defaultValue;
  }

  static writeBoolean(storageKey: string, value: boolean, storage?: Pick<Storage, "setItem">): void {
    const targetStorage = storage ?? this.resolveStorage();
    if (!targetStorage) {
      return;
    }

    try {
      targetStorage.setItem(storageKey, value ? "true" : "false");
    } catch {
      return;
    }
  }

  static readBooleanRecord(storageKey: string, storage?: Pick<Storage, "getItem">): Record<string, boolean> {
    const sourceStorage = storage ?? this.resolveStorage();
    if (!sourceStorage) {
      return {};
    }

    try {
      const storedValue = sourceStorage.getItem(storageKey);
      if (!storedValue) {
        return {};
      }

      const parsedValue = JSON.parse(storedValue) as unknown;
      if (typeof parsedValue !== "object" || parsedValue === null || Array.isArray(parsedValue)) {
        return {};
      }

      const storedRecord = parsedValue as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(storedRecord).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
      );
    } catch {
      return {};
    }
  }

  static writeBooleanRecord(storageKey: string, value: Readonly<Record<string, boolean>>, storage?: Pick<Storage, "setItem">): void {
    const targetStorage = storage ?? this.resolveStorage();
    if (!targetStorage) {
      return;
    }

    try {
      targetStorage.setItem(storageKey, JSON.stringify(value));
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
