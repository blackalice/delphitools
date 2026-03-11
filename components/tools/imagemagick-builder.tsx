"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Image as ImageIcon, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Workflow = "resize" | "convert" | "montage" | "annotate";
type Gravity = "northwest" | "north" | "northeast" | "west" | "center" | "east" | "southwest" | "south" | "southeast";
type OutputFormat = "png" | "jpg" | "webp" | "gif";
type BatchShell = "powershell" | "bash";

const IMAGEMAGICK_INFO = {
  name: "ImageMagick",
  description: "Open-source command-line suite for converting, resizing, compositing, and manipulating images.",
  downloadUrl: "https://imagemagick.org/script/download.php",
};

const OUTPUT_FORMAT_OPTIONS: Array<{ value: OutputFormat; label: string }> = [
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPEG" },
  { value: "webp", label: "WebP" },
  { value: "gif", label: "GIF" },
];

const PALETTE_COLOUR_OPTIONS = ["none", "256", "128", "64", "32", "16", "8", "4", "2"] as const;

interface BuilderState {
  workflow: Workflow;
  inputPath: string;
  outputPath: string;
  outputFormat: OutputFormat;
  width: string;
  height: string;
  quality: string;
  background: string;
  columns: string;
  spacing: string;
  label: string;
  fontSize: string;
  fill: string;
  gravity: Gravity;
  stripMetadata: boolean;
  preserveAspect: boolean;
  colorCount: string;
  extraFlags: string;
  batchMode: boolean;
  batchDirectory: string;
  batchPattern: string;
  batchRecursive: boolean;
  batchReplaceOriginal: boolean;
  batchShell: BatchShell;
  batchNameSuffix: string;
  batchTempSuffix: string;
}

const PRESETS: Record<Workflow, BuilderState> = {
  resize: {
    workflow: "resize",
    inputPath: "input.png",
    outputPath: "output.png",
    outputFormat: "png",
    width: "1600",
    height: "",
    quality: "85",
    background: "#111111",
    columns: "4",
    spacing: "16",
    label: "Sample text",
    fontSize: "48",
    fill: "#ffffff",
    gravity: "south",
    stripMetadata: true,
    preserveAspect: true,
    colorCount: "none",
    extraFlags: "",
    batchMode: false,
    batchDirectory: ".",
    batchPattern: "*.png",
    batchRecursive: false,
    batchReplaceOriginal: false,
    batchShell: "powershell",
    batchNameSuffix: "-optimised",
    batchTempSuffix: ".tmp",
  },
  convert: {
    workflow: "convert",
    inputPath: "input.png",
    outputPath: "output.webp",
    outputFormat: "webp",
    width: "",
    height: "",
    quality: "82",
    background: "#111111",
    columns: "4",
    spacing: "16",
    label: "Sample text",
    fontSize: "48",
    fill: "#ffffff",
    gravity: "south",
    stripMetadata: true,
    preserveAspect: true,
    colorCount: "",
    extraFlags: "",
    batchMode: false,
    batchDirectory: ".",
    batchPattern: "*.png",
    batchRecursive: false,
    batchReplaceOriginal: false,
    batchShell: "powershell",
    batchNameSuffix: "-converted",
    batchTempSuffix: ".tmp",
  },
  montage: {
    workflow: "montage",
    inputPath: "images/*.jpg",
    outputPath: "contact-sheet.jpg",
    outputFormat: "jpg",
    width: "400",
    height: "400",
    quality: "85",
    background: "#111111",
    columns: "4",
    spacing: "16",
    label: "Sample text",
    fontSize: "48",
    fill: "#ffffff",
    gravity: "south",
    stripMetadata: false,
    preserveAspect: true,
    colorCount: "",
    extraFlags: "",
    batchMode: false,
    batchDirectory: ".",
    batchPattern: "*.jpg",
    batchRecursive: false,
    batchReplaceOriginal: false,
    batchShell: "powershell",
    batchNameSuffix: "-sheet",
    batchTempSuffix: ".tmp",
  },
  annotate: {
    workflow: "annotate",
    inputPath: "input.jpg",
    outputPath: "annotated.jpg",
    outputFormat: "jpg",
    width: "",
    height: "",
    quality: "90",
    background: "#111111",
    columns: "4",
    spacing: "16",
    label: "Copyright 2026",
    fontSize: "48",
    fill: "#ffffff",
    gravity: "south",
    stripMetadata: false,
    preserveAspect: true,
    colorCount: "",
    extraFlags: "",
    batchMode: false,
    batchDirectory: ".",
    batchPattern: "*.jpg",
    batchRecursive: false,
    batchReplaceOriginal: false,
    batchShell: "powershell",
    batchNameSuffix: "-labelled",
    batchTempSuffix: ".tmp",
  },
};

