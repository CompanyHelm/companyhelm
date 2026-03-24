import type { ReactNode } from "react";
import { useMemo, useRef } from "react";
import { useAuth } from "@clerk/react";
import { RelayEnvironmentProvider } from "react-relay";
import { RelayEnvironment } from "@/lib/relay_environment";

interface AppRelayEnvironmentProviderProps {
  children: ReactNode;
}

export function AppRelayEnvironmentProvider(props: AppRelayEnvironmentProviderProps) {
  const auth = useAuth();
  const getTokenRef = useRef(auth.getToken);
  getTokenRef.current = auth.getToken;
  const environment = useMemo(() => {
    return RelayEnvironment.create(async () => getTokenRef.current());
  }, []);

  return (
    <RelayEnvironmentProvider environment={environment}>
      {props.children}
    </RelayEnvironmentProvider>
  );
}
