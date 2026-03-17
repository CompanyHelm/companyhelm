import net from "node:net";

import type { PreflightCheck } from "./PreflightCheck.js";

export class PortAvailabilityPreflightCheck implements PreflightCheck {
  public constructor(
    private readonly serviceName: string,
    private readonly port: number
  ) {}

  public async run(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const server = net.createServer();

      server.once("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          reject(new Error(`${this.serviceName} cannot start because port ${this.port} is already in use.`));
          return;
        }

        reject(new Error(`${this.serviceName} cannot verify port ${this.port}: ${error.message}`));
      });

      server.once("listening", () => {
        server.close((closeError) => {
          if (closeError) {
            reject(closeError);
            return;
          }

          resolve();
        });
      });

      server.listen(this.port, "0.0.0.0");
    });
  }
}
