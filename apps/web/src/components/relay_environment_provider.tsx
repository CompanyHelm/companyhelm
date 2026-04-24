import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth/auth_provider";
import { RelayEnvironmentProvider } from "react-relay";
import { AmplitudeAnalytics } from "@/lib/amplitude_analytics";
import type { GraphqlSubscriptionConnectionStatus } from "@/lib/graphql_subscription_connection_store";
import { RelayEnvironment } from "@/lib/relay_environment";

interface AppRelayEnvironmentProviderProps {
  children: ReactNode;
}

const GraphqlSubscriptionConnectionStoreContext = createContext<
  RelayEnvironment["subscriptionConnectionStore"] | null
>(null);
const SessionTranscriptRetentionStoreContext = createContext<
  RelayEnvironment["sessionTranscriptRetentionStore"] | null
>(null);

export function AppRelayEnvironmentProvider(props: AppRelayEnvironmentProviderProps) {
  const auth = useAuth();
  const getRequestHeadersRef = useRef(auth.getRequestHeaders);
  getRequestHeadersRef.current = auth.getRequestHeaders;
  const relayEnvironment = useMemo(() => {
    return new RelayEnvironment(async () => getRequestHeadersRef.current());
  }, []);

  useEffect(() => {
    AmplitudeAnalytics.syncUserSession({
      isLoaded: auth.isLoaded,
      isSignedIn: auth.isSignedIn === true,
      userId: auth.userId || null,
    });
  }, [auth.isLoaded, auth.isSignedIn, auth.userId]);

  return (
    <SessionTranscriptRetentionStoreContext.Provider value={relayEnvironment.sessionTranscriptRetentionStore}>
      <GraphqlSubscriptionConnectionStoreContext.Provider value={relayEnvironment.subscriptionConnectionStore}>
        <RelayEnvironmentProvider environment={relayEnvironment.environment}>
          {props.children}
        </RelayEnvironmentProvider>
      </GraphqlSubscriptionConnectionStoreContext.Provider>
    </SessionTranscriptRetentionStoreContext.Provider>
  );
}

export function useGraphqlSubscriptionConnectionStatus(): GraphqlSubscriptionConnectionStatus {
  const connectionStore = useContext(GraphqlSubscriptionConnectionStoreContext);
  if (!connectionStore) {
    throw new Error("Graphql subscription connection store is unavailable.");
  }

  return useSyncExternalStore(
    (listener) => connectionStore.subscribe(listener),
    () => connectionStore.getSnapshot(),
    () => "idle",
  );
}

export function useSessionTranscriptRetentionStore(): RelayEnvironment["sessionTranscriptRetentionStore"] {
  const transcriptRetentionStore = useContext(SessionTranscriptRetentionStoreContext);
  if (!transcriptRetentionStore) {
    throw new Error("Session transcript retention store is unavailable.");
  }

  return transcriptRetentionStore;
}
