"use client";

import { useMemo, useState } from "react";
import { Check, Copy, FileImage, Info } from "lucide-react";

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

type Workflow = "optimise" | "resize" | "extract" | "join";
type BatchShell = "powershell" | "bash";

const GIFSICLE_INFO = {
  name: "gifsicle",
  description: "Command-line utility for optimising, resizing, and editing animated GIFs.",
  downloadUrl: "https://www.lcdf.org/gifsicle/",
};

const GIF_COLOUR_OPTIONS = ["256", "128", "64", "32", "16", "8", "4", "2"] as const;

interface BuilderState {
  workflow: Workflow;
  inputPath: string;
  outputPath: string;
  lossy: string;
  colours: string;
  width: string;
  height: string;
  scale: string;
  frameRange: string;
  delay: string;
  loopCount: string;
  extraFlags: string;
  optimiseLevel: "1" | "2" | "3";
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
  optimise: {
    workflow: "optimise",
    inputPath: "input.gif",
    outputPath: "optimised.gif",
    lossy: "80",
    colours: "128",
    width: "",
    height: "",
    scale: "",
    frameRange: "",
    delay: "6",
    loopCount: "0",
    extraFlags: "",
    optimiseLevel: "3",
    batchMode: false,
    batchDirectory: ".",
    batchPattern: "*.gif",
    batchRecursive: false,
    batchReplaceOriginal: false,
    batchShell: "powershell",
    batchNameSuffix: "-optimised",
    batchTempSuffix: ".tmp",
  },
  resize: {
    workflow: "resize",
    inputPath: "input.gif",
    outputPath: "resized.gif",
    lossy: "0",
    colours: "256",
    width: "640",
    height: "",
    scale: "",
    frameRange: "",
    delay: "6",
    loopCount: "0",
    extraFlags: "",
    optimiseLevel: "3",
    batchMode: false,
    batchDirectory: ".",
    batchPattern: "*.gif",
    batchRecursive: false,
    batchReplaceOriginal: false,
    batchShell: "powershell",
    batchNameSuffix: "-resized",
    batchTempSuffix: ".tmp",
  },
  extract: {
    workflow: "extract",
    inputPath: "input.gif",
    outputPath: "frame-#.gif",
    lossy: "0",
    colours: "256",
    width: "",
    height: "",
    scale: "",
    frameRange: "#0-10",
    delay: "6",
    loopCount: "0",
    extraFlags: "",
    optimiseLevel: "3",
    batchMode: false,
    batchDirectory: ".",
    batchPattern: "*.gif",
    batchRecursive: false,
    batchReplaceOriginal: false,
    batchShell: "powershell",
    batchNameSuffix: "-frames",
    batchTempSuffix: ".tmp",
  },
  join: {
    workflow: "join",
    inputPath: "frame-*.gif",
    outputPath: "combined.gif",
    lossy: "0",
    colours: "256",
    width: "",
    height: "",
    scale: "",
    frameRange: "",
    delay: "6",
    loopCount: "0",
    extraFlags: "",
    optimiseLevel: "3",
    batchMode: false,
    batchDirectory: ".",
    batchPattern: "*.gif",
    batchRecursive: false,
    batchReplaceOriginal: false,
    batchShell: "powershell",
    batchNameSuffix: "-joined",
    batchTempSuffix: ".tmp",
  },
};

const COPY: Record<Workflow, { title: string; description: string }> = {
  optimise: {
    title: "Optimise",
    description: "Reduce GIF size with optimisation, lossy compression, and colour limits.",
  },
  resize: {
    title: "Resize",
    description: "Scale a GIF to a target width, height, or multiplier.",
  },
  extract: {
    title: "Extract Frames",
    description: "Pull a selected frame range out of an animated GIF.",
  },
  join: {
    title: "Join GIFs",
    description: "Combine multiple GIF inputs into one animation.",
  },
};

const quote = (value: string) => `"${value.replace(/"/g, '\\"')}"`;

