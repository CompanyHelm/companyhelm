import { config } from "../config";

export interface AuthenticatedUserDocument {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
}

export interface AuthSessionDocument {
  token: string;
  user: AuthenticatedUserDocument | null;
}

export type AuthSessionListener = () => void;

export class AuthSessionStore {
  private readonly listeners: Set<AuthSessionListener>;

  constructor() {
    this.listeners = new Set<AuthSessionListener>();
  }

  getSession(): AuthSessionDocument | null {
    const token = this.getStoredValue(config.tokenStorageKey);
    if (!token) {
      return null;
    }

    return {
      token,
      user: this.getStoredUser(),
    };
  }

  hasSession(): boolean {
    return Boolean(this.getSession());
  }

  setSession(session: AuthSessionDocument): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    storage.setItem(config.tokenStorageKey, String(session.token || "").trim());
    if (session.user) {
      storage.setItem(config.userStorageKey, JSON.stringify(session.user));
    } else {
      storage.removeItem(config.userStorageKey);
    }
    this.emit();
  }

  clearSession(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    storage.removeItem(config.tokenStorageKey);
    storage.removeItem(config.userStorageKey);
    this.emit();
  }

  subscribe(listener: AuthSessionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private getStoredUser(): AuthenticatedUserDocument | null {
    const rawValue = this.getStoredValue(config.userStorageKey);
    if (!rawValue) {
      return null;
    }

    try {
      const parsedValue = JSON.parse(rawValue) as Partial<AuthenticatedUserDocument>;
      return {
        id: String(parsedValue.id || "").trim(),
        email: String(parsedValue.email || "").trim(),
        firstName: String(parsedValue.firstName || "").trim(),
        lastName: String(parsedValue.lastName || "").trim() || null,
      };
    } catch {
      return null;
    }
  }

  private getStoredValue(storageKey: string): string {
    const storage = this.getStorage();
    if (!storage) {
      return "";
    }

    return String(storage.getItem(storageKey) || "").trim();
  }

  private getStorage(): Storage | null {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage;
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const authSessionStore = new AuthSessionStore();
