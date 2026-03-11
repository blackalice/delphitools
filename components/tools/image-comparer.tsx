"use client";

import NextImage from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Eye, Layers, ScanSearch, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type CompareView = "side-by-side" | "overlay" | "difference" | "swipe";
type DifferenceStyle = "absolute" | "heatmap";

interface LoadedImage {
  url: string;
  name: string;
  width: number;
  height: number;
}

interface DifferenceResult {
  sourceKey: string | null;
  imageUrl: string | null;
  error: string | null;
}

const VIEW_COPY: Record<CompareView, { title: string; description: string }> = {
  difference: {
    title: "Difference",
    description: "Generate a difference layer that highlights changed pixels.",
  },
  "side-by-side": {
    title: "Side by Side",
    description: "View both images next to each other at the same scale.",
  },
  overlay: {
    title: "Overlay",
    description: "Stack the images and fade the top image with an opacity slider.",
  },
  swipe: {
    title: "Swipe",
    description: "Use a reveal slider to scrub between the two images.",
  },
};

const readImageFile = (file: File): Promise<LoadedImage> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        url: objectUrl,
        name: file.name,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read ${file.name}.`));
    };

    image.src = objectUrl;
  });

const loadImageElement = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not prepare the preview image."));
    image.src = url;
  });

const drawContainedImage = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) => {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
};

const generateDifferenceImage = async (
  first: LoadedImage,
  second: LoadedImage,
  style: DifferenceStyle
) => {
  const [imageA, imageB] = await Promise.all([loadImageElement(first.url), loadImageElement(second.url)]);
  const width = Math.max(imageA.naturalWidth, imageB.naturalWidth);
  const height = Math.max(imageA.naturalHeight, imageB.naturalHeight);

  const canvasA = document.createElement("canvas");
  const canvasB = document.createElement("canvas");
  const output = document.createElement("canvas");
  canvasA.width = canvasB.width = output.width = width;
  canvasA.height = canvasB.height = output.height = height;

  const ctxA = canvasA.getContext("2d");
  const ctxB = canvasB.getContext("2d");
  const outCtx = output.getContext("2d");

  if (!ctxA || !ctxB || !outCtx) {
    throw new Error("Could not create the comparison canvas.");
  }

  drawContainedImage(ctxA, imageA, width, height);
  drawContainedImage(ctxB, imageB, width, height);

  const dataA = ctxA.getImageData(0, 0, width, height);
  const dataB = ctxB.getImageData(0, 0, width, height);
  const out = outCtx.createImageData(width, height);

  for (let i = 0; i < out.data.length; i += 4) {
    const diffR = Math.abs(dataA.data[i] - dataB.data[i]);
    const diffG = Math.abs(dataA.data[i + 1] - dataB.data[i + 1]);
    const diffB = Math.abs(dataA.data[i + 2] - dataB.data[i + 2]);
    const intensity = (diffR + diffG + diffB) / 3;

    if (style === "heatmap") {
      out.data[i] = Math.min(255, intensity * 2.1);
      out.data[i + 1] = Math.min(255, Math.max(0, (intensity - 16) * 1.2));
      out.data[i + 2] = Math.max(0, 255 - intensity * 1.4);
      out.data[i + 3] = 255;
    } else {
      out.data[i] = diffR;
      out.data[i + 1] = diffG;
      out.data[i + 2] = diffB;
      out.data[i + 3] = 255;
    }
  }

  outCtx.putImageData(out, 0, 0);

  return output.toDataURL("image/png");
};

function UploadTile({
  label,
  image,
  onFile,
  onClear,
}: {
  label: string;
  image: LoadedImage | null;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputId = `compare-upload-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium">{label}</label>
        {image && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <X className="mr-2 size-4" />
            Clear
          </Button>
        )}
      </div>

      {!image ? (
        <label
          htmlFor={inputId}
          className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center transition-colors hover:bg-muted/70"
        >
          <Upload className="size-6 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Choose an image</p>
            <p className="text-xs text-muted-foreground">PNG, JPEG, WebP, GIF and other browser-readable formats.</p>
          </div>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onFile(file);
              }
              event.currentTarget.value = "";
            }}
          />
        </label>
      ) : (
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="truncate">{image.name}</span>
            <span>
              {image.width} × {image.height}
            </span>
          </div>
          <div className="relative h-48 overflow-hidden rounded-lg border border-border bg-muted/50">
            <NextImage src={image.url} alt={label} fill unoptimized className="object-contain" sizes="320px" />
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-[linear-gradient(45deg,rgba(255,255,255,0.02)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.02)_75%),linear-gradient(45deg,rgba(255,255,255,0.02)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.02)_75%)] bg-[length:24px_24px] bg-[position:0_0,12px_12px] bg-muted/30",
        className
      )}
    >
      <div className="relative aspect-[16/10] w-full">{children}</div>
    </div>
  );
}