const COPY: Record<Workflow, { title: string; description: string }> = {
  resize: {
    title: "Resize",
    description: "Build an ImageMagick resize command with quality and metadata options.",
  },
  convert: {
    title: "Convert Format",
    description: "Convert source images into another format with a single command.",
  },
  montage: {
    title: "Contact Sheet",
    description: "Create a tiled contact sheet from multiple images.",
  },
  annotate: {
    title: "Add Text Overlay",
    description: "Place a text overlay on an image using gravity, colour, and point size.",
  },
};

const RECIPES: Record<Workflow, Array<{ value: string; label: string; patch: Partial<BuilderState> }>> = {
  resize: [
    { value: "hero-web", label: "Hero Image", patch: { outputPath: "hero.webp", outputFormat: "webp", width: "1920", height: "", quality: "82", stripMetadata: true } },
    { value: "thumb-png", label: "Thumbnail PNG", patch: { outputPath: "thumb.png", outputFormat: "png", width: "512", height: "", quality: "90", stripMetadata: true } },
  ],
  convert: [
    { value: "webp-convert", label: "PNG to WebP", patch: { outputPath: "output.webp", outputFormat: "webp", quality: "82", stripMetadata: true } },
    { value: "jpg-export", label: "JPEG Export", patch: { outputPath: "output.jpg", outputFormat: "jpg", quality: "85", stripMetadata: true } },
  ],
  montage: [
    { value: "contact-sheet", label: "4x Contact Sheet", patch: { inputPath: "images/*.jpg", outputPath: "contact-sheet.jpg", outputFormat: "jpg", columns: "4", width: "400", height: "400", spacing: "16" } },
    { value: "small-proof", label: "Proof Sheet", patch: { inputPath: "images/*.png", outputPath: "proof-sheet.png", outputFormat: "png", columns: "5", width: "240", height: "240", spacing: "12" } },
  ],
  annotate: [
    { value: "copyright", label: "Copyright Footer", patch: { outputPath: "annotated.jpg", outputFormat: "jpg", label: "Copyright 2026", gravity: "south", fontSize: "48", fill: "#ffffff" } },
    { value: "watermark", label: "Corner Watermark", patch: { outputPath: "watermarked.png", outputFormat: "png", label: "Studio", gravity: "southeast", fontSize: "32", fill: "#ffffff" } },
  ],
};

const quote = (value: string) => `"${value.replace(/"/g, '\\"')}"`;

