import os from "node:os";
import path from "node:path";

function defaultCliBaseRoot(): string {
  return path.join(os.homedir(), ".companyhelm", "cli");
}

export function defaultCliRoot(): string {
  const explicitRoot = String(process.env.COMPANYHELM_HOME || "").trim();
  if (explicitRoot) {
    return path.resolve(explicitRoot);
  }

  return path.join(defaultCliBaseRoot(), "runtime");
}

export function defaultCliConfigRoot(): string {
  const explicitRoot = String(process.env.COMPANYHELM_CONFIG_HOME || "").trim();
  if (explicitRoot) {
    return path.resolve(explicitRoot);
  }

  const explicitRuntimeRoot = String(process.env.COMPANYHELM_HOME || "").trim();
  if (explicitRuntimeRoot) {
    return path.resolve(explicitRuntimeRoot);
  }

  return defaultCliBaseRoot();
}
