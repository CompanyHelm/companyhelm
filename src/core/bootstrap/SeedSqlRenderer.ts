import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface SeedSqlInput {
  companyId: string;
  companyName: string;
  username: string;
  passwordHash: string;
  passwordSalt?: string;
  runnerName: string;
  runnerSecret: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SeedSqlRenderer {
  public render(input: SeedSqlInput): string {
    const templatePath = path.resolve(__dirname, "../../templates/seed.sql.tpl");
    const template = fs.readFileSync(templatePath, "utf8");
    const email = `${input.username}@local.companyhelm`;
    const runnerSecretHash = createHash("sha256").update(input.runnerSecret).digest("hex");
    const userId = deriveUuid(input.companyId, "user");
    const userAuthId = deriveUuid(input.companyId, "user-auth");
    const runnerId = deriveUuid(input.companyId, "runner");

    return template
      .replaceAll("{{COMPANY_ID}}", input.companyId)
      .replaceAll("{{COMPANY_NAME}}", input.companyName)
      .replaceAll("{{USER_ID}}", userId)
      .replaceAll("{{USER_AUTH_ID}}", userAuthId)
      .replaceAll("{{USER_FIRST_NAME}}", input.username)
      .replaceAll("{{USER_EMAIL}}", email)
      .replaceAll("{{PASSWORD_SALT}}", input.passwordSalt ?? "password-salt")
      .replaceAll("{{PASSWORD_HASH}}", input.passwordHash)
      .replaceAll("{{RUNNER_ID}}", runnerId)
      .replaceAll("{{RUNNER_NAME}}", input.runnerName)
      .replaceAll("{{RUNNER_SECRET_HASH}}", runnerSecretHash);
  }
}

function deriveUuid(companyId: string, scope: string): string {
  const hex = createHash("sha256").update(`${companyId}:${scope}`).digest("hex");
  const chars = hex.slice(0, 32).split("");
  chars[12] = "4";
  chars[16] = ((Number.parseInt(chars[16] ?? "0", 16) & 0x3) | 0x8).toString(16);
  const normalized = chars.join("");
  return [
    normalized.slice(0, 8),
    normalized.slice(8, 12),
    normalized.slice(12, 16),
    normalized.slice(16, 20),
    normalized.slice(20, 32)
  ].join("-");
}
