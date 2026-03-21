import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const PASSWORD_MIN_LENGTH = 6;

function normalizePassword(rawPassword: string): string {
  return String(rawPassword || "");
}

export function validatePasswordPolicy(rawPassword: string): string {
  const password = normalizePassword(rawPassword);
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`);
  }
  if (!/[0-9]/.test(password)) {
    throw new Error("Password must include at least one number.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error("Password must include at least one special symbol.");
  }
  return password;
}

export function createPasswordHash(rawPassword: string): {
  passwordSalt: string;
  passwordHash: string;
} {
  const password = validatePasswordPolicy(rawPassword);
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, passwordSalt, 64).toString("hex");
  return {
    passwordSalt,
    passwordHash,
  };
}

export function verifyPasswordHash(params: {
  rawPassword: string;
  passwordSalt: string;
  passwordHash: string;
}): boolean {
  const password = normalizePassword(params.rawPassword);
  const expectedHashBuffer = Buffer.from(String(params.passwordHash || "").trim(), "hex");
  const computedHashBuffer = scryptSync(password, String(params.passwordSalt || "").trim(), 64);
  if (expectedHashBuffer.length !== computedHashBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedHashBuffer, computedHashBuffer);
}
