import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { injectable } from "inversify";

const scryptAsync = promisify(scrypt);

type PasswordHashRecord = {
  passwordHash: string;
  passwordSalt: string;
};

/**
 * Owns the salted password hashing used by the local auth provider so credential storage stays
 * isolated from request handlers and can evolve without touching route code.
 */
@injectable()
export class LocalAuthPasswordService {
  private static readonly KEY_LENGTH = 64;

  async createPasswordHash(password: string, pepper: string): Promise<PasswordHashRecord> {
    const passwordSalt = randomBytes(16).toString("hex");
    const passwordHash = await scryptAsync(
      `${password}${pepper}`,
      passwordSalt,
      LocalAuthPasswordService.KEY_LENGTH,
    ) as Buffer;

    return {
      passwordHash: passwordHash.toString("base64url"),
      passwordSalt,
    };
  }

  async verifyPassword(input: {
    password: string;
    passwordHash: string;
    passwordSalt: string;
    pepper: string;
  }): Promise<boolean> {
    const derivedHash = await scryptAsync(
      `${input.password}${input.pepper}`,
      input.passwordSalt,
      LocalAuthPasswordService.KEY_LENGTH,
    ) as Buffer;
    const expectedHash = Buffer.from(input.passwordHash, "base64url");

    if (expectedHash.length !== derivedHash.length) {
      return false;
    }

    return timingSafeEqual(expectedHash, derivedHash);
  }
}