const replaceGifExtension = (value: string, fallbackBase: string) => {
  const trimmed = value.trim();
  const base = trimmed || fallbackBase;
  if (/\.[^./\\]+$/.test(base)) {
    return base.replace(/\.[^./\\]+$/, ".gif");
  }
  return `${base}.gif`;
};

function buildGifsicleArgs(state: BuilderState, inputRef: string, outputRef: string) {
  const args: string[] = ["gifsicle"];
  const notes: string[] = [];

  if (state.workflow === "extract") {
    args.push(inputRef);
    if (state.frameRange.trim()) {
      args.push(state.frameRange.trim());
      notes.push(`Selects frames in the range ${state.frameRange.trim()}.`);
    }
    if (state.extraFlags.trim()) {
      args.push(state.extraFlags.trim());
    }
    args.push("--output", outputRef);
    return { args, notes };
  }

  if (state.workflow === "join") {
    args.push("--delay", state.delay || "6", "--loopcount", state.loopCount || "0", inputRef);
    if (state.extraFlags.trim()) {
      args.push(state.extraFlags.trim());
    }
    args.push("--output", outputRef);
    notes.push(`Creates a combined GIF with frame delay ${state.delay || "6"}.`);
    notes.push(state.loopCount === "0" ? "Loops forever." : `Loops ${state.loopCount} times.`);
    return { args, notes };
  }

  args.push(`-O${state.optimiseLevel}`, inputRef);
  notes.push(`Applies gifsicle optimisation level ${state.optimiseLevel}.`);

  if (state.workflow === "optimise") {
    if (state.lossy && state.lossy !== "0") {
      args.push(`--lossy=${state.lossy}`);
      notes.push(`Applies lossy compression at ${state.lossy}.`);
    }
    if (state.colours) {
      args.push("--colors", state.colours);
      notes.push(`Limits the palette to ${state.colours} colours.`);
    }
  }

  if (state.workflow === "resize") {
    if (state.scale.trim()) {
      args.push("--scale", state.scale.trim());
      notes.push(`Scales the GIF by ${state.scale.trim()}x.`);
    } else {
      args.push("--resize", `${state.width.trim() || "_"}x${state.height.trim() || "_"}`);
      notes.push(`Resizes the GIF to ${state.width.trim() || "_"}x${state.height.trim() || "_"}.`);
    }
  }

  if (state.extraFlags.trim()) {
    args.push(state.extraFlags.trim());
  }

  args.push("--output", outputRef);
  return { args, notes };
}

const buildPowerShellBatchScript = (state: BuilderState) => {
  const recursive = state.batchRecursive ? " -Recurse" : "";
  const rendered = buildGifsicleArgs(state, quote("$($file.FullName)"), quote("$outputPath")).args.join(" ");
  const lines: string[] = [
    `$files = Get-ChildItem -Path ${quote(state.batchDirectory || ".")} -Filter ${quote(state.batchPattern || "*.gif")} -File${recursive}`,
    "foreach ($file in $files) {",
  ];

  if (state.batchReplaceOriginal) {
    lines.push(`  $tempPath = Join-Path $file.DirectoryName ($file.BaseName + ${quote(state.batchTempSuffix || ".tmp")} + ".gif")`);
    lines.push("  $outputPath = $tempPath");
  } else {
    lines.push(`  $outputPath = Join-Path $file.DirectoryName ($file.BaseName + ${quote(state.batchNameSuffix || "-out")} + ".gif")`);
  }

  lines.push(`  ${rendered}`);
  lines.push("  if ($LASTEXITCODE -eq 0) {");
  if (state.batchReplaceOriginal) {
    lines.push("    Move-Item -Force $tempPath $file.FullName");
  }
  lines.push("  }");
  lines.push("}");

  return lines.join("\n");
};

const bashQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

