import { createContext, useContext, useState, type ReactNode } from "react";

type ApplicationBreadcrumbContextValue = {
  detailLabel: string | null;
  setDetailLabel: (label: string | null) => void;
};

const ApplicationBreadcrumbContext = createContext<ApplicationBreadcrumbContextValue | null>(null);

interface ApplicationBreadcrumbProviderProps {
  children: ReactNode;
}

export function ApplicationBreadcrumbProvider(props: ApplicationBreadcrumbProviderProps) {
  const [detailLabel, setDetailLabel] = useState<string | null>(null);

  return (
    <ApplicationBreadcrumbContext.Provider
      value={{
        detailLabel,
        setDetailLabel,
      }}
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
