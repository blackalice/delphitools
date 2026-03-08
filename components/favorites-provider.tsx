"use client";

import * as React from "react";

import { allTools, type Tool } from "@/lib/tools";
import { FAVORITES_STORAGE_KEY } from "@/lib/favorites";

type FavoritesContextValue = {
  favouriteIds: string[];
  favouriteTools: Tool[];
  mounted: boolean;
  toggleFavourite: (toolId: string) => void;
};

const FavoritesContext = React.createContext<FavoritesContextValue | null>(null);

function getStoredFavorites() {
  try {
    const storedFavorites = window.localStorage.getItem(FAVORITES_STORAGE_KEY);

    if (!storedFavorites) {
      return [];
    }

    const parsedFavorites = JSON.parse(storedFavorites);

    if (!Array.isArray(parsedFavorites)) {
      return [];
    }

    return parsedFavorites.filter(
      (id): id is string =>
        typeof id === "string" && allTools.some((tool) => tool.id === id)
    );
  } catch {
    return [];
  }
}

function saveFavorites(favorites: string[]) {
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}

export function FavoritesProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mounted, setMounted] = React.useState(false);
  const [favouriteIds, setFavouriteIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    setFavouriteIds(getStoredFavorites());
    setMounted(true);

    function handleStorage(event: StorageEvent) {
      if (event.key && event.key !== FAVORITES_STORAGE_KEY) {
        return;
      }

      setFavouriteIds(getStoredFavorites());
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function toggleFavourite(toolId: string) {
    setFavouriteIds((currentFavourites) => {
      const nextFavourites = currentFavourites.includes(toolId)
        ? currentFavourites.filter((id) => id !== toolId)
        : [...currentFavourites, toolId];

      saveFavorites(nextFavourites);
      return nextFavourites;
    });
  }

  const favouriteTools = favouriteIds
    .map((id) => allTools.find((tool) => tool.id === id))
    .filter((tool): tool is Tool => tool !== undefined);

  const value = {
    mounted,
    favouriteIds,
    favouriteTools,
    toggleFavourite,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = React.useContext(FavoritesContext);

  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider.");
  }

  return context;
}
