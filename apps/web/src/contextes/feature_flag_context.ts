import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface FeatureFlags {
  computer_providers: boolean;
}

type FeatureFlagName = keyof FeatureFlags;

interface FeatureFlagContextValue {
  featureFlags: FeatureFlags;
  isEnabled(name: FeatureFlagName): boolean;
  setFeatureFlag(name: FeatureFlagName, value: boolean): void;
}

const FEATURE_FLAGS_STORAGE_KEY = "companyhelm-feature-flags";

const defaultFeatureFlags: FeatureFlags = {
  computer_providers: false,
};

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

function parseFeatureFlags(source: unknown): FeatureFlags {
  if (typeof source !== "object" || source === null) {
    return { ...defaultFeatureFlags };
  }

  const storedFlags = source as Partial<Record<FeatureFlagName, unknown>>;

  return {
    computer_providers: typeof storedFlags.computer_providers === "boolean"
      ? storedFlags.computer_providers
      : defaultFeatureFlags.computer_providers,
  };
}

function readFeatureFlagsFromStorage(): FeatureFlags {
  if (typeof window === "undefined") {
    return { ...defaultFeatureFlags };
  }

  const storedValue = window.localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY);

  if (storedValue === null) {
    return { ...defaultFeatureFlags };
  }

  try {
    return parseFeatureFlags(JSON.parse(storedValue));
  } catch {
    return { ...defaultFeatureFlags };
  }
}

/**
 * Keeps browser-local feature flag overrides in sync with localStorage so unfinished surfaces can
 * be enabled or disabled without waiting for a server-backed rollout system.
 */
export function FeatureFlagProvider(props: { children: ReactNode }) {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(() => readFeatureFlagsFromStorage());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(featureFlags));
  }, [featureFlags]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== FEATURE_FLAGS_STORAGE_KEY) {
        return;
      }

      setFeatureFlags(readFeatureFlagsFromStorage());
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function isEnabled(name: FeatureFlagName): boolean {
    return featureFlags[name];
  }

  function setFeatureFlag(name: FeatureFlagName, value: boolean) {
    setFeatureFlags((currentFeatureFlags) => ({
      ...currentFeatureFlags,
      [name]: value,
    }));
  }

  return createElement(
    FeatureFlagContext.Provider,
    {
      value: {
        featureFlags,
        isEnabled,
        setFeatureFlag,
      },
    },
    props.children,
  );
}

export function useFeatureFlags(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagContext);

  if (context === null) {
    throw new Error("useFeatureFlags must be used within a FeatureFlagProvider.");
  }

  return context;
}
