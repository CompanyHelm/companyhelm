import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type ApplicationBreadcrumbContextValue = {
  detailLabel: string | null;
  headerActions: ReactNode | null;
  headerClassName: string | null;
  headerContent: ReactNode | null;
  setDetailLabel: (label: string | null) => void;
  setHeaderActions: (actions: ReactNode | null) => void;
  setHeaderClassName: (className: string | null) => void;
  setHeaderContent: (content: ReactNode | null) => void;
};

const ApplicationBreadcrumbContext = createContext<ApplicationBreadcrumbContextValue | null>(null);

interface ApplicationBreadcrumbProviderProps {
  children: ReactNode;
}

export function ApplicationBreadcrumbProvider(props: ApplicationBreadcrumbProviderProps) {
  const [detailLabel, setDetailLabel] = useState<string | null>(null);
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);
  const [headerClassName, setHeaderClassName] = useState<string | null>(null);
  const [headerContent, setHeaderContent] = useState<ReactNode | null>(null);
  const value = useMemo<ApplicationBreadcrumbContextValue>(() => {
    return {
      detailLabel,
      headerActions,
      headerClassName,
      headerContent,
      setDetailLabel,
      setHeaderActions,
      setHeaderClassName,
      setHeaderContent,
    };
  }, [detailLabel, headerActions, headerClassName, headerContent]);

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
  useApplicationHeader({
    actions,
  });
}

export function useApplicationHeader(options: {
  actions?: ReactNode | null;
  className?: string | null;
  content?: ReactNode | null;
}) {
  const {
    setHeaderActions,
    setHeaderClassName,
    setHeaderContent,
  } = useApplicationBreadcrumb();
  const actions = options.actions ?? null;
  const className = options.className ?? null;
  const content = options.content ?? null;

  useEffect(() => {
    setHeaderContent(content);

    return () => {
      setHeaderContent(null);
    };
  }, [content, setHeaderContent]);

  useEffect(() => {
    setHeaderActions(actions);

    return () => {
      setHeaderActions(null);
    };
  }, [actions, setHeaderActions]);

  useEffect(() => {
    setHeaderClassName(className);

    return () => {
      setHeaderClassName(null);
    };
  }, [className, setHeaderClassName]);
}
