"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Info, TerminalSquare } from "lucide-react";

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

type Workflow = "transcode" | "gif" | "extract-audio" | "image-sequence";
type VideoCodec = "libx264" | "libx265" | "libvpx-vp9" | "copy";
type AudioCodec = "aac" | "libmp3lame" | "libopus" | "copy" | "none";
type AudioOnlyCodec = "aac" | "libmp3lame" | "libopus" | "flac" | "copy";
type BatchShell = "powershell" | "bash";

const FFMPEG_INFO = {
  name: "FFmpeg",
  description: "Open-source command-line toolkit for converting, compressing, and processing audio and video files.",
  downloadUrl: "https://ffmpeg.org/download.html",
};

interface BuilderState {
  workflow: Workflow;
  inputPath: string;
  outputPath: string;
  overwrite: boolean;
  startTime: string;
  duration: string;
  videoCodec: VideoCodec;
  audioCodec: AudioCodec;
  audioOnlyCodec: AudioOnlyCodec;
  crf: string;
  preset: string;
  width: string;
  fps: string;
  audioBitrate: string;
  faststart: boolean;
  removeAudio: boolean;
  loopGif: boolean;
  sequencePattern: string;
  sequenceFramerate: string;
  pixelFormat: string;
  extraFlags: string;
  batchMode: boolean;
  batchDirectory: string;
  batchPattern: string;
  batchRecursive: boolean;
  batchReplaceOriginal: boolean;
  batchShell: BatchShell;
  batchOutputExtension: string;
  batchNameSuffix: string;
  batchTempSuffix: string;
}

const WORKFLOW_COPY: Record<Workflow, { title: string; description: string }> = {
  transcode: {
    title: "Video Transcode",
    description: "Convert a video to a new codec, size, framerate, or delivery preset.",
  },
  gif: {
    title: "Video to GIF",
    description: "Create a quick FFmpeg GIF command with trim, fps, and scale controls.",
  },
  "extract-audio": {
    title: "Extract Audio",
    description: "Pull audio from a video file into MP3, AAC, Opus, FLAC, or a direct stream copy.",
  },
  "image-sequence": {
    title: "Image Sequence to Video",
    description: "Turn numbered stills like `frame-0001.png` into a video command.",
  },
};

const PRESET_STATE: Record<Workflow, BuilderState> = {
  transcode: {
    workflow: "transcode",
    inputPath: "input.mp4",
    outputPath: "output.mp4",
    overwrite: true,
    startTime: "",
    duration: "",
    videoCodec: "libx264",
    audioCodec: "aac",
    audioOnlyCodec: "aac",
    crf: "23",
    preset: "medium",
    width: "1280",
    fps: "",
    audioBitrate: "192k",
    faststart: true,
    removeAudio: false,
    loopGif: true,
    sequencePattern: "frame-%04d.png",
    sequenceFramerate: "24",
    pixelFormat: "yuv420p",
    extraFlags: "",
    batchMode: false,
    batchDirectory: ".",
    batchPattern: "*.mp4",
    batchRecursive: false,
    batchReplaceOriginal: false,
    batchShell: "powershell",
    batchOutputExtension: "mp4",
    batchNameSuffix: "-compressed",
    batchTempSuffix: ".tmp",
  },
  gif: {
    workflow: "gif",
    inputPath: "input.mp4",
    outputPath: "output.gif",
    overwrite: true,
    startTime: "",
    duration: "3",
    videoCodec: "libx264",
    audioCodec: "none",
    audioOnlyCodec: "aac",
    crf: "23",
    preset: "medium",
    width: "640",
    fps: "12",
    audioBitrate: "192k",
    faststart: false,
    removeAudio: true,
    loopGif: true,
    sequencePattern: "frame-%04d.png",
    sequenceFramerate: "24",
    pixelFormat: "yuv420p",
    extraFlags: "",
    batchMode: false,
    batchDirectory: ".",
    batchPattern: "*.mp4",
    batchRecursive: false,
    batchReplaceOriginal: false,
    batchShell: "powershell",
    batchOutputExtension: "gif",
    batchNameSuffix: "-gif",
    batchTempSuffix: ".tmp",
  },
  "extract-audio": {
    workflow: "extract-audio",
    inputPath: "input.mp4",
    outputPath: "output.mp3",
    overwrite: true,
    startTime: "",
    duration: "",
    videoCodec: "libx264",
    audioCodec: "aac",
    audioOnlyCodec: "libmp3lame",
    crf: "23",
    preset: "medium",
    width: "",
    fps: "",
    audioBitrate: "192k",
    faststart: false,
    removeAudio: false,
    loopGif: true,
    sequencePattern: "frame-%04d.png",
    sequenceFramerate: "24",
    pixelFormat: "yuv420p",
    extraFlags: "",
    batchMode: false,
    batchDirectory: ".",
    batchPattern: "*.mp4",
    batchRecursive: false,
    batchReplaceOriginal: false,
    batchShell: "powershell",
    batchOutputExtension: "mp3",
    batchNameSuffix: "-audio",
    batchTempSuffix: ".tmp",
  },
  "image-sequence": {
    workflow: "image-sequence",
    inputPath: "frame-%04d.png",
    outputPath: "output.mp4",
    overwrite: true,
    startTime: "",
    duration: "",
    videoCodec: "libx264",
    audioCodec: "none",
    audioOnlyCodec: "aac",
    crf: "18",
    preset: "slow",
    width: "",
    fps: "24",
    audioBitrate: "192k",
    faststart: true,
    removeAudio: true,
    loopGif: true,
    sequencePattern: "frame-%04d.png",
    sequenceFramerate: "24",
    pixelFormat: "yuv420p",
    extraFlags: "",
    batchMode: false,
    batchDirectory: ".",
    batchPattern: "*.png",
    batchRecursive: false,
    batchReplaceOriginal: false,
    batchShell: "powershell",
    batchOutputExtension: "mp4",
    batchNameSuffix: "-video",
    batchTempSuffix: ".tmp",
  },
};

