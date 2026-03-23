import { GraphqlClient } from "@/lib/graphql_client";

export type ModelProviderCredentialRecord = {
  id: string;
  companyId: string;
  name: string;
  modelProvider: "openai";
  type: "api_key";
  refreshToken: string | null;
  refreshedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type LoadCredentialsResponse = {
  ModelProviderCredentials: ModelProviderCredentialRecord[];
};

type CreateCredentialResponse = {
  AddModelProviderCredential: ModelProviderCredentialRecord;
};

/**
 * Encapsulates the GraphQL operations used by the model provider credentials page.
 */
export class ModelProviderCredentialsClient {
  private readonly graphqlClient: GraphqlClient;

  constructor(graphqlClient: GraphqlClient) {
    this.graphqlClient = graphqlClient;
  }

  async loadCredentials(token: string): Promise<ModelProviderCredentialRecord[]> {
    const response = await this.graphqlClient.execute<LoadCredentialsResponse>({
      query: `
        query ModelProviderCredentials {
          ModelProviderCredentials {
            id
            companyId
            name
            modelProvider
            type
            refreshToken
            refreshedAt
            createdAt
            updatedAt
          }
        }
      `,
      token,
    });

    return response.ModelProviderCredentials;
  }

  async createCredential(
    token: string,
    input: {
      apiKey: string;
      modelProvider: "openai";
    },
  ): Promise<ModelProviderCredentialRecord> {
    const response = await this.graphqlClient.execute<
      CreateCredentialResponse,
      {
        input: {
          apiKey: string;
          modelProvider: "openai";
        };
      }
    >({
      query: `
        mutation AddModelProviderCredential($input: AddModelProviderCredentialInput!) {
          AddModelProviderCredential(input: $input) {
            id
            companyId
            name
            modelProvider
            type
            refreshToken
            refreshedAt
            createdAt
            updatedAt
          }
        }
      `,
      token,
      variables: {
        input,
      },
    });

    return response.AddModelProviderCredential;
  }
}
