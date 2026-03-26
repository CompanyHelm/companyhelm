import { Environment, Network, RecordSource, Store } from "relay-runtime";
import { config } from "@/config";
import { GraphqlSubscriptionClient } from "./graphql_subscription_client";

type GetToken = () => Promise<string | null>;

/**
 * Creates the Relay environment used by the browser app.
 */
export class RelayEnvironment {
  static create(getToken: GetToken) {
    const subscriptionClient = new GraphqlSubscriptionClient(config.graphqlUrl, getToken);

    return new Environment({
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
  }
}
