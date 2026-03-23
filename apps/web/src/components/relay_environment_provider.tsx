import type { ReactNode } from "react";
import { useMemo } from "react";
import { useAuth } from "@clerk/react";
import { RelayEnvironmentProvider } from "react-relay";
import { RelayEnvironment } from "@/lib/relay_environment";

interface AppRelayEnvironmentProviderProps {
  children: ReactNode;
}

export function AppRelayEnvironmentProvider(props: AppRelayEnvironmentProviderProps) {
  const auth = useAuth();
  const environment = useMemo(() => {
    return RelayEnvironment.create(async () => auth.getToken());
  }, [auth]);

  return (
    <RelayEnvironmentProvider environment={environment}>
      {props.children}
    </RelayEnvironmentProvider>
  );
}
