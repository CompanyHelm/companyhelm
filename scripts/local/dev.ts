import { LocalRunner } from "./runner.ts";

/**
 * Starts the localhost development profile with dev auth and deterministic seed data.
 */
export class LocalDevScript {
  async run(): Promise<void> {
    await new LocalRunner({
      apiPublicUrl: "http://localhost:4000",
      mode: "dev",
      webPublicUrl: "http://localhost:5173",
    }).run();
  }
}

new LocalDevScript().run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : `Failed to run scripts/local/dev.ts.`;
  console.error(message);
  process.exit(1);
});
