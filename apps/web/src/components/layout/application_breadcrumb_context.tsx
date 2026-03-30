import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ApplicationBreadcrumbContextValue = {
  detailLabel: string | null;
  headerActions: ReactNode | null;
  setDetailLabel: (label: string | null) => void;
  setHeaderActions: (actions: ReactNode | null) => void;
};

const ApplicationBreadcrumbContext = createContext<ApplicationBreadcrumbContextValue | null>(null);

interface ApplicationBreadcrumbProviderProps {
  children: ReactNode;
}

export function ApplicationBreadcrumbProvider(props: ApplicationBreadcrumbProviderProps) {
  const [detailLabel, setDetailLabel] = useState<string | null>(null);
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);
  const value = useMemo<ApplicationBreadcrumbContextValue>(() => {
    return {
      detailLabel,
      headerActions,
      setDetailLabel,
      setHeaderActions,
    };
  }, [detailLabel, headerActions]);

  return (
    <ApplicationBreadcrumbContext.Provider
      value={value}
    >
      {props.children}
    </ApplicationBreadcrumbContext.Provider>
  );
}

export function useApplicationBreadcrumb() {
  const context = useContext(ApplicationBreadcrumbContext);
  if (!context) {
    throw new Error("Application breadcrumb context is required.");
  }

  return context;
}

export function useApplicationHeaderActions(actions: ReactNode | null) {
  const { setHeaderActions } = useApplicationBreadcrumb();

  useEffect(() => {
    setHeaderActions(actions);

    return () => {
      setHeaderActions(null);
    };
  }, [actions, setHeaderActions]);
}
