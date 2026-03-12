import { randomBytes, randomUUID, scryptSync } from "node:crypto";

export function randomSecret(length = 24): string {
  return randomBytes(length).toString("base64url");
}

export function randomCompanyId(): string {
  return randomUUID();
}

export function createPasswordHash(password: string): { passwordSalt: string; passwordHash: string } {
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, passwordSalt, 64).toString("hex");
  return {
    passwordSalt,
    passwordHash
  };
}
