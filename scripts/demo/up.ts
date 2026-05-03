import { pathToFileURL } from "node:url";
import { LocalRunner } from "../local/runner.ts";

/**
 * Starts the localhost demo profile and waits for the local stack to become demo-ready before
 * handing control back to the operator. This keeps demos on the real app while surfacing setup
 * failures before someone starts recording or driving the UI.
 */
export class DemoUpScript {
  async run(): Promise<void> {
    await new LocalRunner({
      apiPublicUrl: "http://localhost:4000",
      mode: "dev",
      verifyReadiness: true,
      webPublicUrl: "http://localhost:5173",
    }).run();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  new DemoUpScript().run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Failed to run scripts/demo/up.ts.";
    console.error(message);
    process.exit(1);
  });
}
