import type { TransactionProviderInterface } from "../../../../../../db/transaction_provider_interface.ts";
import { SecretService } from "../../../../../secrets/service.ts";

export type AgentSecretSummary = {
  description: string | null;
  envVarName: string;
  name: string;
};

export type AgentSecretValue = {
  description: string | null;
  envVarName: string;
  name: string;
  value: string;
};

/**
 * Loads the secret metadata that is relevant to the current PI Mono prompt run. It keeps the tool
 * layer focused on presentation by translating the broader secret catalog service into the two
 * read-only views the agent needs plus a narrowly scoped plaintext lookup for already attached
 * session secrets when a downstream tool genuinely cannot consume environment variables directly.
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

  async readAssignedSecret(envVarName: string): Promise<AgentSecretValue> {
    const [secrets, environmentVariables] = await Promise.all([
      this.secretService.listSessionSecrets(
        this.transactionProvider,
        this.companyId,
        this.sessionId,
      ),
      this.secretService.resolveSessionEnvironmentVariables(
        this.transactionProvider,
        this.companyId,
        this.sessionId,
      ),
    ]);
    const secret = secrets.find((candidate) => candidate.envVarName === envVarName);
    if (!secret) {
      throw new Error(`Secret ${envVarName} is not attached to this chat session.`);
    }

    const value = environmentVariables[envVarName];
    if (typeof value !== "string") {
      throw new Error(`Secret ${envVarName} could not be resolved for this chat session.`);
    }

    return {
      description: secret.description,
      envVarName: secret.envVarName,
      name: secret.name,
      value,
    };
  }
}
