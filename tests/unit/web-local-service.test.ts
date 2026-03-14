import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test, vi } from "vitest";

import { WebLocalService } from "../../src/core/local/WebLocalService.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("starts companyhelm-web on the requested port", async () => {
  const repoPath = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-web-local-"));
  const logPath = path.join(repoPath, "companyhelm-web.log");
  fs.mkdirSync(path.join(repoPath, "node_modules"), { recursive: true });

  const processManager = {
    start: vi.fn().mockReturnValue({
      source: "local",
      repoPath,
      logPath,
      pid: 4242
    }),
    isRunning: vi.fn().mockReturnValue(true)
  };
  const commandRunner = {
    run: vi.fn().mockResolvedValue(undefined)
  };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

  const service = new WebLocalService(processManager as never, commandRunner as never);

  await expect(service.start({
    repoPath,
    configPath: "/tmp/companyhelm/frontend-config.yaml",
    url: "http://127.0.0.1:4173",
    uiPort: 4173,
    logPath,
    logLevel: "debug"
  })).resolves.toEqual({
    source: "local",
    repoPath,
    logPath,
    pid: 4242
  });

  expect(commandRunner.run).toHaveBeenCalledWith(
    "npm",
    ["run", "config:generate", "--", "--config-path", "/tmp/companyhelm/frontend-config.yaml"],
    repoPath,
    {
      APP_ENV: "local"
    }
  );
  expect(processManager.start).toHaveBeenCalledWith(expect.objectContaining({
    serviceName: "companyhelm-web",
    args: expect.arrayContaining(["--port", "4173"])
  }));
});

test("fails fast with a clear message when the requested port is already in use", async () => {
  const repoPath = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-web-port-"));
  const logPath = path.join(repoPath, "companyhelm-web.log");
  fs.mkdirSync(path.join(repoPath, "node_modules"), { recursive: true });

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

  const processManager = {
    start: vi.fn(),
    isRunning: vi.fn().mockReturnValue(true)
  };
  const commandRunner = {
    run: vi.fn().mockResolvedValue(undefined)
  };
  const service = new WebLocalService(processManager as never, commandRunner as never);

  await expect(service.start({
    repoPath,
    configPath: "/tmp/companyhelm/frontend-config.yaml",
    url: `http://127.0.0.1:${occupiedPort}`,
    uiPort: occupiedPort,
    logPath,
    logLevel: "debug"
  })).rejects.toThrow(`companyhelm-web cannot start because port ${occupiedPort} is already in use.`);

  expect(commandRunner.run).not.toHaveBeenCalled();
  expect(processManager.start).not.toHaveBeenCalled();

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

test("includes the startup log tail when companyhelm-web exits early", async () => {
  const repoPath = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-web-log-"));
  const logPath = path.join(repoPath, "companyhelm-web.log");
  fs.writeFileSync(logPath, [
    "[companyhelm] starting companyhelm-web",
    "Port 4173 is already in use",
    "error when starting dev server:"
  ].join("\n"), "utf8");

  const service = new WebLocalService(
    {
      isRunning: vi.fn().mockReturnValue(false)
    } as never,
    {} as never
  );

  await expect(
    (service as WebLocalService & {
      waitForReadiness: (url: string, runtime: { source: "local"; repoPath: string; logPath: string; pid: number }) => Promise<void>;
    }).waitForReadiness("http://127.0.0.1:4173", {
      source: "local",
      repoPath,
      logPath,
      pid: 4242
    })
  ).rejects.toThrow(
    /companyhelm-web exited before becoming ready\.\nStartup log:\n\[companyhelm\] starting companyhelm-web\nPort 4173 is already in use\nerror when starting dev server:/
  );
});
