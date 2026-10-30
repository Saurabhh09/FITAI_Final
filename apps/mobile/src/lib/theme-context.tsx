import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "light" | "dark" | "system";

export type ThemeColors = {
  bg: string;
  card: string;
  cardBorder: string;
  text: string;
  subText: string;
  divider: string;
  iconColor: string;
  pillBg: string;
  pillText: string;
  btnPrimary: string;
  btnPrimaryText: string;
  danger: string;
  bannerBg: string;
  bannerBorder: string;
  bannerText: string;
};

const lightColors: ThemeColors = {
  bg: "#F8F9FA",
  card: "#FFFFFF",
  cardBorder: "#EEF0F2",
  text: "#111111",
  subText: "#7A7E85",
  divider: "#F0F1F3",
  iconColor: "#111111",
  pillBg: "#F0F2F5",
  pillText: "#111111",
  btnPrimary: "#111111",
  btnPrimaryText: "#FFFFFF",
  danger: "#E53935",
  bannerBg: "#E8F5E9",
  bannerBorder: "#C8E6C9",
  bannerText: "#2E7D32",
};

const darkColors: ThemeColors = {
  bg: "#0E1015",
  card: "#181A22",
  cardBorder: "#272A36",
  text: "#F3F4F6",
  subText: "#9CA3AF",
  divider: "#232632",
  iconColor: "#F3F4F6",
  pillBg: "#232632",
  pillText: "#E5E7EB",
  btnPrimary: "#FFFFFF",
  btnPrimaryText: "#111111",
  danger: "#EF4444",
  bannerBg: "#14291A",
  bannerBorder: "#1B4D27",
  bannerText: "#4ADE80",
};

type ThemeContextType = {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
};

const THEME_STORAGE_KEY = "@fitai_appearance_mode";

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "light",
  isDark: false,
  colors: lightColors,
  setThemeMode: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    async function loadTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === "light" || saved === "dark" || saved === "system") {
          setThemeModeState(saved);
        }
      } catch {
        // Fallback default
      }
    }
    loadTheme();
  }, []);

  const isDark =
    themeMode === "dark" || (themeMode === "system" && systemScheme === "dark");

  const colors = isDark ? darkColors : lightColors;

  async function setThemeMode(mode: ThemeMode) {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Non-fatal
    }
  }

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
