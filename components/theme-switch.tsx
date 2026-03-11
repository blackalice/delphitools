"use client";

import * as React from "react";
import { Check, ChevronDown, Moon, Palette, Sun } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import {
  DEFAULT_THEME_PALETTE,
  THEME_PALETTES,
  type ThemePalette,
} from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ThemePaletteControl({ className }: { className?: string }) {
  const [paletteMenuOpen, setPaletteMenuOpen] = React.useState(false);
  const { mounted, palette, setPalette } = useTheme();
  const activePalette = THEME_PALETTES.find((option) => option.value === palette);
  const fallbackPalette =
    THEME_PALETTES.find((option) => option.value === DEFAULT_THEME_PALETTE) ??
    THEME_PALETTES[0];
  const displayPalette = activePalette ?? fallbackPalette;

  return (
    <div className={cn("flex h-11 w-full items-center gap-2 rounded-xl border border-border/70 bg-card/80 px-2.5 shadow-sm backdrop-blur", className)}>
      <Palette className="size-3.5 text-muted-foreground" />
      <Popover onOpenChange={setPaletteMenuOpen} open={paletteMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-label="Select colour scheme"
            className="h-8 w-full min-w-0 flex-1 justify-between border-none bg-transparent px-1.5 shadow-none hover:bg-transparent focus-visible:ring-0"
            size="sm"
            variant="ghost"
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full border border-black/10 shadow-sm"
                style={{
                  backgroundColor: (mounted ? displayPalette : fallbackPalette).swatch,
                }}
              />
              <span>{mounted ? displayPalette.label : fallbackPalette.label}</span>
            </span>
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-40 p-1"
          collisionPadding={16}
          side="bottom"
          sideOffset={8}
        >
          <div className="grid gap-1">
            {THEME_PALETTES.map((option) => {
              const isActive = option.value === palette;

              return (
                <button
                  key={option.value}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => {
                    setPalette(option.value as ThemePalette);
                    setPaletteMenuOpen(false);
                  }}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full border border-black/10 shadow-sm"
                      style={{ backgroundColor: option.swatch }}
                    />
                    <span>{option.label}</span>
                  </span>
                  <Check
                    className={cn(
                      "size-3.5 transition-opacity",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ThemeModeToggle({ className }: { className?: string }) {
  const { mounted, mode, setMode } = useTheme();
  const isDark = mode === "dark";

  return (
    <div
      className={cn(
        "flex h-11 items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/80 px-3 shadow-sm backdrop-blur",
        className
      )}
    >
      <Sun
        className={cn(
          "size-3.5 transition-colors",
          isDark ? "text-muted-foreground" : "text-primary"
        )}
      />
      <Switch
        aria-label="Toggle dark mode"
        checked={mounted ? isDark : false}
        disabled={!mounted}
        onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
      />
      <Moon
        className={cn(
          "size-3.5 transition-colors",
          isDark ? "text-primary" : "text-muted-foreground"
        )}
      />
    </div>
  );
}

export function ThemeControls({ className }: { className?: string }) {
  return (
    <div className={cn("ml-auto flex w-full items-center justify-end gap-2 max-sm:flex-wrap sm:w-auto", className)}>
      <ThemePaletteControl className="w-auto min-w-[12rem]" />
      <ThemeModeToggle />
    </div>
  );
}
