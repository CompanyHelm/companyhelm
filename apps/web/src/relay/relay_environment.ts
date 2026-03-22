import {
  Environment,
  Network,
  RecordSource,
  Store,
  type GraphQLResponse,
  type RequestParameters,
  type Variables,
} from "relay-runtime";
import { config } from "../config";
import { authSessionStore } from "../auth/auth_session_store";

interface GraphQLErrorDocument {
  message?: string;
}

interface GraphQLPayloadDocument extends GraphQLResponse {
  errors?: GraphQLErrorDocument[];
}

export class RelayEnvironmentBuilder {
  static createEnvironment(): Environment {
    return new Environment({
      network: Network.create(RelayEnvironmentBuilder.fetchGraphQL),
      store: new Store(new RecordSource()),
    });
  }

  static async executeMutation<TDataDocument>(
    operationName: string,
    queryText: string,
    variables: Variables,
  ): Promise<TDataDocument> {
    const payload = await RelayEnvironmentBuilder.fetchGraphQL(
      {
        id: null,
        metadata: {},
        name: operationName,
        operationKind: "mutation",
        text: queryText,
      } as RequestParameters,
      variables,
    );

    const data = payload.data;
    if (!data || typeof data !== "object") {
      throw new Error(`Relay mutation "${operationName}" did not return data.`);
    }

    return data as TDataDocument;
  }

  private static async fetchGraphQL(
    params: RequestParameters,
    variables: Variables,
  ): Promise<GraphQLResponse> {
    const queryText = String(params.text || "").trim();
    if (!queryText) {
      throw new Error(`Relay request "${String(params.name || "anonymous")}" is missing query text.`);
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    const activeSession = authSessionStore.getSession();
    if (activeSession?.token) {
      headers.authorization = `Bearer ${activeSession.token}`;
    }

    const response = await fetch(config.graphqlUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: queryText,
        variables,
      }),
    });

    const payload = await RelayEnvironmentBuilder.readPayload(response);
    if (response.status === 401) {
      authSessionStore.clearSession();
    }

    if (!response.ok) {
      throw new Error(RelayEnvironmentBuilder.getErrorMessage(payload, `GraphQL request failed (${response.status}).`));
    }

    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      throw new Error(RelayEnvironmentBuilder.getErrorMessage(payload, "GraphQL request failed."));
    }

    return payload;
  }

  private static async readPayload(response: Response): Promise<GraphQLPayloadDocument> {
    try {
      const rawPayload = await response.json();
      if (rawPayload && typeof rawPayload === "object") {
        return rawPayload as GraphQLPayloadDocument;
      }
      return {};
    } catch {
      return {};
    }
  }

  private static getErrorMessage(payload: GraphQLPayloadDocument, fallbackMessage: string): string {
    const firstMessage = String(payload.errors?.[0]?.message || "").trim();
    return firstMessage || fallbackMessage;
  }
}

export const relayEnvironment = RelayEnvironmentBuilder.createEnvironment();