const shellQuote = (value: string) => {
  if (!value.trim()) {
    return "\"\"";
  }

  return `"${value.replace(/"/g, '\\"')}"`;
};

const quote = shellQuote;

const buildTrimArgs = (state: BuilderState) => {
  const args: string[] = [];

  if (state.startTime.trim()) {
    args.push("-ss", state.startTime.trim());
  }

  if (state.duration.trim()) {
    args.push("-t", state.duration.trim());
  }

  return args;
};

const appendExtraFlags = (args: string[], extraFlags: string) => {
  if (!extraFlags.trim()) {
    return;
  }

  args.push(extraFlags.trim());
};

function buildFfmpegArgs(state: BuilderState, inputRef: string, outputRef: string) {
  const args: string[] = ["ffmpeg"];
  const notes: string[] = [];
  const filters: string[] = [];

  if (state.overwrite) {
    args.push("-y");
  }

  if (state.workflow === "image-sequence") {
    args.push("-framerate", state.sequenceFramerate || "24", "-i", inputRef);
  } else {
    args.push(...buildTrimArgs(state), "-i", inputRef);
  }

  if (state.workflow === "transcode") {
    if (state.width.trim()) {
      filters.push(`scale=${state.width.trim()}:-2`);
      notes.push(`Resizes video to ${state.width.trim()}px wide while preserving aspect ratio.`);
    }

    if (state.fps.trim()) {
      filters.push(`fps=${state.fps.trim()}`);
      notes.push(`Forces output to ${state.fps.trim()} fps.`);
    }

    if (filters.length > 0) {
      args.push("-vf", quote(filters.join(",")));
    }

    if (state.videoCodec === "copy") {
      args.push("-c:v", "copy");
      notes.push("Copies the existing video stream without re-encoding.");
    } else {
      args.push("-c:v", state.videoCodec, "-crf", state.crf || "23", "-preset", state.preset || "medium");
      notes.push(`Encodes video with ${state.videoCodec} using CRF ${state.crf || "23"} and the ${state.preset || "medium"} preset.`);
    }

    if (state.removeAudio || state.audioCodec === "none") {
      args.push("-an");
      notes.push("Removes audio from the output.");
    } else if (state.audioCodec === "copy") {
      args.push("-c:a", "copy");
      notes.push("Copies the existing audio stream.");
    } else {
      args.push("-c:a", state.audioCodec, "-b:a", state.audioBitrate || "192k");
      notes.push(`Encodes audio as ${state.audioCodec} at ${state.audioBitrate || "192k"}.`);
    }

    if (state.faststart) {
      args.push("-movflags", "+faststart");
      notes.push("Moves MP4 metadata to the start of the file for faster web playback.");
    }
  }

  if (state.workflow === "gif") {
    const gifFilters = [`fps=${state.fps || "12"}`];

    if (state.width.trim()) {
      gifFilters.push(`scale=${state.width.trim()}:-1:flags=lanczos`);
      notes.push(`Scales the GIF to ${state.width.trim()}px wide with Lanczos scaling.`);
    }

    args.push("-vf", quote(gifFilters.join(",")), "-an");
    if (state.loopGif) {
      args.push("-loop", "0");
      notes.push("Configures the GIF to loop forever.");
    }

    notes.push(`Builds a GIF at ${state.fps || "12"} fps.`);
  }

  if (state.workflow === "extract-audio") {
    args.push("-vn");
    notes.push("Drops all video streams and keeps audio only.");

    if (state.audioOnlyCodec === "copy") {
      args.push("-c:a", "copy");
      notes.push("Copies the source audio stream without re-encoding.");
    } else {
      args.push("-c:a", state.audioOnlyCodec);
      if (state.audioOnlyCodec !== "flac") {
        args.push("-b:a", state.audioBitrate || "192k");
        notes.push(`Encodes audio as ${state.audioOnlyCodec} at ${state.audioBitrate || "192k"}.`);
      } else {
        notes.push("Encodes audio as lossless FLAC.");
      }
    }
  }

  if (state.workflow === "image-sequence") {
    if (state.width.trim()) {
      filters.push(`scale=${state.width.trim()}:-2`);
      notes.push(`Scales frames to ${state.width.trim()}px wide.`);
    }

    if (filters.length > 0) {
      args.push("-vf", quote(filters.join(",")));
    }

    if (state.videoCodec === "copy") {
      args.push("-c:v", "libx264");
    } else {
      args.push("-c:v", state.videoCodec, "-crf", state.crf || "18", "-preset", state.preset || "slow");
    }

    if (state.pixelFormat.trim()) {
      args.push("-pix_fmt", state.pixelFormat.trim());
      notes.push(`Sets pixel format to ${state.pixelFormat.trim()} for compatibility.`);
    }

    if (state.faststart) {
      args.push("-movflags", "+faststart");
      notes.push("Places stream metadata at the front of the file.");
    }

    notes.push(`Reads numbered frames at ${state.sequenceFramerate || "24"} fps and encodes them into video.`);
  }

  appendExtraFlags(args, state.extraFlags);
  args.push(outputRef);

  return { args, notes };
}

