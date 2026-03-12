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

    return template
      .replaceAll("{{COMPANY_ID}}", input.companyId)
      .replaceAll("{{COMPANY_NAME}}", input.companyName)
      .replaceAll("{{USER_ID}}", `${input.companyId}-admin`)
      .replaceAll("{{USER_AUTH_ID}}", `${input.companyId}-auth`)
      .replaceAll("{{USER_FIRST_NAME}}", input.username)
      .replaceAll("{{USER_EMAIL}}", email)
      .replaceAll("{{PASSWORD_SALT}}", input.passwordSalt ?? "password-salt")
      .replaceAll("{{PASSWORD_HASH}}", input.passwordHash)
      .replaceAll("{{RUNNER_ID}}", `${input.companyId}-runner`)
      .replaceAll("{{RUNNER_NAME}}", input.runnerName)
      .replaceAll("{{RUNNER_SECRET_HASH}}", runnerSecretHash);
  }
}
