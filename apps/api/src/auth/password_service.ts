import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Provides the only password operations the API needs: validation, hashing, and verification.
 */
export class PasswordService {
  static readonly PASSWORD_MIN_LENGTH = 6;

  static validatePasswordPolicy(rawPassword: string): string {
    const password = PasswordService.normalizePassword(rawPassword);
    if (password.length < PasswordService.PASSWORD_MIN_LENGTH) {
      throw new Error(`Password must be at least ${PasswordService.PASSWORD_MIN_LENGTH} characters long.`);
    }
    if (!/[0-9]/.test(password)) {
      throw new Error("Password must include at least one number.");
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new Error("Password must include at least one special symbol.");
    }
    return password;
  }

  static createPasswordHash(rawPassword: string): {
    passwordSalt: string;
    passwordHash: string;
  } {
    const password = PasswordService.validatePasswordPolicy(rawPassword);
    const passwordSalt = randomBytes(16).toString("hex");
    const passwordHash = scryptSync(password, passwordSalt, 64).toString("hex");
    return {
      passwordSalt,
      passwordHash,
    };
  }

  static verifyPasswordHash(params: {
    rawPassword: string;
    passwordSalt: string;
    passwordHash: string;
  }): boolean {
    const password = PasswordService.normalizePassword(params.rawPassword);
    const expectedHashBuffer = Buffer.from(String(params.passwordHash || "").trim(), "hex");
    const computedHashBuffer = scryptSync(password, String(params.passwordSalt || "").trim(), 64);
    if (expectedHashBuffer.length !== computedHashBuffer.length) {
      return false;
    }
    return timingSafeEqual(expectedHashBuffer, computedHashBuffer);
  }

  private static normalizePassword(rawPassword: string): string {
    return String(rawPassword || "");
  }
}
