"use client";

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

import { toolCategories, type Tool } from "@/lib/tools";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/components/favorites-provider";

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

  return (
    <div className="p-6 md:p-8 lg:p-10">
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-2">
          <Star className="size-5 fill-amber-500 text-amber-500" />
          <h2 className="text-lg font-semibold text-foreground/80">
            Favourites
          </h2>
        </div>

        {mounted && favouriteTools.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favouriteTools.map((tool) => (
              <ToolCard
                key={tool.id}
                isFavourite
                onToggleFavourite={toggleFavourite}
                tool={tool}
                variant="favourite"
              />
            ))}
          </div>
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
        {toolCategories.map((category) => (
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
      </div>

      <div className="mt-16 border-t pt-8">
        <div className="max-w-2xl space-y-6">
          <h2 className="text-lg font-semibold text-foreground/80">About</h2>

          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              delphitools is a collection of small, focused utilities that
              respect your privacy and work entirely in your browser. No data
              leaves your machine, no accounts required, no tracking. Just
              tools that do what they say.
            </p>
            <p>
              I love the web. The classic, real web full of weird things. And
              that web is out there. You just have to find it. And sometimes,
              you have to make it yourself.
            </p>
          </div>

          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-medium text-foreground/80">Made by</h3>
              <p className="text-muted-foreground">
                <a
                  className="transition-colors hover:text-primary"
                  href="https://rmv.fyi"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  delphi
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-foreground/80">Source</h3>
              <p className="text-muted-foreground">
                <a
                  className="transition-colors hover:text-primary"
                  href="https://github.com/1612elphi/delphitools"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  1612elphi/delphitools
                </a>
              </p>
            </div>
          </div>

          <div className="border-t border-border/50 pt-4">
            <p className="text-xs text-muted-foreground/60">
              Built with Next.js, Tailwind CSS, and shadcn/ui. All processing
              happens locally in your browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
