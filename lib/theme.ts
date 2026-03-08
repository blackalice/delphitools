export const THEME_MODE_STORAGE_KEY = "delphitools-theme";
export const THEME_PALETTE_STORAGE_KEY = "delphitools-palette";

export const THEME_PALETTES = [
  { value: "meadow", label: "Meadow" },
  { value: "ocean", label: "Ocean" },
  { value: "ember", label: "Ember" },
  { value: "violet", label: "Violet" },
  { value: "rose", label: "Rose" },
  { value: "slate", label: "Slate" },
  { value: "sunset", label: "Sunset" },
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
