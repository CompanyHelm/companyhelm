import { eq, inArray } from "drizzle-orm";
import { agents, companyMembers, users } from "../../../../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../../../../db/transaction_provider_interface.ts";

export type AgentCompanyDirectoryAgent = {
  id: string;
  name: string;
};

export type AgentCompanyDirectoryMember = {
  id: string;
  name: string;
};

type AgentRow = {
  id: string;
  name: string;
};

type MembershipRow = {
  userId: string;
};

type UserRow = {
  firstName: string;
  id: string;
  lastName: string | null;
};

/**
 * Exposes the company directory metadata that is safe and useful for an agent during a prompt run.
 * It keeps the tool layer read-only and focused on ids plus labels so later tool calls can target
 * humans or agents without reimplementing the underlying company-scoped queries.
 */
export class AgentCompanyDirectoryToolService {
  private readonly companyId: string;
  private readonly transactionProvider: TransactionProviderInterface;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ) {
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
  }

  async listCompanyAgents(): Promise<AgentCompanyDirectoryAgent[]> {
    return this.transactionProvider.transaction(async (tx) => {
      const agentRows = await tx
        .select({
          id: agents.id,
          name: agents.name,
        })
        .from(agents)
        .where(eq(agents.companyId, this.companyId)) as AgentRow[];

      return [...agentRows].sort((left, right) => left.name.localeCompare(right.name));
    });
  }

  async listCompanyMembers(): Promise<AgentCompanyDirectoryMember[]> {
    return this.transactionProvider.transaction(async (tx) => {
      const membershipRows = await tx
        .select({
          userId: companyMembers.userId,
        })
        .from(companyMembers)
        .where(eq(companyMembers.companyId, this.companyId)) as MembershipRow[];
      if (membershipRows.length === 0) {
        return [];
      }

      const userRows = await tx
        .select({
          firstName: users.first_name,
          id: users.id,
          lastName: users.last_name,
        })
        .from(users)
        .where(inArray(users.id, membershipRows.map((membershipRow) => membershipRow.userId))) as UserRow[];

      return [...userRows]
        .map((userRow) => ({
          id: userRow.id,
          name: AgentCompanyDirectoryToolService.formatMemberName(userRow),
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
    });
  }

  private static formatMemberName(userRow: UserRow): string {
    return userRow.lastName ? `${userRow.firstName} ${userRow.lastName}` : userRow.firstName;
  }
}
