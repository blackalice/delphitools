"use client";

import * as React from "react";
import {
  Download,
  FileType,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { convertFontToSfnt } from "@/lib/font-converter";

type SourceFormat = "woff" | "woff2";
type OutputFormat = "ttf" | "otf";

type ConversionState =
  | { status: "idle" }
  | { status: "processing"; message: string }
  | { status: "done"; message: string }
  | { status: "error"; message: string };

function getSignature(bytes: Uint8Array) {
  return String.fromCharCode(...bytes.slice(0, 4));
}

function detectSourceFormat(bytes: Uint8Array): SourceFormat | null {
  const signature = getSignature(bytes);

  if (signature === "wOFF") {
    return "woff";
  }

  if (signature === "wOF2") {
    return "woff2";
  }

  return null;
}

function detectDesktopFormat(bytes: Uint8Array): OutputFormat | null {
  const signature = getSignature(bytes);

  if (signature === "OTTO") {
    return "otf";
  }

  if (
    signature === "true" ||
    signature === "\u0000\u0001\u0000\u0000"
  ) {
    return "ttf";
  }

  return null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getOutputLabel(format: OutputFormat | null) {
  if (format === "otf") {
    return "OpenType (.otf)";
  }

  if (format === "ttf") {
    return "TrueType (.ttf)";
  }

  return "Unknown";
}

function getBaseName(fileName: string) {
  return fileName.replace(/\.(woff2?|ttf|otf)$/i, "");
}

export function FontConverterTool() {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [sourceFormat, setSourceFormat] = React.useState<SourceFormat | null>(null);
  const [outputFormat, setOutputFormat] = React.useState<OutputFormat | null>(null);
  const [resultBlob, setResultBlob] = React.useState<Blob | null>(null);
  const [state, setState] = React.useState<ConversionState>({ status: "idle" });

  function clear() {
    setSelectedFile(null);
    setSourceFormat(null);
    setOutputFormat(null);
    setResultBlob(null);
    setState({ status: "idle" });
  }

  async function loadFile(file: File) {
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const detectedFormat = detectSourceFormat(fileBytes);

    if (!detectedFormat) {
      setState({
        status: "error",
        message: "Please choose a WOFF or WOFF2 font file.",
      });
      return;
    }

    setSelectedFile(file);
    setSourceFormat(detectedFormat);
    setOutputFormat(null);
    setResultBlob(null);
    setState({ status: "idle" });
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      void loadFile(file);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (file) {
      void loadFile(file);
    }
  }

  async function convertFont() {
    if (!selectedFile || !sourceFormat) {
      return;
    }

    try {
      setState({
        status: "processing",
        message: "Recovering desktop font data locally...",
      });

      const converted = await convertFontToSfnt(
        new Uint8Array(await selectedFile.arrayBuffer()),
        sourceFormat
      );
      const convertedBytes = new Uint8Array(converted);
      const desktopFormat = detectDesktopFormat(convertedBytes);

      if (!desktopFormat) {
        throw new Error(
          "The converted font was not recognised as a TTF or OTF desktop font."
        );
      }

      setOutputFormat(desktopFormat);
      setResultBlob(
        new Blob([convertedBytes], {
          type: desktopFormat === "otf" ? "font/otf" : "font/ttf",
        })
      );
      setState({
        status: "done",
        message: `Recovered ${desktopFormat.toUpperCase()} font successfully.`,
      });
    } catch (error) {
      setResultBlob(null);
      setOutputFormat(null);
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Font conversion failed locally.",
      });
    }
  }

  function downloadResult() {
    if (!selectedFile || !resultBlob || !outputFormat) {
      return;
    }

    const downloadUrl = URL.createObjectURL(resultBlob);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = `${getBaseName(selectedFile.name)}.${outputFormat}`;
    downloadLink.click();
    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <div className="space-y-6">
      <div
        className="cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50"
        onClick={() => document.getElementById("font-converter-input")?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          accept=".woff,.woff2,font/woff,font/woff2"
          className="hidden"
          id="font-converter-input"
          onChange={handleFileSelect}
          type="file"
        />
        <Upload className="mx-auto mb-4 size-12 text-muted-foreground" />
        <p className="text-lg font-medium">Drop WOFF or WOFF2 here</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Recover the original desktop font locally in your browser
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileType className="size-4 text-muted-foreground" />
              Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">File</span>
              <span className="truncate text-right">
                {selectedFile?.name ?? "No font loaded"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Format</span>
              <span>{sourceFormat ? sourceFormat.toUpperCase() : "Unknown"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Size</span>
              <span>{selectedFile ? formatBytes(selectedFile.size) : "-"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="size-4 text-muted-foreground" />
              Output
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Recovered format</span>
              <span>{getOutputLabel(outputFormat)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Download name</span>
              <span className="truncate text-right">
                {selectedFile && outputFormat
                  ? `${getBaseName(selectedFile.name)}.${outputFormat}`
                  : "Convert a font first"}
              </span>
            </div>
            <p className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              WOFF and WOFF2 normally wrap an underlying sfnt font. This tool
              recovers that local desktop font and downloads it as either TTF or
              OTF depending on the original outline flavor.
            </p>
          </CardContent>
        </Card>
      </div>

      {state.status !== "idle" && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            state.status === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "bg-muted/30"
          }`}
        >
          {state.status === "processing" && (
            <div className="mb-2 flex items-center gap-2 text-foreground">
              <Loader2 className="size-4 animate-spin" />
              Converting
            </div>
          )}
          <p>{state.message}</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Button
          className="h-14"
          disabled={!selectedFile || state.status === "processing"}
          onClick={convertFont}
        >
          {state.status === "processing" ? (
            <>
              <Loader2 className="mr-2 size-5 animate-spin" />
              Converting...
            </>
          ) : (
            <>Convert Font</>
          )}
        </Button>
        <Button
          className="h-14"
          disabled={!resultBlob || !outputFormat}
          onClick={downloadResult}
          variant="outline"
        >
          <Download className="mr-2 size-5" />
          Download Result
        </Button>
        <Button
          className="h-12 md:col-span-2"
          onClick={clear}
          variant="ghost"
        >
          <Trash2 className="mr-2 size-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
