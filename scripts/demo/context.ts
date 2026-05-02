/**
 * Centralizes the stable demo URLs and seeded organization defaults that local demo scripts share.
 * Scripts can compose arbitrary scenarios without hardcoding localhost strings everywhere, which
 * keeps per-task demo files small while still letting operators override the target URLs.
 */
export class DemoContext {
  private static readonly DEFAULT_API_URL = "http://localhost:4000";
  private static readonly DEFAULT_ORGANIZATION_SLUG = "companyhelm-local";
  private static readonly DEFAULT_WEB_URL = "http://localhost:5173";

  apiUrl(): string {
    return this.readUrl("DEMO_API_URL", DemoContext.DEFAULT_API_URL);
  }

  organizationPath(path: string): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `/orgs/${this.organizationSlug()}${normalizedPath}`;
  }

  organizationSlug(): string {
    return process.env.DEMO_ORGANIZATION_SLUG || DemoContext.DEFAULT_ORGANIZATION_SLUG;
  }

  resolveWebUrl(path = "/"): string {
    return new URL(path, `${this.webUrl()}/`).toString();
  }

  webUrl(): string {
    return this.readUrl("DEMO_WEB_URL", DemoContext.DEFAULT_WEB_URL);
  }

  private readUrl(variableName: string, fallback: string): string {
    const value = process.env[variableName];
    return value && value.length > 0 ? value.replace(/\/+$/, "") : fallback;
  }
}