const renderInputValue = (value: string, allowPattern = false) =>
  allowPattern && /[*?\[]/.test(value) ? value : quote(value);

const replaceExtension = (value: string, extension: OutputFormat, fallbackBase: string) => {
  const trimmed = value.trim();
  const base = trimmed || fallbackBase;
  if (/\.[^./\\]+$/.test(base)) {
    return base.replace(/\.[^./\\]+$/, `.${extension}`);
  }
  return `${base}.${extension}`;
};

const supportsPaletteColours = (format: OutputFormat) => format === "png" || format === "gif";

const getFinalExtension = (state: BuilderState) => state.outputFormat;

const syncOutputFormatState = (current: BuilderState, outputFormat: OutputFormat): BuilderState => ({
  ...current,
  outputFormat,
  outputPath: replaceExtension(current.outputPath, outputFormat, current.workflow === "montage" ? "contact-sheet" : "output"),
  colorCount: supportsPaletteColours(outputFormat) ? current.colorCount || "none" : "none",
});

const applyWorkflowPreset = (current: BuilderState, workflow: Workflow): BuilderState => {
  let next: BuilderState = {
    ...PRESETS[workflow],
    inputPath: current.inputPath,
    width: workflow === "resize" || workflow === "montage" ? current.width : PRESETS[workflow].width,
    height: workflow === "resize" || workflow === "montage" ? current.height : PRESETS[workflow].height,
    quality: current.quality,
    background: current.background,
    columns: current.columns,
    spacing: current.spacing,
    label: current.label,
    fontSize: current.fontSize,
    fill: current.fill,
    gravity: current.gravity,
    stripMetadata: current.stripMetadata,
    preserveAspect: current.preserveAspect,
    colorCount: current.colorCount || "none",
    extraFlags: current.extraFlags,
    batchMode: workflow === "montage" ? false : current.batchMode,
    batchDirectory: current.batchDirectory,
    batchPattern: current.batchPattern,
    batchRecursive: current.batchRecursive,
    batchReplaceOriginal: current.batchReplaceOriginal,
    batchShell: current.batchShell,
    batchNameSuffix: current.batchNameSuffix,
    batchTempSuffix: current.batchTempSuffix,
  };

  next = syncOutputFormatState(next, current.outputFormat);
  next.outputPath = replaceExtension(current.outputPath, next.outputFormat, workflow === "montage" ? "contact-sheet" : "output");

  return next;
};

const applyRecipePatch = (current: BuilderState, patch: Partial<BuilderState>): BuilderState => {
  let next = current;

  if (patch.outputFormat) {
    next = syncOutputFormatState(next, patch.outputFormat);
  }

  next = { ...next, ...patch };

  if (patch.outputPath) {
    next.outputPath = patch.outputPath;
  }

  return next;
};

function buildImagemagickArgs(state: BuilderState, inputRef: string, outputRef: string) {
  const args: string[] = [];
  const notes: string[] = [];

  if (state.workflow === "montage") {
    args.push("magick", "montage", inputRef);
    args.push("-tile", `${state.columns || "4"}x`);
    args.push("-geometry", `${state.width || "400"}x${state.height || "400"}+${state.spacing || "16"}+${state.spacing || "16"}`);
    args.push("-background", state.background || "#111111");
    if (state.quality.trim()) {
      args.push("-quality", state.quality.trim());
    }
    if (state.extraFlags.trim()) {
      args.push(state.extraFlags.trim());
    }
    args.push(outputRef);
    notes.push(`Builds a ${state.columns || "4"}-column contact sheet.`);
    notes.push(`Uses ${state.width || "400"}x${state.height || "400"} tiles with ${state.spacing || "16"}px spacing.`);
    return { args, notes };
  }

  args.push("magick", inputRef);

  if (state.workflow === "resize" && (state.width.trim() || state.height.trim())) {
    const geometry = `${state.width.trim() || ""}x${state.height.trim() || ""}${state.preserveAspect ? "" : "!"}`;
    args.push("-resize", quote(geometry));
    notes.push(`Resizes the image to ${geometry}.`);
  }

  if (supportsPaletteColours(state.outputFormat) && state.colorCount !== "none") {
    args.push("-colors", state.colorCount.trim());
    notes.push(`Limits the output palette to ${state.colorCount.trim()} colours for ${state.outputFormat.toUpperCase()} output.`);
  }

  if (state.workflow === "annotate") {
    args.push("-gravity", state.gravity, "-fill", state.fill || "#ffffff", "-pointsize", state.fontSize || "48", "-annotate", "+0+24", quote(state.label || "Sample text"));
    notes.push(`Places the text using ${state.gravity} gravity at ${state.fontSize || "48"}pt.`);
  }

  if (state.stripMetadata) {
    args.push("-strip");
    notes.push("Removes embedded metadata.");
  }

  if (state.quality.trim()) {
    args.push("-quality", state.quality.trim());
    notes.push(`Sets output quality to ${state.quality.trim()}.`);
  }

  if (state.extraFlags.trim()) {
    args.push(state.extraFlags.trim());
  }

  args.push(outputRef);

  if (state.workflow === "convert") {
    notes.push(`Converts the file into ${state.outputFormat.toUpperCase()}.`);
  }

  return { args, notes };
}

const buildPowerShellBatchScript = (state: BuilderState) => {
  const recursive = state.batchRecursive ? " -Recurse" : "";
  const extension = getFinalExtension(state);
  const rendered = buildImagemagickArgs(state, quote("$($file.FullName)"), quote("$outputPath")).args.join(" ");
  const lines: string[] = [
    `$files = Get-ChildItem -Path ${quote(state.batchDirectory || ".")} -Filter ${quote(state.batchPattern || "*.*")} -File${recursive}`,
    "foreach ($file in $files) {",
  ];

  if (state.batchReplaceOriginal) {
    lines.push(`  $tempPath = Join-Path $file.DirectoryName ($file.BaseName + ${quote(state.batchTempSuffix || ".tmp")} + "." + ${quote(extension)})`);
    lines.push("  $outputPath = $tempPath");
  } else {
    lines.push(`  $outputPath = Join-Path $file.DirectoryName ($file.BaseName + ${quote(state.batchNameSuffix || "-out")} + "." + ${quote(extension)})`);
  }

  lines.push(`  ${rendered}`);
  lines.push("  if ($LASTEXITCODE -eq 0) {");
  if (state.batchReplaceOriginal) {
    lines.push(`    $finalPath = Join-Path $file.DirectoryName ($file.BaseName + "." + ${quote(extension)})`);
    lines.push("    Move-Item -Force $tempPath $finalPath");
  }
  lines.push("  }");
  lines.push("}");

  return lines.join("\n");
};

const bashQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

const buildBashBatchScript = (state: BuilderState) => {
  const extension = getFinalExtension(state);
  const findDepth = state.batchRecursive ? "" : " -maxdepth 1";
  const rendered = buildImagemagickArgs(state, "\"$file\"", "\"$output_path\"").args.join(" ");
  const lines: string[] = [
    `find ${bashQuote(state.batchDirectory || ".")}${findDepth} -type f -name ${bashQuote(state.batchPattern || "*.*")} | while IFS= read -r file; do`,
    "  dir=$(dirname \"$file\")",
    "  base=$(basename \"$file\")",
    "  stem=${base%.*}",
  ];

  if (state.batchReplaceOriginal) {
    lines.push(`  temp_path=\"$dir/$stem${state.batchTempSuffix || ".tmp"}.${extension}\"`);
    lines.push("  output_path=\"$temp_path\"");
  } else {
    lines.push(`  output_path=\"$dir/$stem${state.batchNameSuffix || "-out"}.${extension}\"`);
  }

  lines.push(`  ${rendered}`);
  lines.push("  if [ $? -eq 0 ]; then");
  if (state.batchReplaceOriginal) {
    lines.push(`    final_path=\"$dir/$stem.${extension}\"`);
    lines.push("    mv -f \"$temp_path\" \"$final_path\"");
  }
  lines.push("  fi");
  lines.push("done");

  return lines.join("\n");
};

export function ImagemagickBuilderTool() {
  const [state, setState] = useState<BuilderState>(PRESETS.resize);
  const [copiedKind, setCopiedKind] = useState<"output" | "flags" | null>(null);
  const [outputView, setOutputView] = useState<"compact" | "wrapped">("wrapped");

  const result = useMemo(() => {
    const single = buildImagemagickArgs(state, renderInputValue(state.inputPath, state.workflow === "montage"), quote(state.outputPath));
    const notes = [...single.notes];
    const warnings: string[] = [];

    if (state.workflow === "montage" && /[*?\[]/.test(state.inputPath)) {
      notes.push("Leaves the input pattern unquoted so your shell or ImageMagick can expand multiple files.");
    }

    if (supportsPaletteColours(state.outputFormat) && state.colorCount !== "none") {
      warnings.push(`Palette reduction is enabled, so the output will be quantised to ${state.colorCount} colours.`);
    }

    if (state.batchMode && state.workflow !== "montage") {
      notes.push(`Builds a ${state.batchShell === "powershell" ? "PowerShell" : "Bash"} batch script for files matching ${state.batchPattern || "*.*"} in ${state.batchDirectory || "."}.`);
      if (state.batchRecursive) {
        notes.push("Searches subfolders recursively.");
      }
      if (state.batchReplaceOriginal) {
        notes.push(`Writes to a temporary .${getFinalExtension(state)} file and only replaces the original after a successful conversion.`);
        warnings.push("Replace-original mode overwrites source files. Test the script on a copy of the folder first.");
      } else {
        notes.push(`Writes new files using the suffix ${state.batchNameSuffix || "-out"} and the .${getFinalExtension(state)} extension.`);
      }

      const batchArgs = buildImagemagickArgs(
        state,
        state.batchShell === "powershell" ? quote("$($file.FullName)") : "\"$file\"",
        state.batchShell === "powershell" ? quote("$outputPath") : "\"$output_path\""
      ).args;

      return {
        command: state.batchShell === "powershell" ? buildPowerShellBatchScript(state) : buildBashBatchScript(state),
        flags: batchArgs.slice(1).join(" "),
        notes,
        warnings,
        heading: `Generated ${state.batchShell === "powershell" ? "PowerShell" : "Bash"} Script`,
      };
    }

    return {
      command: single.args.join(" "),
      flags: single.args.slice(1).join(" "),
      notes,
      warnings,
      heading: "Generated Command",
    };
  }, [state]);

  const setWorkflow = (workflow: Workflow) => {
    setState((current) => applyWorkflowPreset(current, workflow));
  };

  const update = <K extends keyof BuilderState>(key: K, value: BuilderState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
  };

  const updateOutputPath = (value: string) => {
    update("outputPath", replaceExtension(value, state.outputFormat, state.workflow === "montage" ? "contact-sheet" : "output"));
  };

  const setOutputFormat = (value: OutputFormat) => {
    setState((current) => syncOutputFormatState(current, value));
  };

  const supportsBatch = state.workflow !== "montage";

  const copyText = async (value: string, kind: "output" | "flags") => {
    await navigator.clipboard.writeText(value);
    setCopiedKind(kind);
    window.setTimeout(() => setCopiedKind(null), 1500);
  };

  const loadRecipe = (recipeValue: string) => {
    const recipe = RECIPES[state.workflow].find((option) => option.value === recipeValue);
    if (!recipe) {
      return;
    }
    setState((current) => applyRecipePatch(current, recipe.patch));
  };

  const resetWorkflowDefaults = () => {
    setState((current) => applyWorkflowPreset(current, current.workflow));
  };

  return (
    <div className="space-y-6">
      <Tabs value={state.workflow} onValueChange={(value) => setWorkflow(value as Workflow)}>
        <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
          {Object.entries(COPY).map(([value, copy]) => (
            <TabsTrigger key={value} value={value}>
              {copy.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(COPY).map(([value, copy]) => (
          <TabsContent key={value} value={value}>
            <Card>
              <CardHeader>
                <CardTitle>{copy.title}</CardTitle>
                <CardDescription>{copy.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Recipe</Label>
                  <Select onValueChange={loadRecipe}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Load a common recipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {RECIPES[state.workflow].map((recipe) => (
                        <SelectItem key={recipe.value} value={recipe.value}>
                          {recipe.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end justify-start md:justify-end">
                  <Button variant="outline" onClick={resetWorkflowDefaults}>
                    Reset Workflow Defaults
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="magick-input">Input</Label>
                  <Input id="magick-input" value={state.inputPath} onChange={(event) => update("inputPath", event.target.value)} />
                  {state.workflow === "montage" && (
                    <p className="text-xs text-muted-foreground">Use a glob such as `images/*.jpg` when building a contact sheet from many files.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="magick-output">Output</Label>
                  <Input id="magick-output" value={state.outputPath} onChange={(event) => updateOutputPath(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Output Format</Label>
                  <Select value={state.outputFormat} onValueChange={(value) => setOutputFormat(value as OutputFormat)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTPUT_FORMAT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(state.workflow === "resize" || state.workflow === "montage") && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="magick-width">Width</Label>
                      <Input id="magick-width" value={state.width} onChange={(event) => update("width", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="magick-height">Height</Label>
                      <Input id="magick-height" value={state.height} onChange={(event) => update("height", event.target.value)} />
                    </div>
                  </>
                )}

                {state.workflow !== "montage" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="magick-quality">Quality</Label>
                      <Input id="magick-quality" value={state.quality} onChange={(event) => update("quality", event.target.value)} />
                    </div>
                    {supportsPaletteColours(state.outputFormat) && (
                      <div className="space-y-2">
                        <Label>Palette Colours</Label>
                        <Select value={state.colorCount || "none"} onValueChange={(value) => update("colorCount", value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PALETTE_COLOUR_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option === "none" ? "Full colour" : option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

                {state.workflow === "montage" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="magick-columns">Columns</Label>
                      <Input id="magick-columns" value={state.columns} onChange={(event) => update("columns", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="magick-spacing">Spacing</Label>
                      <Input id="magick-spacing" value={state.spacing} onChange={(event) => update("spacing", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="magick-background">Background</Label>
                      <Input id="magick-background" value={state.background} onChange={(event) => update("background", event.target.value)} />
                    </div>
                  </>
                )}

                {state.workflow === "annotate" && (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="magick-label">Text</Label>
                      <Textarea id="magick-label" value={state.label} onChange={(event) => update("label", event.target.value)} className="min-h-24" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="magick-fontSize">Point Size</Label>
                      <Input id="magick-fontSize" value={state.fontSize} onChange={(event) => update("fontSize", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="magick-fill">Fill</Label>
                      <Input id="magick-fill" value={state.fill} onChange={(event) => update("fill", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Gravity</Label>
                      <Select value={state.gravity} onValueChange={(value) => update("gravity", value as Gravity)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["northwest", "north", "northeast", "west", "center", "east", "southwest", "south", "southeast"].map((gravity) => (
                            <SelectItem key={gravity} value={gravity}>
                              {gravity}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="magick-extra">Extra Flags</Label>
                  <Textarea id="magick-extra" value={state.extraFlags} onChange={(event) => update("extraFlags", event.target.value)} className="min-h-20 font-mono" />
                </div>

                <div className="flex flex-wrap gap-4 text-sm md:col-span-2">
                  {state.workflow === "resize" && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={state.preserveAspect}
                        onChange={(event) => update("preserveAspect", event.target.checked)}
                      />
                      Preserve aspect ratio
                    </label>
                  )}
                  {state.workflow !== "montage" && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={state.stripMetadata}
                        onChange={(event) => update("stripMetadata", event.target.checked)}
                      />
                      Strip metadata
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {supportsBatch && (
        <Card>
          <CardHeader>
            <CardTitle>Batch Output</CardTitle>
            <CardDescription>Generate a reusable PowerShell or Bash script for whole folders, including recursive scans and replace-in-place output via temporary files.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-wrap gap-4 text-sm md:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={state.batchMode} onChange={(event) => update("batchMode", event.target.checked)} />
                Generate folder script
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={state.batchRecursive} onChange={(event) => update("batchRecursive", event.target.checked)} disabled={!state.batchMode} />
                Include subfolders
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={state.batchReplaceOriginal} onChange={(event) => update("batchReplaceOriginal", event.target.checked)} disabled={!state.batchMode} />
                Replace original after success
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="magick-batch-dir">Folder</Label>
              <Input id="magick-batch-dir" value={state.batchDirectory} onChange={(event) => update("batchDirectory", event.target.value)} disabled={!state.batchMode} placeholder="D:\\images" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="magick-batch-pattern">Input Pattern</Label>
              <Input id="magick-batch-pattern" value={state.batchPattern} onChange={(event) => update("batchPattern", event.target.value)} disabled={!state.batchMode} placeholder="*.png" />
              <p className="text-xs text-muted-foreground">Use wildcards such as `*.png` or `photo-*.jpg`.</p>
            </div>
            <div className="space-y-2">
              <Label>Shell</Label>
              <Select value={state.batchShell} onValueChange={(value) => update("batchShell", value as BatchShell)}>
                <SelectTrigger className="w-full" disabled={!state.batchMode}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="powershell">PowerShell</SelectItem>
                  <SelectItem value="bash">Mac/Linux Shell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm text-muted-foreground">
                Batch output uses the same format as the generated command: `.{state.outputFormat}`.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="magick-batch-suffix">New File Suffix</Label>
              <Input id="magick-batch-suffix" value={state.batchNameSuffix} onChange={(event) => update("batchNameSuffix", event.target.value)} disabled={!state.batchMode || state.batchReplaceOriginal} placeholder="-optimised" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="magick-batch-temp">Temp Suffix</Label>
              <Input id="magick-batch-temp" value={state.batchTempSuffix} onChange={(event) => update("batchTempSuffix", event.target.value)} disabled={!state.batchMode || !state.batchReplaceOriginal} placeholder=".tmp" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="size-5" />
              {result.heading}
            </CardTitle>
            <CardDescription>
              {state.batchMode && supportsBatch ? `This output is ${state.batchShell === "powershell" ? "PowerShell" : "Bash/Zsh"}.` : "Copy this into your terminal and swap the placeholder paths for real files."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full max-w-40 space-y-2">
              <Label>View</Label>
              <Select value={outputView} onValueChange={(value) => setOutputView(value as "compact" | "wrapped")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wrapped">Wrapped</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              readOnly
              wrap="soft"
              value={result.command}
              className="min-h-32 font-mono text-sm whitespace-pre-wrap break-all"
            />
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => copyText(result.command, "output")}>
                {copiedKind === "output" ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
                {copiedKind === "output" ? "Copied Output" : "Copy Output"}
              </Button>
              <Button variant="outline" onClick={() => copyText(result.flags, "flags")}>
                {copiedKind === "flags" ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
                {copiedKind === "flags" ? "Copied Flags" : "Copy Flags"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Command Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {result.warnings.map((warning) => (
              <p key={warning} className="text-amber-700 dark:text-amber-300">
                Warning: {warning}
              </p>
            ))}
            {result.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Info className="size-5" />
          <h3 className="font-bold">About {IMAGEMAGICK_INFO.name}</h3>
        </div>
        <div className="text-sm space-y-1">
          <p className="text-muted-foreground">{IMAGEMAGICK_INFO.description}</p>
          <p>
            <span className="text-muted-foreground">Download:</span>{" "}
            <a href={IMAGEMAGICK_INFO.downloadUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {IMAGEMAGICK_INFO.downloadUrl}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
