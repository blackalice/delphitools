"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Download, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CardAction,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  useVisualEffectsImage,
  VISUAL_EFFECTS_PLACEHOLDER_IMAGE_NAME,
  VISUAL_EFFECTS_PLACEHOLDER_IMAGE_URL,
} from "@/components/visual-effects-provider";

type VisualEffectId =
  | "dithering"
  | "dots"
  | "ascii"
  | "recolor"
  | "edge"
  | "stippling"
  | "scatter"
  | "bevel"
  | "crt"
  | "patterns"
  | "distort"
  | "displace";

type DitherMode = "mono" | "colour";
type AsciiColourMode = "mono" | "source";
type PatternMode = "grid" | "diagonal" | "waves";
type WarpAxis = "horizontal" | "vertical";

const EFFECT_META: Record<
  VisualEffectId,
  { title: string; suffix: string; description: string }
> = {
  dithering: {
    title: "Dithering",
    suffix: "dithered",
    description: "Posterise an image with ordered Bayer dithering.",
  },
  dots: {
    title: "Dots",
    suffix: "halftone",
    description: "Turn an image into a dot-screen halftone.",
  },
  ascii: {
    title: "ASCII",
    suffix: "ascii",
    description: "Render the image as grid-based ASCII art.",
  },
  recolor: {
    title: "Recolor",
    suffix: "recolor",
    description: "Map image luminance between two custom colours.",
  },
  edge: {
    title: "Edge",
    suffix: "edge",
    description: "Extract high-contrast edges with a clean two-tone output.",
  },
  stippling: {
    title: "Stippling",
    suffix: "stipple",
    description: "Build a stippled illustration from deterministic dot clusters.",
  },
  scatter: {
    title: "Scatter",
    suffix: "scatter",
    description: "Break the image into offset cells for a dispersed print effect.",
  },
  bevel: {
    title: "Bevel",
    suffix: "bevel",
    description: "Shape tones into a faux-relief bevel with directional lighting.",
  },
  crt: {
    title: "CRT",
    suffix: "crt",
    description: "Add scanlines, RGB fringing, and vignette for a CRT-style display.",
  },
  patterns: {
    title: "Patterns",
    suffix: "patterns",
    description: "Overlay a structured pattern field that follows image luminance.",
  },
  distort: {
    title: "Distort",
    suffix: "distort",
    description: "Warp the image with sine-wave distortion along one axis.",
  },
  displace: {
    title: "Displace",
    suffix: "displace",
    description: "Offset pixels based on source luminance for a liquid displacement effect.",
  },
};

const BAYER_MATRICES: Record<number, number[][]> = {
  2: [
    [0, 2],
    [3, 1],
  ],
  4: [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ],
  8: [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
  ],
};

const ASCII_PRESETS = {
  classic: " .:-=+*#%@",
  dense:
    " .'`^\",:;Il!i~+_-?][}{1)(|\\\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  retro: " .,:;ox%#@",
} as const;

const DEFAULT_DISPLACEMENT_MAP_URL = "/displace.jpg";
const DEFAULT_DISPLACEMENT_MAP_NAME = "displace";

async function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the selected image."));
    image.src = dataUrl;
  });
}

function clamp(value: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, value));
}

function quantize(value: number, levels: number) {
  const safeLevels = Math.max(2, levels);
  const step = 255 / (safeLevels - 1);
  return Math.round(value / step) * step;
}

function getLuminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((value) => value + value)
          .join("")
      : normalized;

  const value = Number.parseInt(expanded, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function mixChannel(start: number, end: number, amount: number) {
  return Math.round(start + (end - start) * amount);
}

function hashNoise(x: number, y: number, seed: number) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 101.3) * 43758.5453123;
  return value - Math.floor(value);
}

function sampleChannel(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  channel: number
) {
  const clampedX = Math.max(0, Math.min(width - 1, Math.round(x)));
  const clampedY = Math.max(0, Math.min(height - 1, Math.round(y)));
  return data[(clampedY * width + clampedX) * 4 + channel];
}

function drawDitheredImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  {
    levels,
    matrixSize,
    intensity,
    mode,
  }: {
    levels: number;
    matrixSize: 2 | 4 | 8;
    intensity: number;
    mode: DitherMode;
  }
) {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.width;
  sourceCanvas.height = image.height;
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas is not available in this browser.");
  }

  sourceContext.drawImage(image, 0, 0);
  const imageData = sourceContext.getImageData(0, 0, image.width, image.height);
  const { data } = imageData;
  const matrix = BAYER_MATRICES[matrixSize];
  const thresholdScale = (intensity / 100) * 255;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      const threshold =
        (((matrix[y % matrixSize][x % matrixSize] + 0.5) /
          (matrixSize * matrixSize)) -
          0.5) *
        thresholdScale;

      if (mode === "mono") {
        const luminance = clamp(
          getLuminance(data[offset], data[offset + 1], data[offset + 2]) + threshold
        );
        const value = quantize(luminance, levels);
        data[offset] = value;
        data[offset + 1] = value;
        data[offset + 2] = value;
      } else {
        data[offset] = quantize(clamp(data[offset] + threshold), levels);
        data[offset + 1] = quantize(clamp(data[offset + 1] + threshold), levels);
        data[offset + 2] = quantize(clamp(data[offset + 2] + threshold), levels);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawDotsImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  {
    cellSize,
    dotScale,
    invert,
    foreground,
    background,
  }: {
    cellSize: number;
    dotScale: number;
    invert: boolean;
    foreground: string;
    background: string;
  }
) {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.width;
  sourceCanvas.height = image.height;
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas is not available in this browser.");
  }

  sourceContext.drawImage(image, 0, 0);
  const sourceData = sourceContext.getImageData(0, 0, image.width, image.height).data;

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, image.width, image.height);
  ctx.fillStyle = foreground;

  const maxRadius = (cellSize / 2) * (dotScale / 100);

  for (let y = 0; y < image.height; y += cellSize) {
    for (let x = 0; x < image.width; x += cellSize) {
      let weightedLuminance = 0;
      let totalAlpha = 0;

      for (let sampleY = y; sampleY < Math.min(y + cellSize, image.height); sampleY += 1) {
        for (let sampleX = x; sampleX < Math.min(x + cellSize, image.width); sampleX += 1) {
          const offset = (sampleY * image.width + sampleX) * 4;
          const alpha = sourceData[offset + 3] / 255;
          if (alpha <= 0) {
            continue;
          }

          weightedLuminance +=
            getLuminance(
              sourceData[offset],
              sourceData[offset + 1],
              sourceData[offset + 2]
            ) * alpha;
          totalAlpha += alpha;
        }
      }

      if (totalAlpha === 0) {
        continue;
      }

      const averageLuminance = weightedLuminance / totalAlpha;
      const darkness = invert
        ? averageLuminance / 255
        : 1 - averageLuminance / 255;
      const radius = maxRadius * darkness;

      if (radius <= 0.15) {
        continue;
      }

      ctx.beginPath();
      ctx.arc(
        x + Math.min(cellSize, image.width - x) / 2,
        y + Math.min(cellSize, image.height - y) / 2,
        radius,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
}

function drawAsciiImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  {
    cellSize,
    characterSet,
    invert,
    colourMode,
    foreground,
    background,
  }: {
    cellSize: number;
    characterSet: string;
    invert: boolean;
    colourMode: AsciiColourMode;
    foreground: string;
    background: string;
  }
) {
  const columns = Math.max(1, Math.floor(image.width / cellSize));
  const rows = Math.max(1, Math.floor(image.height / cellSize));
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = columns;
  sampleCanvas.height = rows;
  const sampleContext = sampleCanvas.getContext("2d");

  if (!sampleContext) {
    throw new Error("Canvas is not available in this browser.");
  }

  sampleContext.drawImage(image, 0, 0, columns, rows);
  const sampleData = sampleContext.getImageData(0, 0, columns, rows).data;

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, image.width, image.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.max(10, Math.round(cellSize * 0.95))}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const offset = (row * columns + column) * 4;
      const r = sampleData[offset];
      const g = sampleData[offset + 1];
      const b = sampleData[offset + 2];
      const alpha = sampleData[offset + 3] / 255;

      if (alpha <= 0) {
        continue;
      }

      const luminance = getLuminance(r, g, b) / 255;
      const density = invert ? luminance : 1 - luminance;
      const index = Math.min(
        characterSet.length - 1,
        Math.floor(density * (characterSet.length - 1))
      );
      const character = characterSet[index];

      if (character === " ") {
        continue;
      }

      ctx.fillStyle =
        colourMode === "source" ? `rgba(${r}, ${g}, ${b}, ${alpha})` : foreground;
      ctx.fillText(
        character,
        column * cellSize + cellSize / 2,
        row * cellSize + cellSize / 2
      );
    }
  }
}

function drawRecolorImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  {
    shadow,
    highlight,
    levels,
    contrast,
  }: {
    shadow: string;
    highlight: string;
    levels: number;
    contrast: number;
  }
) {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.width;
  sourceCanvas.height = image.height;
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas is not available in this browser.");
  }

  sourceContext.drawImage(image, 0, 0);
  const imageData = sourceContext.getImageData(0, 0, image.width, image.height);
  const { data } = imageData;
  const shadowRgb = hexToRgb(shadow);
  const highlightRgb = hexToRgb(highlight);
  const contrastFactor = contrast / 100;

  for (let index = 0; index < data.length; index += 4) {
    const luminance = getLuminance(data[index], data[index + 1], data[index + 2]) / 255;
    const adjusted = clamp(((luminance - 0.5) * contrastFactor + 0.5) * 255) / 255;
    const stepped = quantize(adjusted * 255, levels) / 255;

    data[index] = mixChannel(shadowRgb.r, highlightRgb.r, stepped);
    data[index + 1] = mixChannel(shadowRgb.g, highlightRgb.g, stepped);
    data[index + 2] = mixChannel(shadowRgb.b, highlightRgb.b, stepped);
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawEdgeImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  {
    threshold,
    thickness,
    invert,
    foreground,
    background,
  }: {
    threshold: number;
    thickness: number;
    invert: boolean;
    foreground: string;
    background: string;
  }
) {
  const width = image.width;
  const height = image.height;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas is not available in this browser.");
  }

  sourceContext.drawImage(image, 0, 0);
  const sourceData = sourceContext.getImageData(0, 0, width, height).data;
  const grayscale = new Float32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      grayscale[y * width + x] = getLuminance(
        sourceData[offset],
        sourceData[offset + 1],
        sourceData[offset + 2]
      );
    }
  }

  ctx.fillStyle = invert ? foreground : background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = invert ? background : foreground;

  const halfThickness = Math.max(0, Math.floor((thickness - 1) / 2));

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const topLeft = grayscale[(y - 1) * width + (x - 1)];
      const top = grayscale[(y - 1) * width + x];
      const topRight = grayscale[(y - 1) * width + (x + 1)];
      const left = grayscale[y * width + (x - 1)];
      const right = grayscale[y * width + (x + 1)];
      const bottomLeft = grayscale[(y + 1) * width + (x - 1)];
      const bottom = grayscale[(y + 1) * width + x];
      const bottomRight = grayscale[(y + 1) * width + (x + 1)];

      const gradientX =
        -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight;
      const gradientY =
        -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight;
      const magnitude = Math.sqrt(gradientX * gradientX + gradientY * gradientY);

      if (magnitude < threshold) {
        continue;
      }

      const drawX = x - halfThickness;
      const drawY = y - halfThickness;
      ctx.fillRect(drawX, drawY, thickness, thickness);
    }
  }
}

function drawStipplingImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  {
    cellSize,
    density,
    jitter,
    invert,
    foreground,
    background,
  }: {
    cellSize: number;
    density: number;
    jitter: number;
    invert: boolean;
    foreground: string;
    background: string;
  }
) {
  const width = image.width;
  const height = image.height;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas is not available in this browser.");
  }

  sourceContext.drawImage(image, 0, 0);
  const sourceData = sourceContext.getImageData(0, 0, width, height).data;

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = foreground;

  const maxJitter = (cellSize / 2) * (jitter / 100);
  const densityFactor = density / 100;

  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      let luminanceTotal = 0;
      let count = 0;

      for (let sampleY = y; sampleY < Math.min(y + cellSize, height); sampleY += 1) {
        for (let sampleX = x; sampleX < Math.min(x + cellSize, width); sampleX += 1) {
          const offset = (sampleY * width + sampleX) * 4;
          luminanceTotal += getLuminance(
            sourceData[offset],
            sourceData[offset + 1],
            sourceData[offset + 2]
          );
          count += 1;
        }
      }

      if (!count) {
        continue;
      }

      const luminance = luminanceTotal / count / 255;
      const weight = invert ? luminance : 1 - luminance;
      const probability = Math.min(1, weight * densityFactor * 1.6);
      const noise = hashNoise(x, y, 0.37);

      if (noise > probability) {
        continue;
      }

      const jitterX = (hashNoise(x, y, 0.61) - 0.5) * 2 * maxJitter;
      const jitterY = (hashNoise(x, y, 0.89) - 0.5) * 2 * maxJitter;
      const radius =
        Math.max(0.8, (cellSize * 0.5 * weight + 0.6) * Math.max(0.35, densityFactor));

      ctx.beginPath();
      ctx.arc(
        x + Math.min(cellSize, width - x) / 2 + jitterX,
        y + Math.min(cellSize, height - y) / 2 + jitterY,
        radius,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
}

function drawScatterImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  {
    cellSize,
    amount,
    background,
  }: {
    cellSize: number;
    amount: number;
    background: string;
  }
) {
  const width = image.width;
  const height = image.height;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas is not available in this browser.");
  }

  sourceContext.drawImage(image, 0, 0);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const maxOffset = Math.max(0, Math.round((cellSize * amount) / 100));

  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      const blockWidth = Math.min(cellSize, width - x);
      const blockHeight = Math.min(cellSize, height - y);
      const shiftX = Math.round((hashNoise(x, y, 0.17) - 0.5) * 2 * maxOffset);
      const shiftY = Math.round((hashNoise(x, y, 0.43) - 0.5) * 2 * maxOffset);

      ctx.drawImage(
        sourceCanvas,
        x,
        y,
        blockWidth,
        blockHeight,
        x + shiftX,
        y + shiftY,
        blockWidth,
        blockHeight
      );
    }
  }
}

function drawBevelImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  {
    depth,
    angle,
    shadow,
    highlight,
  }: {
    depth: number;
    angle: number;
    shadow: string;
    highlight: string;
  }
) {
  const width = image.width;
  const height = image.height;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas is not available in this browser.");
  }

  sourceContext.drawImage(image, 0, 0);
  const imageData = sourceContext.getImageData(0, 0, width, height);
  const { data } = imageData;
  const luminance = new Float32Array(width * height);
  const shadowRgb = hexToRgb(shadow);
  const highlightRgb = hexToRgb(highlight);
  const radians = (angle * Math.PI) / 180;
  const lightX = Math.cos(radians);
  const lightY = Math.sin(radians);
  const depthScale = depth / 100;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      luminance[y * width + x] = getLuminance(
        data[offset],
        data[offset + 1],
        data[offset + 2]
      );
    }
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      const lum = luminance[y * width + x] / 255;
      const left = luminance[y * width + (x - 1)];
      const right = luminance[y * width + (x + 1)];
      const top = luminance[(y - 1) * width + x];
      const bottom = luminance[(y + 1) * width + x];
      const gradientX = (right - left) / 255;
      const gradientY = (bottom - top) / 255;
      const lit = clamp((0.5 + (gradientX * lightX + gradientY * lightY) * depthScale) * 255) / 255;
      const blend = clamp((lum * 0.35 + lit * 0.65) * 255) / 255;

      data[offset] = mixChannel(shadowRgb.r, highlightRgb.r, blend);
      data[offset + 1] = mixChannel(shadowRgb.g, highlightRgb.g, blend);
      data[offset + 2] = mixChannel(shadowRgb.b, highlightRgb.b, blend);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawCrtImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  {
    scanlines,
    rgbShift,
    vignette,
    noise,
  }: {
    scanlines: number;
    rgbShift: number;
    vignette: number;
    noise: number;
  }
) {
  const width = image.width;
  const height = image.height;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas is not available in this browser.");
  }

  sourceContext.drawImage(image, 0, 0);
  const source = sourceContext.getImageData(0, 0, width, height);
  const output = ctx.createImageData(width, height);
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const red = sampleChannel(source.data, width, height, x + rgbShift, y, 0);
      const green = sampleChannel(source.data, width, height, x, y, 1);
      const blue = sampleChannel(source.data, width, height, x - rgbShift, y, 2);
      const alpha = sampleChannel(source.data, width, height, x, y, 3);
      const scanlineFactor =
        1 - ((y % 2 === 0 ? scanlines : scanlines * 0.35) / 100);
      const distance =
        Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) / maxDistance;
      const vignetteFactor = 1 - (distance * distance * vignette) / 100;
      const noiseValue = (hashNoise(x, y, 0.73) - 0.5) * 2 * (noise / 100) * 28;
      const factor = Math.max(0, scanlineFactor * vignetteFactor);

      output.data[offset] = clamp(red * factor + noiseValue);
      output.data[offset + 1] = clamp(green * factor + noiseValue);
      output.data[offset + 2] = clamp(blue * factor + noiseValue);
      output.data[offset + 3] = alpha;
    }
  }

  ctx.putImageData(output, 0, 0);
}

function drawPatternsImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  {
    mode,
    scale,
    strength,
    foreground,
    background,
    invert,
  }: {
    mode: PatternMode;
    scale: number;
    strength: number;
    foreground: string;
    background: string;
    invert: boolean;
  }
) {
  const width = image.width;
  const height = image.height;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas is not available in this browser.");
  }

  sourceContext.drawImage(image, 0, 0);
  const source = sourceContext.getImageData(0, 0, width, height).data;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = foreground;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const luminance = getLuminance(
        source[offset],
        source[offset + 1],
        source[offset + 2]
      ) / 255;
      const weight = invert ? luminance : 1 - luminance;
      const threshold = weight * (strength / 100);

      let patternValue = 0;

      if (mode === "grid") {
        patternValue =
          x % scale === 0 || y % scale === 0
            ? 1
            : 0;
      } else if (mode === "diagonal") {
        patternValue = ((x + y) % scale) < Math.max(1, scale / 3) ? 1 : 0;
      } else {
        patternValue =
          Math.sin(x / Math.max(2, scale) + y / Math.max(3, scale * 0.75)) > 0.35
            ? 1
            : 0;
      }

      if (patternValue >= 1 && threshold > 0.16) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

function drawDistortImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  {
    axis,
    amplitude,
    frequency,
  }: {
    axis: WarpAxis;
    amplitude: number;
    frequency: number;
  }
) {
  const width = image.width;
  const height = image.height;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d");

  if (!sourceContext) {
    throw new Error("Canvas is not available in this browser.");
  }

  sourceContext.drawImage(image, 0, 0);

  const waveFrequency = Math.max(0.0025, frequency / 1000);

  if (axis === "horizontal") {
    for (let y = 0; y < height; y += 1) {
      const shift = Math.sin(y * waveFrequency * Math.PI * 2) * amplitude;
      ctx.drawImage(sourceCanvas, 0, y, width, 1, shift, y, width, 1);
    }
    return;
  }

  for (let x = 0; x < width; x += 1) {
    const shift = Math.sin(x * waveFrequency * Math.PI * 2) * amplitude;
    ctx.drawImage(sourceCanvas, x, 0, 1, height, x, shift, 1, height);
  }
}

function drawDisplaceImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  displacementImage: HTMLImageElement,
  {
    axis,
    scale,
    invert,
  }: {
    axis: WarpAxis;
    scale: number;
    invert: boolean;
  }
) {
  const width = image.width;
  const height = image.height;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext("2d");
  const mapCanvas = document.createElement("canvas");
  mapCanvas.width = width;
  mapCanvas.height = height;
  const mapContext = mapCanvas.getContext("2d");

  if (!sourceContext || !mapContext) {
    throw new Error("Canvas is not available in this browser.");
  }

  sourceContext.drawImage(image, 0, 0);
  mapContext.drawImage(displacementImage, 0, 0, width, height);
  const source = sourceContext.getImageData(0, 0, width, height);
  const map = mapContext.getImageData(0, 0, width, height);
  const output = ctx.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const luminance = getLuminance(
        map.data[offset],
        map.data[offset + 1],
        map.data[offset + 2]
      ) / 255;
      const centered = (invert ? luminance : 1 - luminance) - 0.5;
      const displacement = centered * 2 * scale;
      const sampleX = axis === "horizontal" ? x + displacement : x;
      const sampleY = axis === "vertical" ? y + displacement : y;

      output.data[offset] = sampleChannel(source.data, width, height, sampleX, sampleY, 0);
      output.data[offset + 1] = sampleChannel(source.data, width, height, sampleX, sampleY, 1);
      output.data[offset + 2] = sampleChannel(source.data, width, height, sampleX, sampleY, 2);
      output.data[offset + 3] = sampleChannel(source.data, width, height, sampleX, sampleY, 3);
    }
  }

  ctx.putImageData(output, 0, 0);
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  help,
  formatValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  help?: string;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <Label>{label}</Label>
        <span className="text-sm text-muted-foreground font-mono">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([nextValue]) => onChange(nextValue)}
      />
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