export function ImageComparerTool() {
  const [firstImage, setFirstImage] = useState<LoadedImage | null>(null);
  const [secondImage, setSecondImage] = useState<LoadedImage | null>(null);
  const [view, setView] = useState<CompareView>("difference");
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [swipePosition, setSwipePosition] = useState(50);
  const [differenceStyle, setDifferenceStyle] = useState<DifferenceStyle>("absolute");
  const [differenceResult, setDifferenceResult] = useState<DifferenceResult>({
    sourceKey: null,
    imageUrl: null,
    error: null,
  });
  const firstImageRef = useRef<LoadedImage | null>(null);
  const secondImageRef = useRef<LoadedImage | null>(null);

  const clearLoadedImage = useCallback((image: LoadedImage | null) => {
    if (image) {
      URL.revokeObjectURL(image.url);
    }
  }, []);

  useEffect(() => {
    firstImageRef.current = firstImage;
    secondImageRef.current = secondImage;
  }, [firstImage, secondImage]);

  useEffect(() => {
    return () => {
      clearLoadedImage(firstImageRef.current);
      clearLoadedImage(secondImageRef.current);
    };
  }, [clearLoadedImage]);

  const differenceSourceKey = useMemo(() => {
    if (!firstImage || !secondImage) {
      return null;
    }

    return [firstImage.url, secondImage.url, differenceStyle].join("|");
  }, [differenceStyle, firstImage, secondImage]);

  const loadIntoSlot = useCallback(
    async (file: File, slot: "first" | "second") => {
      const loaded = await readImageFile(file);

      if (slot === "first") {
        clearLoadedImage(firstImage);
        setFirstImage(loaded);
      } else {
        clearLoadedImage(secondImage);
        setSecondImage(loaded);
      }
    },
    [clearLoadedImage, firstImage, secondImage]
  );

  useEffect(() => {
    let cancelled = false;

    if (!firstImage || !secondImage || !differenceSourceKey) {
      return;
    }

    generateDifferenceImage(firstImage, secondImage, differenceStyle)
      .then((url) => {
        if (!cancelled) {
          setDifferenceResult({
            sourceKey: differenceSourceKey,
            imageUrl: url,
            error: null,
          });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setDifferenceResult({
            sourceKey: differenceSourceKey,
            imageUrl: null,
            error: error.message,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [differenceSourceKey, differenceStyle, firstImage, secondImage]);

  const comparisonWarnings = useMemo(() => {
    const warnings: string[] = [];

    if (firstImage && secondImage && (firstImage.width !== secondImage.width || firstImage.height !== secondImage.height)) {
      warnings.push("The images have different dimensions. Overlay, swipe, and difference views align them inside a shared comparison frame.");
    }

    return warnings;
  }, [firstImage, secondImage]);

  const ready = Boolean(firstImage && secondImage);
  const activeDifferenceImage = differenceResult.sourceKey === differenceSourceKey ? differenceResult.imageUrl : null;
  const activeDifferenceError = differenceResult.sourceKey === differenceSourceKey ? differenceResult.error : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Image Comparer</CardTitle>
          <CardDescription>
            Compare two images locally with side by side, overlay, difference, and swipe views.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <UploadTile
            label="Image A"
            image={firstImage}
            onFile={(file) => void loadIntoSlot(file, "first")}
            onClear={() => {
              clearLoadedImage(firstImage);
              setFirstImage(null);
            }}
          />
          <UploadTile
            label="Image B"
            image={secondImage}
            onFile={(file) => void loadIntoSlot(file, "second")}
            onClear={() => {
              clearLoadedImage(secondImage);
              setSecondImage(null);
            }}
          />
        </CardContent>
      </Card>

      {comparisonWarnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-950 dark:bg-amber-950/20">
          <CardContent className="space-y-2 pt-6 text-sm text-amber-900 dark:text-amber-200">
            {comparisonWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs value={view} onValueChange={(value) => setView(value as CompareView)}>
        <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
          <TabsTrigger value="difference">Difference</TabsTrigger>
          <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
          <TabsTrigger value="overlay">Overlay</TabsTrigger>
          <TabsTrigger value="swipe">Swipe</TabsTrigger>
        </TabsList>

        {Object.entries(VIEW_COPY).map(([key, copy]) => (
          <TabsContent key={key} value={key} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {key === "side-by-side" ? (
                    <ArrowLeftRight className="size-5" />
                  ) : key === "overlay" ? (
                    <Layers className="size-5" />
                  ) : key === "difference" ? (
                    <ScanSearch className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                  {copy.title}
                </CardTitle>
                <CardDescription>{copy.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!ready ? (
                  <PreviewFrame className="flex items-center justify-center">
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                      Upload both images to start comparing them.
                    </div>
                  </PreviewFrame>
                ) : (
                  <>
                    {key === "side-by-side" && firstImage && secondImage && (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <PreviewFrame>
                          <NextImage src={firstImage.url} alt="Image A" fill unoptimized className="object-contain" sizes="(min-width: 1024px) 40vw, 100vw" />
                        </PreviewFrame>
                        <PreviewFrame>
                          <NextImage src={secondImage.url} alt="Image B" fill unoptimized className="object-contain" sizes="(min-width: 1024px) 40vw, 100vw" />
                        </PreviewFrame>
                      </div>
                    )}

                    {key === "overlay" && firstImage && secondImage && (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium">Top image opacity</span>
                            <span className="font-mono text-muted-foreground">{overlayOpacity}%</span>
                          </div>
                          <Slider value={[overlayOpacity]} min={0} max={100} step={1} onValueChange={(value) => setOverlayOpacity(value[0] ?? 50)} />
                        </div>
                        <PreviewFrame>
                          <NextImage
                            src={firstImage.url}
                            alt="Image A"
                            fill
                            unoptimized
                            className="object-contain"
                            sizes="(min-width: 1024px) 56rem, 100vw"
                          />
                          <NextImage
                            src={secondImage.url}
                            alt="Image B"
                            fill
                            unoptimized
                            className="object-contain"
                            sizes="(min-width: 1024px) 56rem, 100vw"
                            style={{ opacity: overlayOpacity / 100 }}
                          />
                        </PreviewFrame>
                      </>
                    )}

                    {key === "difference" && (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {(["absolute", "heatmap"] as DifferenceStyle[]).map((style) => (
                            <Button
                              key={style}
                              type="button"
                              variant={differenceStyle === style ? "default" : "outline"}
                              onClick={() => setDifferenceStyle(style)}
                            >
                              {style === "absolute" ? "Absolute Difference" : "Heatmap"}
                            </Button>
                          ))}
                        </div>
                        <PreviewFrame>
                          {activeDifferenceImage ? (
                            <NextImage
                              src={activeDifferenceImage}
                              alt="Difference view"
                              fill
                              unoptimized
                              className="object-contain"
                              sizes="(min-width: 1024px) 56rem, 100vw"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                              {activeDifferenceError ?? "Preparing the difference layer..."}
                            </div>
                          )}
                        </PreviewFrame>
                      </>
                    )}

                    {key === "swipe" && firstImage && secondImage && (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium">Reveal position</span>
                            <span className="font-mono text-muted-foreground">{swipePosition}%</span>
                          </div>
                          <Slider value={[swipePosition]} min={0} max={100} step={1} onValueChange={(value) => setSwipePosition(value[0] ?? 50)} />
                        </div>
                        <PreviewFrame>
                          <NextImage
                            src={firstImage.url}
                            alt="Image A"
                            fill
                            unoptimized
                            className="object-contain"
                            sizes="(min-width: 1024px) 56rem, 100vw"
                          />
                          <NextImage
                            src={secondImage.url}
                            alt="Image B"
                            fill
                            unoptimized
                            className="object-contain"
                            sizes="(min-width: 1024px) 56rem, 100vw"
                            style={{ clipPath: `inset(0 ${100 - swipePosition}% 0 0)` }}
                          />
                          <div
                            className="absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.12)]"
                            style={{ left: `calc(${swipePosition}% - 1px)` }}
                          />
                        </PreviewFrame>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
