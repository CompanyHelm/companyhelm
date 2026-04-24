export type DevAuthSelectionDocument = {
  companyId: string | null;
  userId: string | null;
};

/**
 * Owns the browser-persisted dev auth selection so the UI can remember the chosen user and
 * company without cookies, JWTs, or server-side session state.
 */
export class DevAuthSelectionStorage {
  private static readonly STORAGE_KEY = "companyhelm.dev-auth.selection";

  clear(): void {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(DevAuthSelectionStorage.STORAGE_KEY);
  }

  read(): DevAuthSelectionDocument {
    if (typeof window === "undefined") {
      return {
        companyId: null,
        userId: null,
      };
    }

    const rawValue = window.localStorage.getItem(DevAuthSelectionStorage.STORAGE_KEY);
    if (!rawValue) {
      return {
        companyId: null,
        userId: null,
      };
    }

    try {
      const parsedValue = JSON.parse(rawValue) as {
        companyId?: unknown;
        userId?: unknown;
      };

      return {
        companyId: typeof parsedValue.companyId === "string" && parsedValue.companyId.trim().length > 0
          ? parsedValue.companyId.trim()
          : null,
        userId: typeof parsedValue.userId === "string" && parsedValue.userId.trim().length > 0
          ? parsedValue.userId.trim()
          : null,
      };
    } catch {
      this.clear();

      return {
        companyId: null,
        userId: null,
      };
    }
  }

  selectCompany(input: {
    companyId: string;
    userId: string;
  }): void {
    this.write({
      companyId: input.companyId,
      userId: input.userId,
    });
  }

  selectUser(input: {
    userId: string;
  }): void {
    this.write({
      companyId: null,
      userId: input.userId,
    });
  }

  private write(selection: DevAuthSelectionDocument): void {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      DevAuthSelectionStorage.STORAGE_KEY,
      JSON.stringify(selection),
    );
  }
}