const getFinalExtension = (state: BuilderState) =>
  state.batchOutputExtension.trim() || state.outputPath.split(".").pop() || "mp4";

const buildPowerShellBatchScript = (state: BuilderState) => {
  const recursive = state.batchRecursive ? " -Recurse" : "";
  const extension = getFinalExtension(state);
  const rendered = buildFfmpegArgs(state, quote("$($file.FullName)"), quote("$outputPath")).args.join(" ");
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
    lines.push("    if (Test-Path $file.FullName) { Remove-Item $file.FullName -Force }");
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
  const rendered = buildFfmpegArgs(state, "\"$file\"", "\"$output_path\"").args.join(" ");
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
    lines.push("    rm -f \"$file\"");
    lines.push("    mv \"$temp_path\" \"$final_path\"");
  }
  lines.push("  fi");
  lines.push("done");

  return lines.join("\n");
};

export function FfmpegBuilderTool() {
  const [state, setState] = useState<BuilderState>(PRESET_STATE.transcode);
  const [copied, setCopied] = useState(false);

  const commandData = useMemo(() => {
    const single = buildFfmpegArgs(
      state,
      quote(state.workflow === "image-sequence" ? state.sequencePattern || state.inputPath : state.inputPath),
      quote(state.outputPath)
    );
    const notes = [...single.notes];

    if (state.batchMode && state.workflow !== "image-sequence") {
      notes.push(`Builds a ${state.batchShell === "powershell" ? "PowerShell" : "Bash"} batch script for files matching ${state.batchPattern || "*.*"} in ${state.batchDirectory || "."}.`);
      if (state.batchRecursive) {
        notes.push("Searches subfolders recursively.");
      }
      if (state.batchReplaceOriginal) {
        notes.push("Writes to a temporary file and replaces the original only after a successful conversion.");
      } else {
        notes.push(`Writes new files using the suffix ${state.batchNameSuffix || "-out"} and the .${getFinalExtension(state)} extension.`);
      }

      return {
        command: state.batchShell === "powershell" ? buildPowerShellBatchScript(state) : buildBashBatchScript(state),
        notes,
        heading: `Generated ${state.batchShell === "powershell" ? "PowerShell" : "Bash"} Script`,
      };
    }

    return {
      command: single.args.join(" "),
      notes,
      heading: "Generated Command",
    };
  }, [state]);

  const copyCommand = async () => {
    await navigator.clipboard.writeText(commandData.command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const setWorkflow = (workflow: Workflow) => {
    setState(PRESET_STATE[workflow]);
  };

  const update = <K extends keyof BuilderState>(key: K, value: BuilderState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
  };

  const supportsBatch = state.workflow !== "image-sequence";

  return (
    <div className="space-y-6">
      <Tabs value={state.workflow} onValueChange={(value) => setWorkflow(value as Workflow)}>
        <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
          {Object.entries(WORKFLOW_COPY).map(([value, copy]) => (
            <TabsTrigger key={value} value={value}>
              {copy.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(WORKFLOW_COPY).map(([value, copy]) => (
          <TabsContent key={value} value={value} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{copy.title}</CardTitle>
                <CardDescription>{copy.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inputPath">Input</Label>
                  <Input
                    id="inputPath"
                    value={state.workflow === "image-sequence" ? state.sequencePattern : state.inputPath}
                    onChange={(event) =>
                      state.workflow === "image-sequence"
                        ? update("sequencePattern", event.target.value)
                        : update("inputPath", event.target.value)
                    }
                    placeholder={state.workflow === "image-sequence" ? "frame-%04d.png" : "input.mp4"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outputPath">Output</Label>
                  <Input
                    id="outputPath"
                    value={state.outputPath}
                    onChange={(event) => update("outputPath", event.target.value)}
                    placeholder="output.mp4"
                  />
                </div>

                {state.workflow !== "image-sequence" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        value={state.startTime}
                        onChange={(event) => update("startTime", event.target.value)}
                        placeholder="00:00:05"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration</Label>
                      <Input
                        id="duration"
                        value={state.duration}
                        onChange={(event) => update("duration", event.target.value)}
                        placeholder="10"
                      />
                    </div>
                  </>
                )}

                {state.workflow === "image-sequence" ? (
                  <div className="space-y-2">
                    <Label htmlFor="sequenceFramerate">Frame Rate</Label>
                    <Input
                      id="sequenceFramerate"
                      value={state.sequenceFramerate}
                      onChange={(event) => update("sequenceFramerate", event.target.value)}
                      placeholder="24"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="fps">Output FPS</Label>
                    <Input
                      id="fps"
                      value={state.fps}
                      onChange={(event) => update("fps", event.target.value)}
                      placeholder={state.workflow === "gif" ? "12" : "30"}
                    />
                  </div>
                )}

                {state.workflow !== "extract-audio" && (
                  <div className="space-y-2">
                    <Label htmlFor="width">Width</Label>
                    <Input
                      id="width"
                      value={state.width}
                      onChange={(event) => update("width", event.target.value)}
                      placeholder="1280"
                    />
                  </div>
                )}

                {(state.workflow === "transcode" || state.workflow === "image-sequence") && (
                  <>
                    <div className="space-y-2">
                      <Label>Video Codec</Label>
                      <Select value={state.videoCodec} onValueChange={(value) => update("videoCodec", value as VideoCodec)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="libx264">libx264</SelectItem>
                          <SelectItem value="libx265">libx265</SelectItem>
                          <SelectItem value="libvpx-vp9">libvpx-vp9</SelectItem>
                          <SelectItem value="copy">copy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="crf">CRF</Label>
                      <Input id="crf" value={state.crf} onChange={(event) => update("crf", event.target.value)} placeholder="23" />
                    </div>
                    <div className="space-y-2">
                      <Label>Preset</Label>
                      <Select value={state.preset} onValueChange={(value) => update("preset", value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ultrafast">ultrafast</SelectItem>
                          <SelectItem value="veryfast">veryfast</SelectItem>
                          <SelectItem value="medium">medium</SelectItem>
                          <SelectItem value="slow">slow</SelectItem>
                          <SelectItem value="veryslow">veryslow</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {state.workflow === "transcode" && (
                  <>
                    <div className="space-y-2">
                      <Label>Audio Codec</Label>
                      <Select value={state.audioCodec} onValueChange={(value) => update("audioCodec", value as AudioCodec)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aac">aac</SelectItem>
                          <SelectItem value="libmp3lame">libmp3lame</SelectItem>
                          <SelectItem value="libopus">libopus</SelectItem>
                          <SelectItem value="copy">copy</SelectItem>
                          <SelectItem value="none">none</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audioBitrate">Audio Bitrate</Label>
                      <Input
                        id="audioBitrate"
                        value={state.audioBitrate}
                        onChange={(event) => update("audioBitrate", event.target.value)}
                        placeholder="192k"
                      />
                    </div>
                  </>
                )}

                {state.workflow === "extract-audio" && (
                  <>
                    <div className="space-y-2">
                      <Label>Audio Codec</Label>
                      <Select value={state.audioOnlyCodec} onValueChange={(value) => update("audioOnlyCodec", value as AudioOnlyCodec)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="libmp3lame">libmp3lame</SelectItem>
                          <SelectItem value="aac">aac</SelectItem>
                          <SelectItem value="libopus">libopus</SelectItem>
                          <SelectItem value="flac">flac</SelectItem>
                          <SelectItem value="copy">copy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audioOnlyBitrate">Audio Bitrate</Label>
                      <Input
                        id="audioOnlyBitrate"
                        value={state.audioBitrate}
                        onChange={(event) => update("audioBitrate", event.target.value)}
                        placeholder="192k"
                      />
                    </div>
                  </>
                )}

                {state.workflow === "image-sequence" && (
                  <div className="space-y-2">
                    <Label htmlFor="pixelFormat">Pixel Format</Label>
                    <Input
                      id="pixelFormat"
                      value={state.pixelFormat}
                      onChange={(event) => update("pixelFormat", event.target.value)}
                      placeholder="yuv420p"
                    />
                  </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="extraFlags">Extra Flags</Label>
                  <Textarea
                    id="extraFlags"
                    value={state.extraFlags}
                    onChange={(event) => update("extraFlags", event.target.value)}
                    placeholder="-threads 8 -map_metadata -1"
                    className="min-h-20 font-mono"
                  />
                </div>

                <div className="flex flex-wrap gap-4 text-sm md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={state.overwrite}
                      onChange={(event) => update("overwrite", event.target.checked)}
                    />
                    Overwrite output with `-y`
                  </label>
                  {(state.workflow === "transcode" || state.workflow === "image-sequence") && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={state.faststart}
                        onChange={(event) => update("faststart", event.target.checked)}
                      />
                      Add `+faststart`
                    </label>
                  )}
                  {state.workflow === "transcode" && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={state.removeAudio}
                        onChange={(event) => update("removeAudio", event.target.checked)}
                      />
                      Remove audio
                    </label>
                  )}
                  {state.workflow === "gif" && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={state.loopGif}
                        onChange={(event) => update("loopGif", event.target.checked)}
                      />
                      Loop GIF forever
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
            <CardDescription>Generate a PowerShell loop for whole folders, including optional recursive processing and safe replacement of originals.</CardDescription>
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
              <Label htmlFor="batchDirectory">Folder</Label>
              <Input id="batchDirectory" value={state.batchDirectory} onChange={(event) => update("batchDirectory", event.target.value)} disabled={!state.batchMode} placeholder="D:\\media" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchPattern">Search Pattern</Label>
              <Input id="batchPattern" value={state.batchPattern} onChange={(event) => update("batchPattern", event.target.value)} disabled={!state.batchMode} placeholder="*.mp4" />
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
              <Label htmlFor="batchOutputExtension">Output Extension</Label>
              <Input id="batchOutputExtension" value={state.batchOutputExtension} onChange={(event) => update("batchOutputExtension", event.target.value)} disabled={!state.batchMode} placeholder="mp4" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchNameSuffix">New File Suffix</Label>
              <Input id="batchNameSuffix" value={state.batchNameSuffix} onChange={(event) => update("batchNameSuffix", event.target.value)} disabled={!state.batchMode || state.batchReplaceOriginal} placeholder="-compressed" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchTempSuffix">Temp Suffix</Label>
              <Input id="batchTempSuffix" value={state.batchTempSuffix} onChange={(event) => update("batchTempSuffix", event.target.value)} disabled={!state.batchMode || !state.batchReplaceOriginal} placeholder=".tmp" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TerminalSquare className="size-5" />
              {commandData.heading}
            </CardTitle>
            <CardDescription>
              {state.batchMode && supportsBatch ? `This output is ${state.batchShell === "powershell" ? "PowerShell" : "Bash/Zsh"}.` : "Copy this into your terminal and swap the placeholder paths for real files."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea readOnly value={commandData.command} className="min-h-36 font-mono text-sm" />
            <Button onClick={copyCommand}>
              {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
              {copied ? "Copied" : "Copy Command"}
            </Button>
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="size-5" />
              What This Does
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {commandData.notes.length > 0 ? (
              commandData.notes.map((note) => (
                <p key={note}>{note}</p>
              ))
            ) : (
              <p>Fill in a few options and the builder will describe the generated command here.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Info className="size-5" />
          <h3 className="font-bold">About {FFMPEG_INFO.name}</h3>
        </div>
        <div className="text-sm space-y-1">
          <p className="text-muted-foreground">{FFMPEG_INFO.description}</p>
          <p>
            <span className="text-muted-foreground">Download:</span>{" "}
            <a href={FFMPEG_INFO.downloadUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {FFMPEG_INFO.downloadUrl}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
