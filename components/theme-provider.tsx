"use client";

import * as React from "react";

import {
  DEFAULT_THEME_PALETTE,
  THEME_MODE_STORAGE_KEY,
  THEME_PALETTE_STORAGE_KEY,
  THEME_PALETTES,
  type ThemeMode,
  type ThemePalette,
} from "@/lib/theme";

type ThemeContextValue = {
  mounted: boolean;
  mode: ThemeMode;
  palette: ThemePalette;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: ThemePalette) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ThemeMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function isThemePalette(value: string | null): value is ThemePalette {
  return THEME_PALETTES.some((palette) => palette.value === value);
}

function getStoredMode(): ThemeMode | null {
  const storedTheme = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return null;
}

function getStoredPalette(): ThemePalette | null {
  const storedPalette = window.localStorage.getItem(THEME_PALETTE_STORAGE_KEY);

  if (isThemePalette(storedPalette)) {
    return storedPalette;
  }

  return null;
}

function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement;
  const isDark = mode === "dark";

  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

function applyThemePalette(palette: ThemePalette) {
  document.documentElement.dataset.palette = palette;
}

export function ThemeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mounted, setMounted] = React.useState(false);
  const [mode, setModeState] = React.useState<ThemeMode>("light");
  const [palette, setPaletteState] =
    React.useState<ThemePalette>(DEFAULT_THEME_PALETTE);

  React.useEffect(() => {
    const initialMode = getStoredMode() ?? getSystemTheme();
    const initialPalette = getStoredPalette() ?? DEFAULT_THEME_PALETTE;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    applyThemeMode(initialMode);
    applyThemePalette(initialPalette);
    setModeState(initialMode);
    setPaletteState(initialPalette);
    setMounted(true);

    const handleSystemThemeChange = () => {
      if (getStoredMode()) {
        return;
      }

      const nextMode = getSystemTheme();
      applyThemeMode(nextMode);
      setModeState(nextMode);
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, nextMode);
    applyThemeMode(nextMode);
    setModeState(nextMode);
  };

  const setPalette = (nextPalette: ThemePalette) => {
    window.localStorage.setItem(THEME_PALETTE_STORAGE_KEY, nextPalette);
    applyThemePalette(nextPalette);
    setPaletteState(nextPalette);
  };

  const value = {
    mounted,
    mode,
    palette,
    setMode,
    setPalette,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }

  return context;
}
