import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { SecretService } from "../../../secrets/service.ts";

export type AgentSecretSummary = {
  description: string | null;
  envVarName: string;
  name: string;
};

/**
 * Loads the secret metadata that is relevant to the current PI Mono prompt run. It keeps the tool
 * layer focused on presentation by translating the broader secret catalog service into the two
 * read-only views the agent needs: session-assigned secrets and the full company secret catalog.
 */
export class AgentSecretToolService {
  private readonly transactionProvider: TransactionProviderInterface;
  private readonly companyId: string;
  private readonly sessionId: string;
  private readonly secretService: SecretService;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    secretService: SecretService,
  ) {
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
    this.sessionId = sessionId;
    this.secretService = secretService;
  }

  async listAssignedSecrets(): Promise<AgentSecretSummary[]> {
    const secrets = await this.secretService.listSessionSecrets(
      this.transactionProvider,
      this.companyId,
      this.sessionId,
    );

    return secrets.map((secret) => {
      return {
        description: secret.description,
        envVarName: secret.envVarName,
        name: secret.name,
      };
    });
  }

  async listAvailableSecrets(): Promise<AgentSecretSummary[]> {
    const secrets = await this.secretService.listSecrets(this.transactionProvider, this.companyId);

    return secrets.map((secret) => {
      return {
        description: secret.description,
        envVarName: secret.envVarName,
        name: secret.name,
      };
    });
  }
}
