import type { Sql } from "postgres";

function normalizeRoleName(roleName: string): string {
  const normalizedRoleName = String(roleName || "").trim();
  if (!normalizedRoleName) {
    throw new Error("Role name cannot be empty.");
  }
  return normalizedRoleName;
}

function quoteIdentifier(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function ensureRoleExists(params: {
  roleName: string;
  rolePassword: string;
  sqlClient: Sql;
}): Promise<void> {
  const roleName = normalizeRoleName(params.roleName);
  const rolePassword = String(params.rolePassword || "").trim();
  if (!rolePassword) {
    throw new Error("Role password cannot be empty.");
  }

  const existingRoleResult = await params.sqlClient<{ exists: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${roleName}) AS exists
  `;
  if (existingRoleResult[0]?.exists === true) {
    return;
  }

  await params.sqlClient.unsafe(
    `CREATE ROLE ${quoteIdentifier(roleName)} LOGIN PASSWORD ${quoteLiteral(rolePassword)}`,
  );
}

export async function runAppRuntimeRoleBootstrapModule(params: {
  roleName: string;
  rolePassword: string;
  sqlClient: Sql;
}): Promise<void> {
  await ensureRoleExists({
    roleName: params.roleName,
    rolePassword: params.rolePassword,
    sqlClient: params.sqlClient,
  });
}
