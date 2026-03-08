"use client";

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

import { type Tool } from "@/lib/tools";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/components/favorites-provider";
import { useToolSearch } from "@/components/tool-search-provider";

function ToolCard({
  tool,
  isFavourite,
  onToggleFavourite,
  variant = "default",
}: {
  tool: Tool;
  isFavourite: boolean;
  onToggleFavourite: (toolId: string) => void;
  variant?: "default" | "favourite";
}) {
  const Icon = tool.icon;
  const cardClasses =
    variant === "favourite"
      ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 hover:bg-amber-500/10"
      : "hover:border-foreground/20";
  const iconWrapClasses =
    variant === "favourite"
      ? "bg-amber-500/10 group-hover:bg-amber-500/20"
      : "bg-muted group-hover:bg-primary/10";
  const iconClasses =
    variant === "favourite"
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground group-hover:text-primary";
  const arrowClasses =
    variant === "favourite"
      ? "text-amber-500/50"
      : "text-muted-foreground/50";

  return (
    <Card
      className={`group relative h-full transition-all hover:shadow-md ${cardClasses}`}
    >
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <ArrowRight
          className={`pointer-events-none size-4 opacity-0 transition-opacity group-hover:opacity-100 ${arrowClasses}`}
        />
        <button
          aria-label={
            isFavourite
              ? `Remove ${tool.name} from favorites`
              : `Add ${tool.name} to favorites`
          }
          className="rounded-full p-1.5 text-muted-foreground/70 transition-colors hover:bg-background hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onToggleFavourite(tool.id)}
          type="button"
        >
          <Star
            className={`size-4 transition-colors ${
              isFavourite ? "fill-amber-500 text-amber-500" : "fill-transparent"
            }`}
          />
        </button>
      </div>

      <Link className="block h-full" href={tool.href}>
        <CardHeader className="h-full pb-4 pr-16">
          <div
            className={`flex size-10 items-center justify-center rounded-lg transition-colors ${iconWrapClasses}`}
          >
            <Icon className={`size-5 transition-colors ${iconClasses}`} />
          </div>
          <CardTitle className="mt-3 flex items-center gap-2 text-base">
            {tool.name}
            {tool.beta && (
              <Badge
                className="border-amber-500/50 px-1.5 py-0 text-[10px] text-amber-600 dark:text-amber-400"
                variant="outline"
              >
                Beta
              </Badge>
            )}
            {tool.new && (
              <Badge
                className="border-primary/50 px-1.5 py-0 text-[10px] text-primary"
                variant="outline"
              >
                New
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-sm">
            {tool.description}
          </CardDescription>
        </CardHeader>
      </Link>
    </Card>
  );
}

export default function Home() {
  const { mounted, favouriteIds, favouriteTools, toggleFavourite } =
    useFavorites();
  const {
    deferredSearchQuery,
    hasActiveSearch,
    filterTools,
    filteredCategories,
  } = useToolSearch();
  const filteredFavouriteTools = filterTools(favouriteTools);
  const hasCategoryResults = filteredCategories.length > 0;
  const hasFavouriteResults = filteredFavouriteTools.length > 0;

  return (
    <div className="p-6 md:p-8 lg:p-10">
      <section className="mb-10">
        <div className="max-w-2xl space-y-1">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Tool Library</h1>
            <p className="text-sm text-muted-foreground">
              Use the sidebar search to filter both the sidebar and this page.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <div className="mb-4 flex items-center gap-2">
          <Star className="size-5 fill-amber-500 text-amber-500" />
          <h2 className="text-lg font-semibold text-foreground/80">
            Favourites
          </h2>
        </div>

        {mounted && favouriteTools.length > 0 && (!hasActiveSearch || hasFavouriteResults) ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFavouriteTools.map((tool) => (
              <ToolCard
                key={tool.id}
                isFavourite
                onToggleFavourite={toggleFavourite}
                tool={tool}
                variant="favourite"
              />
            ))}
          </div>
        ) : hasActiveSearch ? (
          <Card className="border-dashed bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">No favourite matches</CardTitle>
              <CardDescription>
                No favourited tools match &quot;{deferredSearchQuery.trim()}&quot;.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card className="border-dashed bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">No favourites yet</CardTitle>
              <CardDescription>
                Use the star button on any tool below to add it to this section.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>

      <div className="space-y-10">
        {filteredCategories.map((category) => (
          <section key={category.id}>
            <h2 className="mb-4 text-lg font-semibold text-foreground/80">
              {category.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {category.tools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  isFavourite={favouriteIds.includes(tool.id)}
                  onToggleFavourite={toggleFavourite}
                  tool={tool}
                />
              ))}
            </div>
          </section>
        ))}

        {hasActiveSearch && !hasCategoryResults && (
          <Card className="border-dashed bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">No tools found</CardTitle>
              <CardDescription>
                No tools match &quot;{deferredSearchQuery.trim()}&quot;.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      
    </div>
  );
}