export function VisualEffectStudio({ effect }: { effect: VisualEffectId }) {
  const { sharedImage, setSharedImage, resetSharedImage } =
    useVisualEffectsImage();
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ditherLevels, setDitherLevels] = useState(4);
  const [ditherMatrixSize, setDitherMatrixSize] = useState<2 | 4 | 8>(4);
  const [ditherIntensity, setDitherIntensity] = useState(70);
  const [ditherMode, setDitherMode] = useState<DitherMode>("colour");

  const [dotCellSize, setDotCellSize] = useState(12);
  const [dotScale, setDotScale] = useState(92);
  const [dotInvert, setDotInvert] = useState(false);
  const [dotForeground, setDotForeground] = useState("#101828");
  const [dotBackground, setDotBackground] = useState("#f8fafc");

  const [asciiCellSize, setAsciiCellSize] = useState(12);
  const [asciiPreset, setAsciiPreset] =
    useState<keyof typeof ASCII_PRESETS>("classic");
  const [asciiInvert, setAsciiInvert] = useState(false);
  const [asciiColourMode, setAsciiColourMode] =
    useState<AsciiColourMode>("mono");
  const [asciiForeground, setAsciiForeground] = useState("#22c55e");
  const [asciiBackground, setAsciiBackground] = useState("#020617");
  const [recolorShadow, setRecolorShadow] = useState("#0f172a");
  const [recolorHighlight, setRecolorHighlight] = useState("#f59e0b");
  const [recolorLevels, setRecolorLevels] = useState(6);
  const [recolorContrast, setRecolorContrast] = useState(120);
  const [edgeThreshold, setEdgeThreshold] = useState(120);
  const [edgeThickness, setEdgeThickness] = useState(1);
  const [edgeInvert, setEdgeInvert] = useState(false);
  const [edgeForeground, setEdgeForeground] = useState("#111827");
  const [edgeBackground, setEdgeBackground] = useState("#f9fafb");
  const [stippleCellSize, setStippleCellSize] = useState(10);
  const [stippleDensity, setStippleDensity] = useState(72);
  const [stippleJitter, setStippleJitter] = useState(48);
  const [stippleInvert, setStippleInvert] = useState(false);
  const [stippleForeground, setStippleForeground] = useState("#111827");
  const [stippleBackground, setStippleBackground] = useState("#f8fafc");
  const [scatterCellSize, setScatterCellSize] = useState(18);
  const [scatterAmount, setScatterAmount] = useState(55);
  const [scatterBackground, setScatterBackground] = useState("#f8fafc");
  const [bevelDepth, setBevelDepth] = useState(140);
  const [bevelAngle, setBevelAngle] = useState(135);
  const [bevelShadow, setBevelShadow] = useState("#1f2937");
  const [bevelHighlight, setBevelHighlight] = useState("#f9fafb");
  const [crtScanlines, setCrtScanlines] = useState(28);
  const [crtRgbShift, setCrtRgbShift] = useState(2);
  const [crtVignette, setCrtVignette] = useState(36);
  const [crtNoise, setCrtNoise] = useState(10);
  const [patternMode, setPatternMode] = useState<PatternMode>("grid");
  const [patternScale, setPatternScale] = useState(12);
  const [patternStrength, setPatternStrength] = useState(80);
  const [patternInvert, setPatternInvert] = useState(false);
  const [patternForeground, setPatternForeground] = useState("#111827");
  const [patternBackground, setPatternBackground] = useState("#f8fafc");
  const [distortAxis, setDistortAxis] = useState<WarpAxis>("horizontal");
  const [distortAmplitude, setDistortAmplitude] = useState(18);
  const [distortFrequency, setDistortFrequency] = useState(18);
  const [displaceAxis, setDisplaceAxis] = useState<WarpAxis>("horizontal");
  const [displaceScale, setDisplaceScale] = useState(18);
  const [displaceInvert, setDisplaceInvert] = useState(false);
  const [displaceMapUrl, setDisplaceMapUrl] = useState(
    DEFAULT_DISPLACEMENT_MAP_URL
  );
  const [displaceMapName, setDisplaceMapName] = useState(
    DEFAULT_DISPLACEMENT_MAP_NAME
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displacementMapInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (
      sharedImage.sourceUrl !== VISUAL_EFFECTS_PLACEHOLDER_IMAGE_URL ||
      sharedImage.imageSize.width > 0
    ) {
      return;
    }

    let cancelled = false;

    void loadImage(VISUAL_EFFECTS_PLACEHOLDER_IMAGE_URL).then((image) => {
      if (!cancelled) {
        setSharedImage({
          sourceUrl: VISUAL_EFFECTS_PLACEHOLDER_IMAGE_URL,
          baseName: VISUAL_EFFECTS_PLACEHOLDER_IMAGE_NAME,
          imageSize: { width: image.width, height: image.height },
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [setSharedImage, sharedImage.imageSize.width, sharedImage.sourceUrl]);

  useEffect(() => {
    let cancelled = false;

    async function processImage() {
      setIsProcessing(true);
      setError(null);

      try {
        const image = await loadImage(sharedImage.sourceUrl);
        if (cancelled) {
          return;
        }

        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (!canvas || !context) {
          throw new Error("Canvas is not available in this browser.");
        }

        canvas.width = image.width;
        canvas.height = image.height;
        context.clearRect(0, 0, image.width, image.height);

        if (effect === "dithering") {
          drawDitheredImage(context, image, {
            levels: ditherLevels,
            matrixSize: ditherMatrixSize,
            intensity: ditherIntensity,
            mode: ditherMode,
          });
        } else if (effect === "dots") {
          drawDotsImage(context, image, {
            cellSize: dotCellSize,
            dotScale,
            invert: dotInvert,
            foreground: dotForeground,
            background: dotBackground,
          });
        } else if (effect === "ascii") {
          drawAsciiImage(context, image, {
            cellSize: asciiCellSize,
            characterSet: ASCII_PRESETS[asciiPreset],
            invert: asciiInvert,
            colourMode: asciiColourMode,
            foreground: asciiForeground,
            background: asciiBackground,
          });
        } else if (effect === "recolor") {
          drawRecolorImage(context, image, {
            shadow: recolorShadow,
            highlight: recolorHighlight,
            levels: recolorLevels,
            contrast: recolorContrast,
          });
        } else if (effect === "edge") {
          drawEdgeImage(context, image, {
            threshold: edgeThreshold,
            thickness: edgeThickness,
            invert: edgeInvert,
            foreground: edgeForeground,
            background: edgeBackground,
          });
        } else if (effect === "stippling") {
          drawStipplingImage(context, image, {
            cellSize: stippleCellSize,
            density: stippleDensity,
            jitter: stippleJitter,
            invert: stippleInvert,
            foreground: stippleForeground,
            background: stippleBackground,
          });
        } else if (effect === "scatter") {
          drawScatterImage(context, image, {
            cellSize: scatterCellSize,
            amount: scatterAmount,
            background: scatterBackground,
          });
        } else if (effect === "bevel") {
          drawBevelImage(context, image, {
            depth: bevelDepth,
            angle: bevelAngle,
            shadow: bevelShadow,
            highlight: bevelHighlight,
          });
        } else if (effect === "crt") {
          drawCrtImage(context, image, {
            scanlines: crtScanlines,
            rgbShift: crtRgbShift,
            vignette: crtVignette,
            noise: crtNoise,
          });
        } else if (effect === "patterns") {
          drawPatternsImage(context, image, {
            mode: patternMode,
            scale: patternScale,
            strength: patternStrength,
            foreground: patternForeground,
            background: patternBackground,
            invert: patternInvert,
          });
        } else if (effect === "distort") {
          drawDistortImage(context, image, {
            axis: distortAxis,
            amplitude: distortAmplitude,
            frequency: distortFrequency,
          });
        } else {
          const displacementImage = await loadImage(displaceMapUrl);
          if (cancelled) {
            return;
          }

          drawDisplaceImage(context, image, displacementImage, {
            axis: displaceAxis,
            scale: displaceScale,
            invert: displaceInvert,
          });
        }

        if (!cancelled) {
          setOutputUrl(canvas.toDataURL("image/png"));
        }
      } catch (processingError) {
        if (!cancelled) {
          setError(
            processingError instanceof Error
              ? processingError.message
              : "The effect could not be generated."
          );
          setOutputUrl(null);
        }
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
        }
      }
    }

    void processImage();

    return () => {
      cancelled = true;
    };
  }, [
    asciiBackground,
    asciiCellSize,
    asciiColourMode,
    asciiForeground,
    asciiInvert,
    asciiPreset,
    ditherIntensity,
    ditherLevels,
    ditherMatrixSize,
    ditherMode,
    dotBackground,
    dotCellSize,
    dotForeground,
    dotInvert,
    dotScale,
    edgeBackground,
    edgeForeground,
    edgeInvert,
    edgeThickness,
    edgeThreshold,
    effect,
    recolorContrast,
    recolorHighlight,
    recolorLevels,
    recolorShadow,
    scatterAmount,
    scatterBackground,
    scatterCellSize,
    sharedImage.sourceUrl,
    bevelAngle,
    bevelDepth,
    bevelHighlight,
    bevelShadow,
    crtNoise,
    crtRgbShift,
    crtScanlines,
    crtVignette,
    displaceAxis,
    displaceInvert,
    displaceMapUrl,
    displaceScale,
    distortAmplitude,
    distortAxis,
    distortFrequency,
    patternBackground,
    patternForeground,
    patternInvert,
    patternMode,
    patternScale,
    patternStrength,
    stippleBackground,
    stippleCellSize,
    stippleDensity,
    stippleForeground,
    stippleInvert,
    stippleJitter,
  ]);

  function readFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;

      if (typeof dataUrl !== "string") {
        setError("The selected file could not be read.");
        return;
      }

      try {
        const image = await loadImage(dataUrl);
        setSharedImage({
          sourceUrl: dataUrl,
          baseName: file.name.replace(/\.[^.]+$/, "") || "effect",
          imageSize: { width: image.width, height: image.height },
        });
        setOutputUrl(null);
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "The selected file could not be loaded."
        );
      }
    };

    reader.readAsDataURL(file);
  }

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      readFile(file);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      readFile(file);
    }
  }

  function readDisplacementMap(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file for the displacement map.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;

      if (typeof dataUrl !== "string") {
        setError("The displacement map could not be read.");
        return;
      }

      try {
        await loadImage(dataUrl);
        setDisplaceMapUrl(dataUrl);
        setDisplaceMapName(file.name.replace(/\.[^.]+$/, "") || "displace-map");
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "The displacement map could not be loaded."
        );
      }
    };

    reader.readAsDataURL(file);
  }

  function handleDisplacementMapSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      readDisplacementMap(file);
    }
  }

  function clearImage() {
    resetSharedImage();
    setOutputUrl(null);
    setError(null);
  }

  function downloadResult() {
    if (!outputUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = outputUrl;
    link.download = `${sharedImage.baseName}-${EFFECT_META[effect].suffix}.png`;
    link.click();
  }

  function renderControls() {
    if (effect === "dithering") {
      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Dither mode</Label>
              <Select
                value={ditherMode}
                onValueChange={(value) => setDitherMode(value as DitherMode)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="colour">Colour</SelectItem>
                  <SelectItem value="mono">Monochrome</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Matrix</Label>
              <Select
                value={String(ditherMatrixSize)}
                onValueChange={(value) =>
                  setDitherMatrixSize(Number(value) as 2 | 4 | 8)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 x 2</SelectItem>
                  <SelectItem value="4">4 x 4</SelectItem>
                  <SelectItem value="8">8 x 8</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <SliderField
            label="Poster levels"
            value={ditherLevels}
            min={2}
            max={8}
            step={1}
            onChange={setDitherLevels}
            help="Lower levels produce a harsher, print-like effect."
          />

          <SliderField
            label="Threshold strength"
            value={ditherIntensity}
            min={10}
            max={100}
            step={1}
            onChange={setDitherIntensity}
            formatValue={(value) => `${value}%`}
            help="Controls how strongly the Bayer pattern pushes values up and down."
          />
        </div>
      );
    }

    if (effect === "dots") {
      return (
        <div className="space-y-5">
          <SliderField
            label="Grid size"
            value={dotCellSize}
            min={6}
            max={32}
            step={1}
            onChange={setDotCellSize}
            formatValue={(value) => `${value}px`}
            help="Higher values create larger, chunkier dots."
          />

          <SliderField
            label="Dot scale"
            value={dotScale}
            min={30}
            max={100}
            step={1}
            onChange={setDotScale}
            formatValue={(value) => `${value}%`}
            help="Limits the maximum dot radius inside each grid cell."
          />

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor="dots-invert">Invert density</Label>
              <p className="text-xs text-muted-foreground">
                Dark areas become sparse and light areas become dense.
              </p>
            </div>
            <Switch
              id="dots-invert"
              checked={dotInvert}
              onCheckedChange={setDotInvert}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dots-foreground">Dot colour</Label>
              <Input
                id="dots-foreground"
                type="color"
                value={dotForeground}
                onChange={(event) => setDotForeground(event.target.value)}
                className="h-11 p-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dots-background">Background</Label>
              <Input
                id="dots-background"
                type="color"
                value={dotBackground}
                onChange={(event) => setDotBackground(event.target.value)}
                className="h-11 p-1"
              />
            </div>
          </div>
        </div>
      );
    }

    if (effect === "recolor") {
      return (
        <div className="space-y-5">
          <SliderField
            label="Poster levels"
            value={recolorLevels}
            min={2}
            max={12}
            step={1}
            onChange={setRecolorLevels}
            help="Lower levels flatten tones into fewer colour steps."
          />

          <SliderField
            label="Contrast"
            value={recolorContrast}
            min={60}
            max={180}
            step={1}
            onChange={setRecolorContrast}
            formatValue={(value) => `${value}%`}
            help="Push the luminance mapping harder into shadows and highlights."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recolor-shadow">Shadow colour</Label>
              <Input
                id="recolor-shadow"
                type="color"
                value={recolorShadow}
                onChange={(event) => setRecolorShadow(event.target.value)}
                className="h-11 p-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recolor-highlight">Highlight colour</Label>
              <Input
                id="recolor-highlight"
                type="color"
                value={recolorHighlight}
                onChange={(event) => setRecolorHighlight(event.target.value)}
                className="h-11 p-1"
              />
            </div>
          </div>
        </div>
      );
    }

    if (effect === "edge") {
      return (
        <div className="space-y-5">
          <SliderField
            label="Threshold"
            value={edgeThreshold}
            min={20}
            max={255}
            step={1}
            onChange={setEdgeThreshold}
            help="Higher values keep only stronger edges."
          />

          <SliderField
            label="Thickness"
            value={edgeThickness}
            min={1}
            max={4}
            step={1}
            onChange={setEdgeThickness}
            formatValue={(value) => `${value}px`}
            help="Expands detected lines for a chunkier outline."
          />

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor="edge-invert">Invert output</Label>
              <p className="text-xs text-muted-foreground">
                Swap line and background colours.
              </p>
            </div>
            <Switch
              id="edge-invert"
              checked={edgeInvert}
              onCheckedChange={setEdgeInvert}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edge-foreground">Line colour</Label>
              <Input
                id="edge-foreground"
                type="color"
                value={edgeForeground}
                onChange={(event) => setEdgeForeground(event.target.value)}
                className="h-11 p-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edge-background">Background</Label>
              <Input
                id="edge-background"
                type="color"
                value={edgeBackground}
                onChange={(event) => setEdgeBackground(event.target.value)}
                className="h-11 p-1"
              />
            </div>
          </div>
        </div>
      );
    }

    if (effect === "stippling") {
      return (
        <div className="space-y-5">
          <SliderField
            label="Grid size"
            value={stippleCellSize}
            min={6}
            max={24}
            step={1}
            onChange={setStippleCellSize}
            formatValue={(value) => `${value}px`}
            help="Sets the base spacing between stipple samples."
          />

          <SliderField
            label="Density"
            value={stippleDensity}
            min={20}
            max={100}
            step={1}
            onChange={setStippleDensity}
            formatValue={(value) => `${value}%`}
            help="Controls how often a sampled cell produces a dot."
          />

          <SliderField
            label="Jitter"
            value={stippleJitter}
            min={0}
            max={100}
            step={1}
            onChange={setStippleJitter}
            formatValue={(value) => `${value}%`}
            help="Offsets dots within the cell for a more organic drawing."
          />

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor="stippling-invert">Invert density</Label>
              <p className="text-xs text-muted-foreground">
                Dense dots will follow light areas instead of dark ones.
              </p>
            </div>
            <Switch
              id="stippling-invert"
              checked={stippleInvert}
              onCheckedChange={setStippleInvert}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stippling-foreground">Dot colour</Label>
              <Input
                id="stippling-foreground"
                type="color"
                value={stippleForeground}
                onChange={(event) => setStippleForeground(event.target.value)}
                className="h-11 p-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stippling-background">Background</Label>
              <Input
                id="stippling-background"
                type="color"
                value={stippleBackground}
                onChange={(event) => setStippleBackground(event.target.value)}
                className="h-11 p-1"
              />
            </div>
          </div>
        </div>
      );
    }

    if (effect === "scatter") {
      return (
        <div className="space-y-5">
          <SliderField
            label="Cell size"
            value={scatterCellSize}
            min={8}
            max={36}
            step={1}
            onChange={setScatterCellSize}
            formatValue={(value) => `${value}px`}
            help="Larger cells keep more of the original image intact."
          />

          <SliderField
            label="Scatter amount"
            value={scatterAmount}
            min={0}
            max={100}
            step={1}
            onChange={setScatterAmount}
            formatValue={(value) => `${value}%`}
            help="Offsets each cell further away from its original position."
          />

          <div className="space-y-2">
            <Label htmlFor="scatter-background">Background</Label>
            <Input
              id="scatter-background"
              type="color"
              value={scatterBackground}
              onChange={(event) => setScatterBackground(event.target.value)}
              className="h-11 p-1"
            />
          </div>
        </div>
      );
    }

    if (effect === "bevel") {
      return (
        <div className="space-y-5">
          <SliderField
            label="Depth"
            value={bevelDepth}
            min={40}
            max={220}
            step={1}
            onChange={setBevelDepth}
            formatValue={(value) => `${value}%`}
            help="Controls how aggressively gradients are turned into relief."
          />

          <SliderField
            label="Light angle"
            value={bevelAngle}
            min={0}
            max={360}
            step={5}
            onChange={setBevelAngle}
            formatValue={(value) => `${value}deg`}
            help="Rotate the imaginary light source around the image."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bevel-shadow">Shadow colour</Label>
              <Input
                id="bevel-shadow"
                type="color"
                value={bevelShadow}
                onChange={(event) => setBevelShadow(event.target.value)}
                className="h-11 p-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bevel-highlight">Highlight colour</Label>
              <Input
                id="bevel-highlight"
                type="color"
                value={bevelHighlight}
                onChange={(event) => setBevelHighlight(event.target.value)}
                className="h-11 p-1"
              />
            </div>
          </div>
        </div>
      );
    }

    if (effect === "crt") {
      return (
        <div className="space-y-5">
          <SliderField
            label="Scanlines"
            value={crtScanlines}
            min={0}
            max={60}
            step={1}
            onChange={setCrtScanlines}
            formatValue={(value) => `${value}%`}
            help="Darkens alternating rows to mimic a display scan pattern."
          />

          <SliderField
            label="RGB shift"
            value={crtRgbShift}
            min={0}
            max={6}
            step={1}
            onChange={setCrtRgbShift}
            formatValue={(value) => `${value}px`}
            help="Offsets red and blue channels for chromatic fringing."
          />

          <SliderField
            label="Vignette"
            value={crtVignette}
            min={0}
            max={70}
            step={1}
            onChange={setCrtVignette}
            formatValue={(value) => `${value}%`}
            help="Darkens the outer edges like a curved CRT face."
          />

          <SliderField
            label="Noise"
            value={crtNoise}
            min={0}
            max={30}
            step={1}
            onChange={setCrtNoise}
            formatValue={(value) => `${value}%`}
            help="Adds subtle analog shimmer to the output."
          />
        </div>
      );
    }

    if (effect === "patterns") {
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Pattern mode</Label>
            <Select
              value={patternMode}
              onValueChange={(value) => setPatternMode(value as PatternMode)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="diagonal">Diagonal</SelectItem>
                <SelectItem value="waves">Waves</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SliderField
            label="Scale"
            value={patternScale}
            min={4}
            max={28}
            step={1}
            onChange={setPatternScale}
            formatValue={(value) => `${value}px`}
            help="Controls the spacing of the generated pattern."
          />

          <SliderField
            label="Strength"
            value={patternStrength}
            min={10}
            max={100}
            step={1}
            onChange={setPatternStrength}
            formatValue={(value) => `${value}%`}
            help="Maps more of the image luminance into the pattern field."
          />

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor="patterns-invert">Invert mapping</Label>
              <p className="text-xs text-muted-foreground">
                Apply the pattern more strongly to light areas instead of dark ones.
              </p>
            </div>
            <Switch
              id="patterns-invert"
              checked={patternInvert}
              onCheckedChange={setPatternInvert}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="patterns-foreground">Pattern colour</Label>
              <Input
                id="patterns-foreground"
                type="color"
                value={patternForeground}
                onChange={(event) => setPatternForeground(event.target.value)}
                className="h-11 p-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patterns-background">Background</Label>
              <Input
                id="patterns-background"
                type="color"
                value={patternBackground}
                onChange={(event) => setPatternBackground(event.target.value)}
                className="h-11 p-1"
              />
            </div>
          </div>
        </div>
      );
    }

    if (effect === "distort") {
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Warp axis</Label>
            <Select
              value={distortAxis}
              onValueChange={(value) => setDistortAxis(value as WarpAxis)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">Horizontal</SelectItem>
                <SelectItem value="vertical">Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SliderField
            label="Amplitude"
            value={distortAmplitude}
            min={0}
            max={60}
            step={1}
            onChange={setDistortAmplitude}
            formatValue={(value) => `${value}px`}
            help="Sets how far each row or column can shift."
          />

          <SliderField
            label="Frequency"
            value={distortFrequency}
            min={4}
            max={48}
            step={1}
            onChange={setDistortFrequency}
            help="Higher values pack more wave cycles into the image."
          />
        </div>
      );
    }

    if (effect === "displace") {
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Displacement axis</Label>
            <Select
              value={displaceAxis}
              onValueChange={(value) => setDisplaceAxis(value as WarpAxis)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">Horizontal</SelectItem>
                <SelectItem value="vertical">Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SliderField
            label="Scale"
            value={displaceScale}
            min={0}
            max={48}
            step={1}
            onChange={setDisplaceScale}
            formatValue={(value) => `${value}px`}
            help="Controls how strongly luminance offsets the sampled pixels."
          />

          <div className="rounded-lg border p-3 space-y-3">
            <div className="space-y-1 min-w-0">
              <Label>Displacement map</Label>
              <p className="text-xs text-muted-foreground truncate">
                Current map: {displaceMapName}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (displacementMapInputRef.current) {
                    displacementMapInputRef.current.value = "";
                    displacementMapInputRef.current.click();
                  }
                }}
                className="gap-2"
              >
                <Upload className="size-4" />
                Replace map
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDisplaceMapUrl(DEFAULT_DISPLACEMENT_MAP_URL);
                  setDisplaceMapName(DEFAULT_DISPLACEMENT_MAP_NAME);
                }}
              >
                Reset map
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor="displace-invert">Invert mapping</Label>
              <p className="text-xs text-muted-foreground">
                Reverse whether light or dark areas push the displacement forward.
              </p>
            </div>
            <Switch
              id="displace-invert"
              checked={displaceInvert}
              onCheckedChange={setDisplaceInvert}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Character set</Label>
            <Select
              value={asciiPreset}
              onValueChange={(value) =>
                setAsciiPreset(value as keyof typeof ASCII_PRESETS)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="dense">Dense</SelectItem>
                <SelectItem value="retro">Retro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Colour mode</Label>
            <Select
              value={asciiColourMode}
              onValueChange={(value) =>
                setAsciiColourMode(value as AsciiColourMode)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mono">Single colour</SelectItem>
                <SelectItem value="source">Sampled source colour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SliderField
          label="Cell size"
          value={asciiCellSize}
          min={6}
          max={24}
          step={1}
          onChange={setAsciiCellSize}
          formatValue={(value) => `${value}px`}
          help="Larger cells produce fewer, bolder characters."
        />

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-1">
            <Label htmlFor="ascii-invert">Invert ramp</Label>
            <p className="text-xs text-muted-foreground">
              Swap light and dark character density.
            </p>
          </div>
          <Switch
            id="ascii-invert"
            checked={asciiInvert}
            onCheckedChange={setAsciiInvert}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ascii-foreground">Foreground</Label>
            <Input
              id="ascii-foreground"
              type="color"
              value={asciiForeground}
              onChange={(event) => setAsciiForeground(event.target.value)}
              className="h-11 p-1"
              disabled={asciiColourMode === "source"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ascii-background">Background</Label>
            <Input
              id="ascii-background"
              type="color"
              value={asciiBackground}
              onChange={(event) => setAsciiBackground(event.target.value)}
              className="h-11 p-1"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        id={`visual-effect-upload-${effect}`}
        type="file"
        accept="image/*"
        onChange={handleSelect}
        className="hidden"
        ref={fileInputRef}
      />
      <input
        id={`displacement-map-upload-${effect}`}
        type="file"
        accept="image/*"
        onChange={handleDisplacementMapSelect}
        className="hidden"
        ref={displacementMapInputRef}
      />

      {!sharedImage.sourceUrl ? (
        <Card
          className="border-dashed"
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
        >
          <CardContent className="px-6 py-12">
            <div className="text-center">
              <label
                htmlFor={`visual-effect-upload-${effect}`}
                className="cursor-pointer"
              >
                <Upload className="size-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-1">
                  Drop an image here for {EFFECT_META[effect].title.toLowerCase()}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse locally
                </p>
              </label>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Controls</CardTitle>
                <CardDescription>{EFFECT_META[effect].description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {renderControls()}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                        fileInputRef.current.click();
                      }
                    }}
                    className="gap-2"
                  >
                    <Upload className="size-4" />
                    Replace image
                  </Button>
                  <Button
                    variant="outline"
                    onClick={clearImage}
                    className="gap-2"
                  >
                    <Trash2 className="size-4" />
                    Reset
                  </Button>
                </div>

                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <p className="font-medium mb-1">Image size</p>
                  <p className="text-muted-foreground">
                    {sharedImage.imageSize.width} x {sharedImage.imageSize.height}px
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Result
                  {isProcessing && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                </CardTitle>
                <CardAction>
                  <Button
                    onClick={downloadResult}
                    disabled={!outputUrl || isProcessing}
                    className="gap-2"
                  >
                    <Download className="size-4" />
                    Download PNG
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] p-3 min-h-[420px] flex items-center justify-center">
                  {outputUrl ? (
                    <img
                      src={outputUrl}
                      alt={`${EFFECT_META[effect].title} output`}
                      className="w-full max-h-[720px] object-contain rounded-lg"
                    />
                  ) : isProcessing ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No preview available.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {error && (
            <Card className="border-dashed">
              <CardContent className="py-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
