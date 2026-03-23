import { config } from "@/config";

type GraphqlResponseDocument<TResult> = {
  data?: TResult;
  errors?: Array<{
    message?: string;
  }>;
};

type ExecuteQueryParameters<TVariables> = {
  query: string;
  token: string;
  variables?: TVariables;
};

/**
 * Performs authenticated GraphQL requests against the configured API endpoint.
 */
export class GraphqlClient {
  async execute<TResult, TVariables = Record<string, unknown>>(
    parameters: ExecuteQueryParameters<TVariables>,
  ): Promise<TResult> {
    const response = await fetch(config.graphqlUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${parameters.token}`,
      },
      body: JSON.stringify({
        query: parameters.query,
        variables: parameters.variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}.`);
    }

    const document = await response.json() as GraphqlResponseDocument<TResult>;
    const errorMessage = String(document.errors?.[0]?.message || "").trim();
    if (errorMessage) {
      throw new Error(errorMessage);
    }

    if (!document.data) {
      throw new Error("GraphQL response did not include data.");
    }

    return document.data;
  }
}
