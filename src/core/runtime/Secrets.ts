import { randomBytes, randomUUID } from "node:crypto";

export function randomSecret(length = 24): string {
  return randomBytes(length).toString("base64url");
}

export function randomCompanyId(): string {
  return randomUUID();
}
