import { DemoContext } from "./context.ts";
import { DemoPlaywrightCli } from "./playwright_cli.ts";

/**
 * Provides CompanyHelm-specific browser building blocks on top of the raw Playwright CLI wrapper.
 * Demo scenarios can share dev-auth sign-in and organization navigation without hardcoding seeded
 * user details or auth-route quirks into each task-specific script.
 */
export class DemoCompanyHelmPlaywright {
  private static readonly DEV_AUTH_STORAGE_KEY = "companyhelm.dev-auth.selection";
  private readonly context: DemoContext;
  private readonly playwright: DemoPlaywrightCli;

  constructor(
    context: DemoContext = new DemoContext(),
    playwright: DemoPlaywrightCli = new DemoPlaywrightCli(),
  ) {
    this.context = context;
    this.playwright = playwright;
  }

  async openOrganizationPath(path: string): Promise<void> {
    await this.signInSeededUser();
    await this.playwright.goto(this.context.resolveWebUrl(this.context.organizationPath(path)));
    await this.playwright.waitForUrlFragment(this.context.organizationPath(path));
  }

  async signInSeededUser(email = "andrea.local@companyhelm.dev"): Promise<void> {
    const session = await this.loadSeededSession(email);
    await this.playwright.open(this.context.resolveWebUrl("/sign-in"));
    await this.playwright.runCode(`async page => {
  await page.evaluate((selection) => {
    window.localStorage.setItem(${JSON.stringify(DemoCompanyHelmPlaywright.DEV_AUTH_STORAGE_KEY)}, JSON.stringify(selection));
  }, { companyId: ${JSON.stringify(session.companyId)}, userId: ${JSON.stringify(session.userId)} });
}`);
  }

  private async loadSeededSession(email: string): Promise<{ companyId: string; userId: string }> {
    const url = new URL(`${this.context.apiUrl()}/auth/dev/user`);
    url.searchParams.set("email", email);
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to load seeded dev auth user for ${email}.`);
    }

    const payload = await response.json() as {
      companies?: Array<{
        id: string;
        slug: string;
      }>;
      user?: {
        id: string;
      };
    };
    const userId = payload.user?.id;
    const company = payload.companies?.find((entry) => entry.slug === this.context.organizationSlug()) ?? payload.companies?.[0];
    if (!userId || !company?.id) {
      throw new Error(`Seeded dev auth user ${email} is missing a company assignment.`);
    }

    return {
      companyId: company.id,
      userId,
    };
  }
}
