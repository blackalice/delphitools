"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  matchesToolSearch,
  searchToolCategories,
  type Tool,
  type ToolCategory,
} from "@/lib/tools";

type ToolSearchContextValue = {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  deferredSearchQuery: string;
  hasActiveSearch: boolean;
  filterTools: (tools: Tool[]) => Tool[];
  filteredCategories: ToolCategory[];
};

const ToolSearchContext = React.createContext<ToolSearchContextValue | null>(null);

export function ToolSearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQueryState] = React.useState("");
  const searchQueryRef = React.useRef(searchQuery);
  const deferredSearchQuery = React.useDeferredValue(searchQuery);

  const readUrlSearchQuery = React.useCallback(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return new URLSearchParams(window.location.search).get("q") ?? "";
  }, []);

  React.useEffect(() => {
    const urlSearchQuery = readUrlSearchQuery();

    if (urlSearchQuery !== searchQueryRef.current) {
      searchQueryRef.current = urlSearchQuery;
      setSearchQueryState(urlSearchQuery);
    }
  }, [pathname, readUrlSearchQuery, router]);

  const setSearchQuery = React.useCallback<
    React.Dispatch<React.SetStateAction<string>>
  >((value) => {
    const nextValue =
      typeof value === "function" ? value(searchQueryRef.current) : value;

    searchQueryRef.current = nextValue;
    setSearchQueryState(nextValue);

    const nextSearchParams = new URLSearchParams(
      typeof window === "undefined" ? "" : window.location.search
    );

    if (nextValue.trim()) {
      nextSearchParams.set("q", nextValue);
    } else {
      nextSearchParams.delete("q");
    }

    const nextUrl = nextSearchParams.toString()
      ? `${pathname}?${nextSearchParams.toString()}`
      : pathname;

    React.startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }, [pathname, router]);

  const filteredCategories = React.useMemo(
    () => searchToolCategories(deferredSearchQuery),
    [deferredSearchQuery]
  );

  const filterTools = React.useCallback(
    (tools: Tool[]) =>
      tools.filter((tool) => matchesToolSearch(tool, deferredSearchQuery)),
    [deferredSearchQuery]
  );

  const value = React.useMemo<ToolSearchContextValue>(
    () => ({
      searchQuery,
      setSearchQuery,
      deferredSearchQuery,
      hasActiveSearch: deferredSearchQuery.trim().length > 0,
      filterTools,
      filteredCategories,
    }),
    [
      deferredSearchQuery,
      filterTools,
      filteredCategories,
      searchQuery,
      setSearchQuery,
    ]
  );

  return (
    <ToolSearchContext.Provider value={value}>
      {children}
    </ToolSearchContext.Provider>
  );
}

export function useToolSearch() {
  const context = React.useContext(ToolSearchContext);

  if (!context) {
    throw new Error("useToolSearch must be used within ToolSearchProvider");
  }

  return context;
}
