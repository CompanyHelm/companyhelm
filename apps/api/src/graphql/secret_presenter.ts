import type { SecretGroupRecord, SecretRecord } from "../services/secrets/service.ts";

export type GraphqlSecretRecord = {
  companyId: string;
  createdAt: string;
  description: string | null;
  envVarName: string;
  id: string;
  name: string;
  secretGroupId: string | null;
  updatedAt: string;
};

export type GraphqlSecretGroupRecord = {
  companyId: string;
  id: string;
  name: string;
};

/**
 * Keeps secret GraphQL payloads consistent across list, detail, and mutation responses while
 * making grouped and ungrouped secrets serialize through one shared path.
 */
export class GraphqlSecretPresenter {
  static presentSecret(record: SecretRecord): GraphqlSecretRecord {
    return {
      companyId: record.companyId,
      createdAt: record.createdAt.toISOString(),
      description: record.description,
      envVarName: record.envVarName,
      id: record.id,
      name: record.name,
      secretGroupId: record.secretGroupId ?? null,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  static presentSecretGroup(record: SecretGroupRecord): GraphqlSecretGroupRecord {
    return {
      companyId: record.companyId,
      id: record.id,
      name: record.name,
    };
  }
}
