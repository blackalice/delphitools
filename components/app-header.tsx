"use client";

import { usePathname } from "next/navigation";
import { Home, Star } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getToolById, getCategoryByToolId } from "@/lib/tools";
import { Badge } from "@/components/ui/badge";
import { ThemeControls } from "@/components/theme-switch";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/components/favorites-provider";

export function AppHeader() {
  const pathname = usePathname();
  const { mounted, favouriteIds, toggleFavourite } = useFavorites();

  // Extract tool ID from pathname
  const toolId = pathname.startsWith("/tools/")
    ? pathname.replace("/tools/", "")
    : null;

  const tool = toolId ? getToolById(toolId) : null;
  const category = toolId ? getCategoryByToolId(toolId) : null;
  const isFavourite = tool ? favouriteIds.includes(tool.id) : false;

  return (
    <header className="sticky top-0 z-50 flex min-h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {tool ? (
        <div className="min-w-0 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <tool.icon className="size-5 text-muted-foreground" />
            <h1 className="truncate text-lg font-semibold">{tool.name}</h1>
          </div>
          {category && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {category.name}
            </Badge>
          )}
          {mounted && (
            <Button
              aria-label={
                isFavourite
                  ? `Remove ${tool.name} from favourites`
                  : `Add ${tool.name} to favourites`
              }
              className="h-8 gap-1.5 px-2.5 text-amber-700 dark:text-amber-400"
              onClick={() => toggleFavourite(tool.id)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Star
                className={isFavourite ? "fill-amber-500 text-amber-500" : ""}
              />
              <span className="hidden sm:inline">
                {isFavourite ? "Favourited" : "Favourite"}
              </span>
            </Button>
          )}
        </div>
      ) : pathname === "/" ? (
        <div className="min-w-0 flex items-center gap-2">
          <Home className="size-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Home</h1>
        </div>
      ) : (
        <div className="min-w-0 flex items-center gap-2">
          <img src="/pickles.jpeg" width={40} height={40} alt="pickletools logo" className="size-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">pickletools</h1>
        </div>
      )}

      <ThemeControls />
    </header>
  );
}