const buildBashBatchScript = (state: BuilderState) => {
  const findDepth = state.batchRecursive ? "" : " -maxdepth 1";
  const rendered = buildGifsicleArgs(state, "\"$file\"", "\"$output_path\"").args.join(" ");
  const lines: string[] = [
    `find ${bashQuote(state.batchDirectory || ".")}${findDepth} -type f -name ${bashQuote(state.batchPattern || "*.gif")} | while IFS= read -r file; do`,
    "  dir=$(dirname \"$file\")",
    "  base=$(basename \"$file\")",
    "  stem=${base%.*}",
  ];

  if (state.batchReplaceOriginal) {
    lines.push(`  temp_path=\"$dir/$stem${state.batchTempSuffix || ".tmp"}.gif\"`);
    lines.push("  output_path=\"$temp_path\"");
  } else {
    lines.push(`  output_path=\"$dir/$stem${state.batchNameSuffix || "-out"}.gif\"`);
  }

  lines.push(`  ${rendered}`);
  lines.push("  if [ $? -eq 0 ]; then");
  if (state.batchReplaceOriginal) {
    lines.push("    mv \"$temp_path\" \"$file\"");
  }
  lines.push("  fi");
  lines.push("done");

  return lines.join("\n");
};

export function GifsicleBuilderTool() {
  const [state, setState] = useState<BuilderState>(PRESETS.optimise);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const single = buildGifsicleArgs(state, quote(state.inputPath), quote(state.outputPath));
    const notes = [...single.notes];

    if (state.batchMode && (state.workflow === "optimise" || state.workflow === "resize")) {
      notes.push(`Builds a ${state.batchShell === "powershell" ? "PowerShell" : "Bash"} batch script for GIF files matching ${state.batchPattern || "*.gif"} in ${state.batchDirectory || "."}.`);
      if (state.batchRecursive) {
        notes.push("Searches subfolders recursively.");
      }
      if (state.batchReplaceOriginal) {
        notes.push("Writes to a temporary GIF and replaces the original only after success.");
      } else {
        notes.push(`Writes new files using the suffix ${state.batchNameSuffix || "-out"}.`);
      }
      return {
        command: state.batchShell === "powershell" ? buildPowerShellBatchScript(state) : buildBashBatchScript(state),
        notes,
        heading: `Generated ${state.batchShell === "powershell" ? "PowerShell" : "Bash"} Script`,
      };
    }

    return { command: single.args.join(" "), notes, heading: "Generated Command" };
  }, [state]);

  const setWorkflow = (workflow: Workflow) => {
    setState(PRESETS[workflow]);
  };

  const update = <K extends keyof BuilderState>(key: K, value: BuilderState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
  };

  const supportsBatch = state.workflow === "optimise" || state.workflow === "resize";

  const updateOutputPath = (value: string) => {
    update("outputPath", replaceGifExtension(value, state.workflow === "extract" ? "frame-#" : "output"));
  };

  const copyCommand = async () => {
    await navigator.clipboard.writeText(result.command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
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
                  <Label htmlFor="gifsicle-input">Input</Label>
                  <Input id="gifsicle-input" value={state.inputPath} onChange={(event) => update("inputPath", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gifsicle-output">Output</Label>
                  <Input id="gifsicle-output" value={state.outputPath} onChange={(event) => updateOutputPath(event.target.value)} />
                </div>

                {(state.workflow === "optimise" || state.workflow === "resize") && (
                  <div className="space-y-2">
                    <Label>Optimise Level</Label>
                    <Select value={state.optimiseLevel} onValueChange={(value) => update("optimiseLevel", value as "1" | "2" | "3")}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {state.workflow === "optimise" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="gifsicle-lossy">Lossy</Label>
                      <Input id="gifsicle-lossy" value={state.lossy} onChange={(event) => update("lossy", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Colours</Label>
                      <Select value={state.colours} onValueChange={(value) => update("colours", value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GIF_COLOUR_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {state.workflow === "resize" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="gifsicle-width">Width</Label>
                      <Input id="gifsicle-width" value={state.width} onChange={(event) => update("width", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gifsicle-height">Height</Label>
                      <Input id="gifsicle-height" value={state.height} onChange={(event) => update("height", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gifsicle-scale">Scale</Label>
                      <Input id="gifsicle-scale" value={state.scale} onChange={(event) => update("scale", event.target.value)} placeholder="0.5" />
                    </div>
                  </>
                )}

                {state.workflow === "extract" && (
                  <div className="space-y-2">
                    <Label htmlFor="gifsicle-range">Frame Range</Label>
                    <Input id="gifsicle-range" value={state.frameRange} onChange={(event) => update("frameRange", event.target.value)} />
                  </div>
                )}

                {state.workflow === "join" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="gifsicle-delay">Frame Delay</Label>
                      <Input id="gifsicle-delay" value={state.delay} onChange={(event) => update("delay", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gifsicle-loop">Loop Count</Label>
                      <Input id="gifsicle-loop" value={state.loopCount} onChange={(event) => update("loopCount", event.target.value)} />
                    </div>
                  </>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="gifsicle-extra">Extra Flags</Label>
                  <Textarea id="gifsicle-extra" value={state.extraFlags} onChange={(event) => update("extraFlags", event.target.value)} className="min-h-20 font-mono" />
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
            <CardDescription>Generate a PowerShell loop for GIF folders, with recursive scans and safe replace-in-place output.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-wrap gap-4 text-sm md:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={state.batchMode} onChange={(event) => update("batchMode", event.target.checked)} />
                Generate batch script
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={state.batchRecursive} onChange={(event) => update("batchRecursive", event.target.checked)} disabled={!state.batchMode} />
                Include subfolders
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={state.batchReplaceOriginal} onChange={(event) => update("batchReplaceOriginal", event.target.checked)} disabled={!state.batchMode} />
                Replace originals after success
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gifsicle-batch-dir">Folder</Label>
              <Input id="gifsicle-batch-dir" value={state.batchDirectory} onChange={(event) => update("batchDirectory", event.target.value)} disabled={!state.batchMode} placeholder="D:\\gifs" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gifsicle-batch-pattern">Search Pattern</Label>
              <Input id="gifsicle-batch-pattern" value={state.batchPattern} onChange={(event) => update("batchPattern", event.target.value)} disabled={!state.batchMode} placeholder="*.gif" />
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
            <div className="space-y-2">
              <Label htmlFor="gifsicle-batch-suffix">New File Suffix</Label>
              <Input id="gifsicle-batch-suffix" value={state.batchNameSuffix} onChange={(event) => update("batchNameSuffix", event.target.value)} disabled={!state.batchMode || state.batchReplaceOriginal} placeholder="-optimised" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gifsicle-batch-temp">Temp Suffix</Label>
              <Input id="gifsicle-batch-temp" value={state.batchTempSuffix} onChange={(event) => update("batchTempSuffix", event.target.value)} disabled={!state.batchMode || !state.batchReplaceOriginal} placeholder=".tmp" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileImage className="size-5" />
              {result.heading}
            </CardTitle>
            <CardDescription>
              {state.batchMode && supportsBatch ? `This output is ${state.batchShell === "powershell" ? "PowerShell" : "Bash/Zsh"}.` : "Copy this into your terminal and swap the placeholder paths for real files."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea readOnly value={result.command} className="min-h-32 font-mono text-sm" />
            <Button onClick={copyCommand}>
              {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
              {copied ? "Copied" : "Copy Command"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What This Does</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {result.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Info className="size-5" />
          <h3 className="font-bold">About {GIFSICLE_INFO.name}</h3>
        </div>
        <div className="text-sm space-y-1">
          <p className="text-muted-foreground">{GIFSICLE_INFO.description}</p>
          <p>
            <span className="text-muted-foreground">Download:</span>{" "}
            <a href={GIFSICLE_INFO.downloadUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {GIFSICLE_INFO.downloadUrl}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
