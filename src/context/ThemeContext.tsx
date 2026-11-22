import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "dark" | "light";

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  primary: string;
  secondary: string;
  white: string;
  text: string;
  muted: string;
  border: string;
  danger: string;
  success: string;
}

const DARK_COLORS: ThemeColors = {
  background: "#090910",
  surface: "#13131E",
  card: "#1B1B29",
  primary: "#E50914",
  secondary: "#F40612",
  white: "#FFFFFF",
  text: "#F5F5F7",
  muted: "#9CA3AF",
  border: "#262636",
  danger: "#EF4444",
  success: "#46D369",
};

const LIGHT_COLORS: ThemeColors = {
  background: "#F4F4F6",
  surface: "#FFFFFF",
  card: "#EAEAEF",
  primary: "#E50914",
  secondary: "#B20710",
  white: "#14141A",
  text: "#14141A",
  muted: "#6B7280",
  border: "#DCDCE4",
  danger: "#DC2626",
  success: "#16A34A",
};

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  isThemeLoading: boolean;
  setTheme: (theme: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

export const ThemeContext =
  createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = "cineverse_theme";

interface Props {
  children: ReactNode;
}

export function ThemeProvider({ children }: Props) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);

        if (isMounted && (savedTheme === "dark" || savedTheme === "light")) {
          setThemeState(savedTheme);
        }
      } catch {
        
      } finally {
        if (isMounted) {
          setIsThemeLoading(false);
        }
      }
    };

    loadTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const setTheme = useCallback(async (newTheme: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_KEY, newTheme);
      setThemeState(newTheme);
    } catch {
      setThemeState(newTheme);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    await setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const colors = useMemo(
    () => (theme === "dark" ? DARK_COLORS : LIGHT_COLORS),
    [theme]
  );

  const contextValue = useMemo(
    () => ({
      theme,
      colors,
      isThemeLoading,
      setTheme,
      toggleTheme,
    }),
    [theme, colors, isThemeLoading, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}