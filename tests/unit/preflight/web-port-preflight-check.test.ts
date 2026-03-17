import net from "node:net";

import { expect, test } from "vitest";

import { WebPortPreflightCheck } from "../../../src/preflight/WebPortPreflightCheck.js";

test("fails when the web port is already occupied", async () => {
  const server = net.createServer();
  const occupiedPort = await new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "0.0.0.0", () => {
      const address = server.address();
      if (typeof address === "object" && address?.port) {
        resolve(address.port);
        return;
      }

      reject(new Error("Failed to allocate a test port."));
    });
  });

  await expect(new WebPortPreflightCheck(occupiedPort).run()).rejects.toThrow(
    `companyhelm-web cannot start because port ${occupiedPort} is already in use.`
  );

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});
