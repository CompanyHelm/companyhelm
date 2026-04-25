import { LocalRunner } from "./runner.ts";

/**
 * Starts the E2B-forwarded development profile after the caller injects the public API and web
 * origins returned by the port forwarding tools.
 */
export class LocalE2bScript {
  async run(): Promise<void> {
    await new LocalRunner({
      apiPublicUrl: this.readRequiredUrl("COMPANYHELM_API_PUBLIC_URL"),
      mode: "e2b",
      webPublicUrl: this.readRequiredUrl("COMPANYHELM_WEB_PUBLIC_URL"),
    }).run();
  }

  private readRequiredUrl(variableName: string): string {
    const value = process.env[variableName];
    if (!value) {
      throw new Error(`${variableName} is required for npm run local-e2b.`);
    }

    return value.replace(/\/+$/, "");
  }
}

new LocalE2bScript().run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : `Failed to run scripts/local/e2b.ts.`;
  console.error(message);
  process.exit(1);
});
