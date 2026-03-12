import { generateKeyPairSync, randomBytes, randomUUID, scryptSync } from "node:crypto";

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

export function createPemKeyPair(): { privateKeyPem: string; publicKeyPem: string } {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { format: "pem", type: "pkcs1" },
    publicKeyEncoding: { format: "pem", type: "pkcs1" }
  });

  return {
    privateKeyPem: privateKey,
    publicKeyPem: publicKey
  };
}
