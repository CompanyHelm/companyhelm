/**
 * Resolves the browser runtime configuration from Vite environment variables.
 */
export class Config {
  static getDocument() {
    return {
      clerkPublishableKey: Config.resolveStringValue(
        import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
        "",
      ),
    };
  }

  private static resolveStringValue(value: unknown, fallbackValue: string): string {
    const normalizedValue = String(value || "").trim();
    return normalizedValue || fallbackValue;
  }
}

export type ConfigDocument = ReturnType<typeof Config.getDocument>;

export const config: ConfigDocument = Config.getDocument();
