import { createClient } from "graphql-ws";
import { Observable } from "relay-runtime";
import { GraphqlSubscriptionConnectionStore } from "./graphql_subscription_connection_store";

type GetToken = () => Promise<string | null>;

type GraphqlOperationParameters = {
  name: string;
  text: string | null | undefined;
};

type GraphqlSubscriptionPayload = {
  data?: unknown;
  errors?: Array<{
    message?: string;
  }>;
};

/**
 * Wraps the shared GraphQL websocket transport used by Relay subscriptions and delegates retry
 * policy to `graphql-ws` so active operations survive server restarts and transient disconnects.
 */
export class GraphqlSubscriptionClient {
  private readonly client = createClient({
    url: () => this.resolveWebsocketUrl(),
    connectionParams: async () => {
      const token = await this.getToken();

      return {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      };
    },
    lazy: true,
    retryAttempts: Number.POSITIVE_INFINITY,
    retryWait: async (retries) => {
      const retryDelayMs = Math.min(1_000 * (2 ** retries), 5_000);
      await new Promise((resolve) => {
        window.setTimeout(resolve, retryDelayMs);
      });
    },
    shouldRetry: () => true,
    on: {
      closed: (event) => {
        this.connectionStore.handleConnectionClosed(event);
      },
      connected: (socket) => {
        this.connectionStore.handleConnected(socket);
      },
      connecting: (isRetry) => {
        this.connectionStore.handleConnecting(isRetry);
      },
      opened: (socket) => {
        this.connectionStore.handleOpened(socket);
      },
    },
  });

  constructor(
    private readonly graphqlUrl: string,
    private readonly getToken: GetToken,
    private readonly connectionStore: GraphqlSubscriptionConnectionStore,
  ) {}

  subscribe(parameters: GraphqlOperationParameters, variables: unknown) {
    return Observable.create((sink) => {
      if (!parameters.text) {
        sink.error(new Error("Missing GraphQL operation text."));

        return () => {};
      }

      this.connectionStore.beginOperation();
      let isOperationActive = true;
      const finishOperation = () => {
        if (!isOperationActive) {
          return;
        }

        isOperationActive = false;
        this.connectionStore.endOperation();
      };

      const unsubscribe = this.client.subscribe<GraphqlSubscriptionPayload>({
        operationName: parameters.name,
        query: parameters.text,
        variables: variables as Record<string, unknown>,
      }, {
        complete: () => {
          finishOperation();
          sink.complete();
        },
        error: (error) => {
          finishOperation();
          sink.error(this.createSubscriptionError(error));
        },
        next: (payload) => {
          sink.next(payload);
        },
      });

      return () => {
        finishOperation();
        unsubscribe();
      };
    });
  }

  private resolveWebsocketUrl(): string {
    const websocketUrl = new URL(this.graphqlUrl);
    websocketUrl.protocol = websocketUrl.protocol === "https:" ? "wss:" : "ws:";

    return websocketUrl.toString();
  }

  private createSubscriptionError(error: unknown): Error {
    if (Array.isArray(error)) {
      const errorMessage = error
        .map((entry) => {
          if (entry instanceof Error) {
            return entry.message.trim();
          }

          return String((entry as { message?: unknown })?.message || "").trim();
        })
        .find((message) => message.length > 0);
      if (errorMessage) {
        return new Error(errorMessage);
      }
    }

    if (error instanceof Error) {
      return error;
    }

    if (typeof error === "object" && error !== null) {
      const closeReason = String((error as { reason?: unknown }).reason || "").trim();
      if (closeReason.length > 0) {
        return new Error(closeReason);
      }
    }

    return new Error("Subscription request failed.");
  }
}
