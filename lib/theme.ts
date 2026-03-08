export const THEME_MODE_STORAGE_KEY = "delphitools-theme";
export const THEME_PALETTE_STORAGE_KEY = "delphitools-palette";

export const THEME_PALETTES = [
  { value: "meadow", label: "Meadow", swatch: "oklch(0.45 0.12 145)" },
  { value: "ocean", label: "Ocean", swatch: "oklch(0.53 0.14 240)" },
  { value: "ember", label: "Ember", swatch: "oklch(0.62 0.2 38)" },
  { value: "violet", label: "Violet", swatch: "oklch(0.56 0.18 305)" },
  { value: "rose", label: "Rose", swatch: "oklch(0.61 0.18 14)" },
  { value: "slate", label: "Slate", swatch: "oklch(0.44 0.03 255)" },
  { value: "sunset", label: "Sunset", swatch: "oklch(0.63 0.18 335)" },
] as const;

export type ThemeMode = "light" | "dark";
export type ThemePalette = (typeof THEME_PALETTES)[number]["value"];

export const DEFAULT_THEME_PALETTE: ThemePalette = "meadow";

export const THEME_SCRIPT = `
(function () {
  try {
    var storedMode = localStorage.getItem("${THEME_MODE_STORAGE_KEY}");
    var storedPalette = localStorage.getItem("${THEME_PALETTE_STORAGE_KEY}");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = storedMode ? storedMode === "dark" : prefersDark;
    var supportedPalettes = ${JSON.stringify(THEME_PALETTES.map((palette) => palette.value))};
    var palette = supportedPalettes.indexOf(storedPalette) >= 0
      ? storedPalette
      : "${DEFAULT_THEME_PALETTE}";
    var root = document.documentElement;

    root.classList.toggle("dark", isDark);
    root.dataset.palette = palette;
    root.style.colorScheme = isDark ? "dark" : "light";
  } catch (error) {
    console.error("Failed to apply persisted theme.", error);
  }
})();
`;
