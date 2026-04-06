import { Environment, Network, RecordSource, Store } from "relay-runtime";
import { config } from "@/config";
import { GraphqlSubscriptionConnectionStore } from "./graphql_subscription_connection_store";
import { GraphqlSubscriptionClient } from "./graphql_subscription_client";
import { SessionTranscriptRetentionStore } from "./session_transcript_retention_store";

type GetToken = () => Promise<string | null>;

/**
 * Owns the Relay environment together with the live GraphQL subscription transport state that the
 * UI needs for reconnect-aware screens like `/chats`.
 */
export class RelayEnvironment {
  readonly environment: Environment;
  readonly sessionTranscriptRetentionStore: SessionTranscriptRetentionStore;
  readonly subscriptionConnectionStore: GraphqlSubscriptionConnectionStore;

  constructor(getToken: GetToken) {
    this.subscriptionConnectionStore = new GraphqlSubscriptionConnectionStore();
    const subscriptionClient = new GraphqlSubscriptionClient(
      config.graphqlUrl,
      getToken,
      this.subscriptionConnectionStore,
    );

    this.environment = new Environment({
      network: Network.create(
        async (parameters, variables) => {
          if (!parameters.text) {
            throw new Error("Missing GraphQL operation text.");
          }

          const token = await getToken();
          const response = await fetch(config.graphqlUrl, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              query: parameters.text,
              variables,
            }),
          });

          if (!response.ok) {
            throw new Error(`GraphQL request failed with status ${response.status}.`);
          }

          const document = await response.json() as {
            data?: unknown;
            errors?: Array<{
              message?: string;
            }>;
          };
          const errorMessage = String(document.errors?.[0]?.message || "").trim();
          if (errorMessage && !document.data) {
            throw new Error(errorMessage);
          }

          return document;
        },
        (parameters, variables) => subscriptionClient.subscribe(parameters, variables),
      ),
      store: new Store(new RecordSource()),
    });
    this.sessionTranscriptRetentionStore = new SessionTranscriptRetentionStore(this.environment);
  }
}
