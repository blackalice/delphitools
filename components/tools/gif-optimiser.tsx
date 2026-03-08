"use client";

import * as React from "react";
import {
  Download,
  Loader2,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type OptimisationLevel = "1" | "2" | "3";

type ProcessingState =
  | { status: "idle" }
  | { status: "processing"; message: string }
  | { status: "done"; message: string }
  | { status: "error"; message: string };

type OptimisationOptions = {
  colours: number;
  interlace: boolean;
  level: OptimisationLevel;
  lossy: number;
  resizeWidth: number;
  shouldResize: boolean;
};

const DEFAULT_OPTIONS: OptimisationOptions = {
  colours: 128,
  interlace: false,
  level: "2",
  lossy: 40,
  resizeWidth: 600,
  shouldResize: false,
};

const GIFSICLE_INPUT_NAME = "input.gif";
const GIFSICLE_OUTPUT_NAME = "optimised.gif";
const RECOMMENDED_LOCAL_GIF_BYTES = 10 * 1024 * 1024;
const PREVIEW_DISABLE_BYTES = 20 * 1024 * 1024;
const MAX_LOCAL_GIF_BYTES = 64 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function buildCommand(options: OptimisationOptions) {
  const commandParts = ["--conserve-memory", `-O${options.level}`];

  if (options.lossy > 0) {
    commandParts.push(`--lossy=${options.lossy}`);
  }

  if (options.colours < 256) {
    commandParts.push(`--colors ${options.colours}`);
  }

  if (options.interlace) {
    commandParts.push("--interlace");
  }

  if (options.shouldResize && options.resizeWidth > 0) {
    commandParts.push(`--resize ${options.resizeWidth}x_`);
  }

  commandParts.push(GIFSICLE_INPUT_NAME);
  commandParts.push("-o");
  commandParts.push(`/out/${GIFSICLE_OUTPUT_NAME}`);

  return commandParts.join(" ");
}

function isLargeGif(file: File | Blob | null, threshold: number) {
  return Boolean(file && file.size > threshold);
}

function getLargeFileMessage(fileSize: number) {
  return `This GIF is ${formatBytes(fileSize)}. Browser-local GIF optimisation with WASM becomes unreliable for files this large because the browser needs several in-memory copies. Use desktop gifsicle, ffmpeg, or ImageMagick for the most reliable results.`;
}

function getOptimisationErrorMessage(error: unknown, fileSize: number) {
  if (error instanceof Error) {
    const message = error.message.trim();
    const normalized = message.toLowerCase();

    if (
      error instanceof RangeError ||
      normalized.includes("maximum call stack size exceeded") ||
      normalized.includes("memory access out of bounds") ||
      normalized.includes("failed to grow memory") ||
      normalized.includes("out of memory")
    ) {
      return fileSize > RECOMMENDED_LOCAL_GIF_BYTES
        ? getLargeFileMessage(fileSize)
        : "Local GIF optimisation ran out of browser memory. Try a smaller resize, fewer colours, or optimisation level O1.";
    }

    if (message) {
      return message;
    }
  }

  return "GIF optimisation failed.";
}

async function optimiseGifInWorker(file: File, command: string) {
  const gifsicleModule = await import("gifsicle-wasm-browser");
  const gifsicle = gifsicleModule.default;
  const workerUrl = await gifsicle.tool.textToUrl();
  const inputBuffer = await file.arrayBuffer();

  return new Promise<Blob>((resolve, reject) => {
    const worker = new Worker(workerUrl);

    const finish = (callback: () => void) => {
      worker.terminate();
      callback();
    };

    worker.onmessage = (event) => {
      const data = event.data as
        | null
        | string
        | Array<{ file: ArrayBuffer | Uint8Array; name: string }>;

      if (!data) {
        finish(() => reject(new Error("No optimised GIF was produced.")));
        return;
      }

      if (typeof data === "string") {
        finish(() => reject(new Error(data)));
        return;
      }

      const outputFile = data[0];

      if (!outputFile) {
        finish(() => reject(new Error("No optimised GIF was produced.")));
        return;
      }

      const bytes =
        outputFile.file instanceof Uint8Array
          ? outputFile.file.slice()
          : new Uint8Array(outputFile.file);

      finish(() =>
        resolve(new Blob([bytes.buffer as ArrayBuffer], { type: "image/gif" }))
      );
    };

    worker.onerror = (event) => {
      finish(() =>
        reject(
          event.error instanceof Error
            ? event.error
            : new Error("GIF optimisation worker failed.")
        )
      );
    };

    worker.onmessageerror = () => {
      finish(() =>
        reject(new Error("The optimisation worker returned an unreadable response."))
      );
    };

    try {
      worker.postMessage(
        {
          command: [command],
          data: [{ file: inputBuffer, name: GIFSICLE_INPUT_NAME }],
          folder: [],
          isStrict: false,
        },
        [inputBuffer]
      );
    } catch (error) {
      finish(() =>
        reject(error instanceof Error ? error : new Error("GIF optimisation failed."))
      );
    }
  });
}

export function GifOptimiserTool() {
  const [options, setOptions] = React.useState(DEFAULT_OPTIONS);
  const [processing, setProcessing] = React.useState<ProcessingState>({
    status: "idle",
  });
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = React.useState<string | null>(null);
  const [resultBlob, setResultBlob] = React.useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl);
      }

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl, sourceUrl]);

  function clearSelection() {
    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
    }

    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }

    setSelectedFile(null);
    setSourceUrl(null);
    setResultBlob(null);
    setResultUrl(null);
    setProcessing({ status: "idle" });
  }

  function loadFile(file: File) {
    if (file.type !== "image/gif") {
      setProcessing({
        status: "error",
        message: "Please choose a GIF file.",
      });
      return;
    }

    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
    }

    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }

    setSelectedFile(file);
    setSourceUrl(URL.createObjectURL(file));
    setResultBlob(null);
    setResultUrl(null);
    setProcessing({ status: "idle" });
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      loadFile(file);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (file) {
      loadFile(file);
    }
  }

  async function optimiseGif() {
    if (!selectedFile) {
      return;
    }

    if (selectedFile.size > MAX_LOCAL_GIF_BYTES) {
      setProcessing({
        status: "error",
        message: getLargeFileMessage(selectedFile.size),
      });
      return;
    }

    try {
      setProcessing({
        status: "processing",
        message: "Optimising GIF locally...",
      });

      const command = buildCommand(options);
      const outputFile = await optimiseGifInWorker(selectedFile, command);

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }

      setResultBlob(outputFile);
      setResultUrl(URL.createObjectURL(outputFile));
      setProcessing({
        status: "done",
        message: "Optimisation complete.",
      });
    } catch (error) {
      console.error("GIF optimisation failed:", error);
      setProcessing({
        status: "error",
        message: getOptimisationErrorMessage(error, selectedFile.size),
      });
    }
  }

  function downloadResult() {
    if (!resultBlob || !resultUrl || !selectedFile) {
      return;
    }

    const downloadLink = document.createElement("a");
    const baseName = selectedFile.name.replace(/\.gif$/i, "") || "optimized";

    downloadLink.download = `${baseName}-optimised.gif`;
    downloadLink.href = resultUrl;
    downloadLink.click();
  }

  const commandPreview = selectedFile
    ? buildCommand(options)
    : "-O2 --lossy=40 --colors 128 input.gif -o /out/optimised.gif";
  const isProcessing = processing.status === "processing";
  const originalSize = selectedFile?.size ?? 0;
  const resultSize = resultBlob?.size ?? 0;
  const bytesSaved = resultBlob ? originalSize - resultSize : 0;
  const percentSaved =
    resultBlob && originalSize > 0
      ? Math.round((bytesSaved / originalSize) * 100)
      : 0;
  const showLargeFileAdvice = isLargeGif(selectedFile, RECOMMENDED_LOCAL_GIF_BYTES);
  const disableSourcePreview = isLargeGif(selectedFile, PREVIEW_DISABLE_BYTES);
  const disableResultPreview = isLargeGif(resultBlob, PREVIEW_DISABLE_BYTES);
  const cannotOptimiseLocally = isLargeGif(selectedFile, MAX_LOCAL_GIF_BYTES);

  return (
    <div className="space-y-6">
      <div
        className="cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50"
        onClick={() => document.getElementById("gif-optimiser-input")?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          accept=".gif,image/gif"
          className="hidden"
          id="gif-optimiser-input"
          onChange={handleFileSelect}
          type="file"
        />
        <Upload className="mx-auto mb-4 size-12 text-muted-foreground" />
        <p className="text-lg font-medium">Drop GIF here</p>
        <p className="mt-1 text-sm text-muted-foreground">
          or click to select a local file
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Original</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedFile ? formatBytes(selectedFile.size) : "No file loaded"}
                  </p>
                </div>
              </div>
              <div className="flex min-h-56 items-center justify-center rounded-lg bg-muted/30 p-3">
                {sourceUrl && !disableSourcePreview ? (
                  <img
                    alt="Original GIF preview"
                    className="max-h-64 max-w-full rounded-md"
                    src={sourceUrl}
                  />
                ) : sourceUrl ? (
                  <p className="max-w-xs text-center text-sm text-muted-foreground">
                    Preview disabled for large GIFs to reduce browser memory usage.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Upload a GIF to preview it here.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Optimised</h3>
                  <p className="text-sm text-muted-foreground">
                    {resultBlob ? formatBytes(resultBlob.size) : "No output yet"}
                  </p>
                </div>
              </div>
              <div className="flex min-h-56 items-center justify-center rounded-lg bg-muted/30 p-3">
                {resultUrl && !disableResultPreview ? (
                  <img
                    alt="Optimised GIF preview"
                    className="max-h-64 max-w-full rounded-md"
                    src={resultUrl}
                  />
                ) : resultUrl ? (
                  <p className="max-w-xs text-center text-sm text-muted-foreground">
                    Output preview disabled for large GIFs to keep memory use down.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Run optimisation to generate a local preview.
                  </p>
                )}
              </div>
            </div>
          </div>

          {resultBlob && (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border bg-card p-4 text-center">
                <div className="text-sm text-muted-foreground">Original</div>
                <div className="text-2xl font-bold">{formatBytes(originalSize)}</div>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <div className="text-sm text-muted-foreground">Optimised</div>
                <div className="text-2xl font-bold">{formatBytes(resultSize)}</div>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <div className="text-sm text-muted-foreground">Saved</div>
                <div className="text-2xl font-bold text-primary">
                  {formatBytes(bytesSaved)}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <div className="text-sm text-muted-foreground">Reduction</div>
                <div className="text-2xl font-bold text-primary">
                  {percentSaved}%
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-5 flex items-center gap-2">
              <Settings2 className="size-4 text-muted-foreground" />
              <h3 className="font-semibold">Optimisation Settings</h3>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Optimisation level</Label>
                <Select
                  onValueChange={(value) =>
                    setOptions((current) => ({
                      ...current,
                      level: value as OptimisationLevel,
                    }))
                  }
                  value={options.level}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">O1 - Faster, safer</SelectItem>
                    <SelectItem value="2">O2 - Balanced</SelectItem>
                    <SelectItem value="3">O3 - Strongest pass</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Lossy compression</Label>
                  <span className="text-sm text-muted-foreground">
                    {options.lossy}
                  </span>
                </div>
                <Slider
                  max={200}
                  min={0}
                  onValueChange={([value]) =>
                    setOptions((current) => ({ ...current, lossy: value }))
                  }
                  step={5}
                  value={[options.lossy]}
                />
                <p className="text-xs text-muted-foreground">
                  Higher values compress harder, but introduce more visible artefacts.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Max colours</Label>
                  <span className="text-sm text-muted-foreground">
                    {options.colours}
                  </span>
                </div>
                <Slider
                  max={256}
                  min={16}
                  onValueChange={([value]) =>
                    setOptions((current) => ({ ...current, colours: value }))
                  }
                  step={8}
                  value={[options.colours]}
                />
              </div>

              <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Resize output</Label>
                    <p className="text-xs text-muted-foreground">
                      Resize by width while keeping aspect ratio.
                    </p>
                  </div>
                  <Switch
                    checked={options.shouldResize}
                    onCheckedChange={(checked) =>
                      setOptions((current) => ({
                        ...current,
                        shouldResize: checked,
                      }))
                    }
                  />
                </div>

                {options.shouldResize && (
                  <div className="space-y-2">
                    <Label htmlFor="gif-optimiser-width">Target width</Label>
                    <Input
                      id="gif-optimiser-width"
                      min={1}
                      onChange={(event) =>
                        setOptions((current) => ({
                          ...current,
                          resizeWidth: Number(event.target.value) || 0,
                        }))
                      }
                      type="number"
                      value={options.resizeWidth}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-4">
                <div>
                  <Label>Interlace output</Label>
                  <p className="text-xs text-muted-foreground">
                    Useful for progressive rendering in some contexts.
                  </p>
                </div>
                <Switch
                  checked={options.interlace}
                  onCheckedChange={(checked) =>
                    setOptions((current) => ({
                      ...current,
                      interlace: checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <Label className="mb-2 block">Command preview</Label>
            <pre className="overflow-x-auto rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground">
              <code>{commandPreview}</code>
            </pre>
            {showLargeFileAdvice && (
              <p className="mt-3 text-xs text-muted-foreground">
                Large GIF detected. In-browser WASM works best around 10 MB and below.
                For larger files, prefer O1, resize first, or use a desktop encoder.
              </p>
            )}
          </div>

          {processing.status !== "idle" && (
            <div
              className={`rounded-xl border p-4 text-sm ${
                processing.status === "error"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "bg-muted/30"
              }`}
            >
              {processing.status === "processing" && (
                <div className="mb-2 flex items-center gap-2 text-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Processing
                </div>
              )}
              <p>{processing.message}</p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <Button
              className="h-14"
              disabled={!selectedFile || isProcessing || cannotOptimiseLocally}
              onClick={optimiseGif}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Optimising...
                </>
              ) : (
                <>Optimise GIF</>
              )}
            </Button>
            <Button
              className="h-14"
              disabled={!resultBlob}
              onClick={downloadResult}
              variant="outline"
            >
              <Download className="mr-2 size-5" />
              Download Result
            </Button>
            <Button
              className="h-12 md:col-span-2"
              onClick={clearSelection}
              variant="ghost"
            >
              <Trash2 className="mr-2 size-4" />
              Clear
            </Button>
          </div>

          {cannotOptimiseLocally && selectedFile && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <p>{getLargeFileMessage(selectedFile.size)}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            GIF optimisation runs locally in your browser with a WASM build of
            gifsicle. Your files do not leave your machine.
          </p>
        </div>
      </div>
    </div>
  );
}
