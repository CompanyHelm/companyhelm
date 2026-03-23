import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider(props: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = window.localStorage.getItem(props.storageKey || "vite-ui-theme");
    return (storedTheme as Theme | null) || props.defaultTheme || "system";
  });

  useEffect(() => {
    const rootElement = window.document.documentElement;

    rootElement.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

      rootElement.classList.add(systemTheme);
      return;
    }

    rootElement.classList.add(theme);
  }, [theme]);

  return (
    <ThemeProviderContext.Provider
      value={{
        theme,
        setTheme: (value) => {
          window.localStorage.setItem(props.storageKey || "vite-ui-theme", value);
          setTheme(value);
        },
      }}
    >
      {props.children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
