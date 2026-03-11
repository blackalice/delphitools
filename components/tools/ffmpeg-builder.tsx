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
type VideoOutputFormat = "mp4" | "mov" | "mkv" | "webm";
type AudioOutputFormat = "mp3" | "m4a" | "opus" | "flac";
type VideoCodec = "libx264" | "libx265" | "libvpx-vp9";
type AudioCodec = "aac" | "libmp3lame" | "libopus";
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
  videoFormat: VideoOutputFormat;
  audioFormat: AudioOutputFormat;
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
  gifPalette: boolean;
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
  batchNameSuffix: string;
  batchTempSuffix: string;
}

interface DetailSection {
  title: string;
  items: string[];
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
    description: "Pull audio from a video file into MP3, AAC, Opus, FLAC, or copy the source stream when the container supports it.",
  },
  "image-sequence": {
    title: "Image Sequence to Video",
    description: "Turn numbered stills like `frame-0001.png` into a video command.",
  },
};

const VIDEO_FORMAT_OPTIONS: Array<{
  value: VideoOutputFormat;
  label: string;
  videoCodecs: VideoCodec[];
  audioCodecs: AudioCodec[];
  supportsFaststart: boolean;
}> = [
  {
    value: "mp4",
    label: "MP4",
    videoCodecs: ["libx264", "libx265"],
    audioCodecs: ["aac"],
    supportsFaststart: true,
  },
  {
    value: "mov",
    label: "MOV",
    videoCodecs: ["libx264", "libx265"],
    audioCodecs: ["aac"],
    supportsFaststart: false,
  },
  {
    value: "mkv",
    label: "MKV",
    videoCodecs: ["libx264", "libx265", "libvpx-vp9"],
    audioCodecs: ["aac", "libmp3lame", "libopus"],
    supportsFaststart: false,
  },
  {
    value: "webm",
    label: "WebM",
    videoCodecs: ["libvpx-vp9"],
    audioCodecs: ["libopus"],
    supportsFaststart: false,
  },
];

const AUDIO_FORMAT_OPTIONS: Array<{
  value: AudioOutputFormat;
  label: string;
  codec: AudioOnlyCodec;
  bitrateLabel: string;
}> = [
  { value: "mp3", label: "MP3", codec: "libmp3lame", bitrateLabel: "192k" },
  { value: "m4a", label: "M4A (AAC)", codec: "aac", bitrateLabel: "192k" },
  { value: "opus", label: "Opus", codec: "libopus", bitrateLabel: "160k" },
  { value: "flac", label: "FLAC", codec: "flac", bitrateLabel: "" },
];

const AUDIO_ONLY_CODEC_OPTIONS: Array<{ value: AudioOnlyCodec; label: string }> = [
  { value: "aac", label: "AAC" },
  { value: "libmp3lame", label: "MP3 (libmp3lame)" },
  { value: "libopus", label: "Opus" },
  { value: "flac", label: "FLAC" },
  { value: "copy", label: "Copy Source Stream" },
];

const RECIPES: Record<Workflow, Array<{ value: string; label: string; patch: Partial<BuilderState> }>> = {
  transcode: [
    {
      value: "web-mp4",
      label: "Web MP4",
      patch: {
        outputPath: "web-output.mp4",
        videoFormat: "mp4",
        videoCodec: "libx264",
        width: "1920",
        fps: "30",
        crf: "23",
        audioCodec: "aac",
        audioBitrate: "192k",
        faststart: true,
        removeAudio: false,
      },
    },
    {
      value: "light-preview",
      label: "Light Preview",
      patch: {
        outputPath: "preview.mp4",
        videoFormat: "mp4",
        videoCodec: "libx264",
        width: "1280",
        fps: "24",
        crf: "28",
        audioCodec: "aac",
        audioBitrate: "128k",
        faststart: true,
        removeAudio: false,
      },
    },
  ],
  gif: [
    {
      value: "social-loop",
      label: "Social Loop",
      patch: {
        outputPath: "clip.gif",
        width: "720",
        fps: "12",
        duration: "4",
        gifPalette: true,
        loopGif: true,
      },
    },
    {
      value: "tiny-preview",
      label: "Tiny Preview",
      patch: {
        outputPath: "preview.gif",
        width: "480",
        fps: "10",
        duration: "3",
        gifPalette: true,
        loopGif: true,
      },
    },
  ],
  "extract-audio": [
    {
      value: "podcast-mp3",
      label: "Podcast MP3",
      patch: {
        outputPath: "podcast.mp3",
        audioFormat: "mp3",
        audioOnlyCodec: "libmp3lame",
        audioBitrate: "192k",
      },
    },
    {
      value: "source-copy",
      label: "Copy Source Stream",
      patch: {
        outputPath: "audio.m4a",
        audioFormat: "m4a",
        audioOnlyCodec: "copy",
      },
    },
  ],
  "image-sequence": [
    {
      value: "delivery-mp4",
      label: "Delivery MP4",
      patch: {
        outputPath: "sequence.mp4",
        videoFormat: "mp4",
        videoCodec: "libx264",
        sequenceFramerate: "24",
        crf: "18",
        preset: "slow",
        pixelFormat: "yuv420p",
        faststart: true,
      },
    },
    {
      value: "archive-mkv",
      label: "Archive MKV",
      patch: {
        outputPath: "sequence.mkv",
        videoFormat: "mkv",
        videoCodec: "libx265",
        sequenceFramerate: "24",
        crf: "18",
        preset: "medium",
        pixelFormat: "yuv420p",
        faststart: false,
      },
    },
  ],
};

const PRESET_STATE: Record<Workflow, BuilderState> = {
  transcode: {
    workflow: "transcode",
    inputPath: "input.mp4",
    outputPath: "output.mp4",
    videoFormat: "mp4",
    audioFormat: "mp3",
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
    gifPalette: true,
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
    batchNameSuffix: "-compressed",
    batchTempSuffix: ".tmp",
  },
  gif: {
    workflow: "gif",
    inputPath: "input.mp4",
    outputPath: "output.gif",
    videoFormat: "mp4",
    audioFormat: "mp3",
    overwrite: true,
    startTime: "",
    duration: "3",
    videoCodec: "libx264",
    audioCodec: "aac",
    audioOnlyCodec: "aac",
    crf: "23",
    preset: "medium",
    width: "640",
    fps: "12",
    audioBitrate: "192k",
    faststart: false,
    removeAudio: true,
    gifPalette: true,
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
    batchNameSuffix: "-gif",
    batchTempSuffix: ".tmp",
  },
  "extract-audio": {
    workflow: "extract-audio",
    inputPath: "input.mp4",
    outputPath: "output.mp3",
    videoFormat: "mp4",
    audioFormat: "mp3",
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
    gifPalette: true,
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
    batchNameSuffix: "-audio",
    batchTempSuffix: ".tmp",
  },
  "image-sequence": {
    workflow: "image-sequence",
    inputPath: "frame-%04d.png",
    outputPath: "output.mp4",
    videoFormat: "mp4",
    audioFormat: "mp3",
    overwrite: true,
    startTime: "",
    duration: "",
    videoCodec: "libx264",
    audioCodec: "aac",
    audioOnlyCodec: "aac",
    crf: "18",
    preset: "slow",
    width: "",
    fps: "24",
    audioBitrate: "192k",
    faststart: true,
    removeAudio: true,
    gifPalette: true,
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

const replaceExtension = (value: string, extension: string, fallbackBase: string) => {
  const trimmed = value.trim();
  const base = trimmed || fallbackBase;
  if (/\.[^./\\]+$/.test(base)) {
    return base.replace(/\.[^./\\]+$/, `.${extension}`);
  }
  return `${base}.${extension}`;
};

const buildSequenceFallback = (state: BuilderState) => state.sequencePattern || PRESET_STATE["image-sequence"].sequencePattern;

const getVideoFormatConfig = (format: VideoOutputFormat) =>
  VIDEO_FORMAT_OPTIONS.find((option) => option.value === format) ?? VIDEO_FORMAT_OPTIONS[0];

const getAudioFormatConfig = (format: AudioOutputFormat) =>
  AUDIO_FORMAT_OPTIONS.find((option) => option.value === format) ?? AUDIO_FORMAT_OPTIONS[0];

const getFinalExtension = (state: BuilderState) => {
  if (state.workflow === "gif") {
    return "gif";
  }
  if (state.workflow === "extract-audio") {
    return state.audioFormat;
  }
  return state.videoFormat;
};

const syncVideoFormatState = (current: BuilderState, videoFormat: VideoOutputFormat): BuilderState => {
  const format = getVideoFormatConfig(videoFormat);
  return {
    ...current,
    videoFormat,
    outputPath: replaceExtension(current.outputPath, videoFormat, "output"),
    videoCodec: format.videoCodecs.includes(current.videoCodec) ? current.videoCodec : format.videoCodecs[0],
    audioCodec: format.audioCodecs.includes(current.audioCodec) ? current.audioCodec : format.audioCodecs[0],
    faststart: format.supportsFaststart ? current.faststart : false,
  };
};

const syncAudioFormatState = (current: BuilderState, audioFormat: AudioOutputFormat): BuilderState => {
  const format = getAudioFormatConfig(audioFormat);
  return {
    ...current,
    audioFormat,
    outputPath: replaceExtension(current.outputPath, audioFormat, "output"),
    audioOnlyCodec: format.codec,
    audioBitrate: format.bitrateLabel || current.audioBitrate,
  };
};

const applyWorkflowPreset = (current: BuilderState, workflow: Workflow): BuilderState => {
  let next: BuilderState = {
    ...PRESET_STATE[workflow],
    inputPath: current.inputPath,
    overwrite: current.overwrite,
    startTime: workflow === "image-sequence" ? PRESET_STATE[workflow].startTime : current.startTime,
    duration: workflow === "image-sequence" ? PRESET_STATE[workflow].duration : current.duration,
    width: workflow === "extract-audio" ? PRESET_STATE[workflow].width : current.width,
    fps: workflow === "image-sequence" ? PRESET_STATE[workflow].fps : current.fps,
    crf: workflow === "transcode" || workflow === "image-sequence" ? current.crf : PRESET_STATE[workflow].crf,
    preset: workflow === "transcode" || workflow === "image-sequence" ? current.preset : PRESET_STATE[workflow].preset,
    audioBitrate: current.audioBitrate,
    faststart: current.faststart,
    extraFlags: current.extraFlags,
    batchMode: workflow === "image-sequence" ? false : current.batchMode,
    batchDirectory: current.batchDirectory,
    batchPattern: current.batchPattern,
    batchRecursive: current.batchRecursive,
    batchReplaceOriginal: current.batchReplaceOriginal,
    batchShell: current.batchShell,
    batchNameSuffix: current.batchNameSuffix,
    batchTempSuffix: current.batchTempSuffix,
  };

  if (workflow === "transcode" || workflow === "image-sequence") {
    next = syncVideoFormatState(next, current.videoFormat);
    next.videoCodec = getVideoFormatConfig(next.videoFormat).videoCodecs.includes(current.videoCodec) ? current.videoCodec : next.videoCodec;
    next.audioCodec = getVideoFormatConfig(next.videoFormat).audioCodecs.includes(current.audioCodec) ? current.audioCodec : next.audioCodec;
  }

  if (workflow === "extract-audio") {
    next = syncAudioFormatState(next, current.audioFormat);
    next.audioOnlyCodec = current.audioOnlyCodec;
  }

  next.outputPath = replaceExtension(current.outputPath, getFinalExtension(next), "output");
  return next;
};

const applyRecipePatch = (current: BuilderState, patch: Partial<BuilderState>): BuilderState => {
  let next = current;

  if (patch.videoFormat) {
    next = syncVideoFormatState(next, patch.videoFormat);
  }

  if (patch.audioFormat) {
    next = syncAudioFormatState(next, patch.audioFormat);
  }

  next = { ...next, ...patch };

  if (patch.outputPath) {
    next.outputPath = patch.outputPath;
  }

  return next;
};

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

const buildWarnings = (state: BuilderState) => {
  const warnings: string[] = [];

  if (state.workflow === "gif" && !state.gifPalette) {
    warnings.push("One-pass GIF mode is faster, but usually produces larger files and rougher gradients.");
  }

  if (state.workflow === "extract-audio" && state.audioOnlyCodec === "copy") {
    warnings.push("Stream copy only works when the source audio codec is valid for the selected output container.");
  }

  if (state.workflow === "image-sequence" && !/%\d*d/.test(state.sequencePattern)) {
    warnings.push("FFmpeg sequence inputs usually need a numbered pattern such as `frame-%04d.png`.");
  }

  if (state.batchMode && state.batchReplaceOriginal) {
    warnings.push("Replace original after success will overwrite source filenames after each successful run.");
  }

  return warnings;
};

const buildDetailSections = (state: BuilderState): DetailSection[] => {
  const input: string[] = [];
  const processing: string[] = [];
  const output: string[] = [];
  const batch: string[] = [];

  if (state.workflow === "image-sequence") {
    input.push(`Input pattern: ${buildSequenceFallback(state)}.`);
    input.push(`Input rate: ${state.sequenceFramerate || "24"} fps.`);
  } else {
    input.push(`Input file: ${state.inputPath || "input media"}.`);
    if (state.startTime.trim()) {
      input.push(`Start at ${state.startTime.trim()}.`);
    }
    if (state.duration.trim()) {
      input.push(`Process ${state.duration.trim()} of media.`);
    }
  }

  if (state.workflow === "transcode") {
    processing.push(`Video codec: ${state.videoCodec}.`);
    processing.push(`CRF ${state.crf || "23"} with ${state.preset || "medium"} preset.`);
    if (state.width.trim()) {
      processing.push(`Resize to ${state.width.trim()}px wide.`);
    }
    if (state.fps.trim()) {
      processing.push(`Force ${state.fps.trim()} fps.`);
    }
    output.push(`Container: ${state.videoFormat.toUpperCase()}.`);
    output.push(state.removeAudio ? "Audio removed." : `Audio codec: ${state.audioCodec} at ${state.audioBitrate || "192k"}.`);
    if (state.faststart && state.videoFormat === "mp4") {
      output.push("Faststart enabled.");
    }
  }

  if (state.workflow === "gif") {
    processing.push(`GIF rate: ${state.fps || "12"} fps.`);
    if (state.width.trim()) {
      processing.push(`GIF width: ${state.width.trim()}px.`);
    }
    processing.push(state.gifPalette ? "Palette generation enabled." : "One-pass GIF conversion.");
    output.push(state.loopGif ? "GIF loops forever." : "GIF does not force looping.");
  }

  if (state.workflow === "extract-audio") {
    processing.push("Video streams removed with `-vn`.");
    output.push(`Audio format: ${state.audioFormat.toUpperCase()}.`);
    output.push(state.audioOnlyCodec === "copy" ? "Audio stream copied without re-encoding." : `Audio codec: ${state.audioOnlyCodec}.`);
    if (state.audioOnlyCodec !== "flac" && state.audioOnlyCodec !== "copy") {
      output.push(`Audio bitrate: ${state.audioBitrate || "192k"}.`);
    }
  }

  if (state.workflow === "image-sequence") {
    processing.push(`Video codec: ${state.videoCodec}.`);
    processing.push(`CRF ${state.crf || "18"} with ${state.preset || "slow"} preset.`);
    if (state.width.trim()) {
      processing.push(`Resize to ${state.width.trim()}px wide.`);
    }
    output.push(`Container: ${state.videoFormat.toUpperCase()}.`);
    if (state.pixelFormat.trim()) {
      output.push(`Pixel format: ${state.pixelFormat.trim()}.`);
    }
    if (state.faststart && state.videoFormat === "mp4") {
      output.push("Faststart enabled.");
    }
  }

  output.push(`Output path: ${state.outputPath || `output.${getFinalExtension(state)}`}.`);

  if (state.batchMode && state.workflow !== "image-sequence") {
    batch.push(`Shell: ${state.batchShell === "powershell" ? "PowerShell" : "Bash/Zsh"}.`);
    batch.push(`Folder: ${state.batchDirectory || "."}.`);
    batch.push(`Input pattern: ${state.batchPattern || "*.*"}.`);
    batch.push(state.batchRecursive ? "Includes subfolders." : "Current folder only.");
    batch.push(
      state.batchReplaceOriginal
        ? `Replaces originals via temporary .${getFinalExtension(state)} files after successful conversion.`
        : `Creates new files with suffix ${state.batchNameSuffix || "-out"} and extension .${getFinalExtension(state)}.`
    );
  }

  return [
    { title: "Input", items: input },
    { title: "Processing", items: processing },
    { title: "Output", items: output },
    { title: "Batch", items: batch },
  ].filter((section) => section.items.length > 0);
};

const formatWrappedCommand = (command: string, preserveLineBreaks: boolean) =>
  preserveLineBreaks ? command : command.replace(/ (-[^ ]+)/g, " \\\n  $1");

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

    args.push("-c:v", state.videoCodec, "-crf", state.crf || "23");
    if (state.videoCodec !== "libvpx-vp9") {
      args.push("-preset", state.preset || "medium");
      notes.push(`Encodes video with ${state.videoCodec} using CRF ${state.crf || "23"} and the ${state.preset || "medium"} preset.`);
    } else {
      notes.push(`Encodes video with ${state.videoCodec} using CRF ${state.crf || "23"}.`);
    }

    if (state.removeAudio) {
      args.push("-an");
      notes.push("Removes audio from the output.");
    } else {
      args.push("-c:a", state.audioCodec, "-b:a", state.audioBitrate || "192k");
      notes.push(`Encodes audio as ${state.audioCodec} at ${state.audioBitrate || "192k"}.`);
    }

    if (state.faststart && state.videoFormat === "mp4") {
      args.push("-movflags", "+faststart");
      notes.push("Moves MP4 metadata to the start of the file for faster web playback.");
    }

    notes.push(`Uses the ${state.videoFormat.toUpperCase()} container.`);
  }

  if (state.workflow === "gif") {
    const gifFilters = [`fps=${state.fps || "12"}`];

    if (state.width.trim()) {
      gifFilters.push(`scale=${state.width.trim()}:-1:flags=lanczos`);
      notes.push(`Scales the GIF to ${state.width.trim()}px wide with Lanczos scaling.`);
    }

    if (state.gifPalette) {
      args.push(
        "-filter_complex",
        quote(`[0:v]${gifFilters.join(",")},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse[gif]`),
        "-map",
        quote("[gif]"),
        "-an"
      );
      notes.push("Generates and applies a palette for better GIF quality and smaller files.");
    } else {
      args.push("-vf", quote(gifFilters.join(",")), "-an");
      notes.push("Uses a one-pass GIF conversion without a generated palette.");
    }
    if (state.loopGif) {
      args.push("-loop", "0");
      notes.push("Configures the GIF to loop forever.");
    }

    notes.push(`Builds a GIF at ${state.fps || "12"} fps.`);
  }

  if (state.workflow === "extract-audio") {
    args.push("-vn");
    notes.push("Drops all video streams and keeps audio only.");

    args.push("-c:a", state.audioOnlyCodec);
    if (state.audioOnlyCodec === "copy") {
      notes.push("Copies the source audio stream without re-encoding. This requires a compatible output container.");
    } else if (state.audioOnlyCodec !== "flac") {
      args.push("-b:a", state.audioBitrate || "192k");
      notes.push(`Encodes audio as ${state.audioOnlyCodec} at ${state.audioBitrate || "192k"}.`);
    } else {
      notes.push("Encodes audio as lossless FLAC.");
    }

    notes.push(`Writes audio to ${state.audioFormat.toUpperCase()}.`);
  }

  if (state.workflow === "image-sequence") {
    if (state.width.trim()) {
      filters.push(`scale=${state.width.trim()}:-2`);
      notes.push(`Scales frames to ${state.width.trim()}px wide.`);
    }

    if (filters.length > 0) {
      args.push("-vf", quote(filters.join(",")));
    }

    args.push("-c:v", state.videoCodec, "-crf", state.crf || "18");
    if (state.videoCodec !== "libvpx-vp9") {
      args.push("-preset", state.preset || "slow");
    }

    if (state.pixelFormat.trim()) {
      args.push("-pix_fmt", state.pixelFormat.trim());
      notes.push(`Sets pixel format to ${state.pixelFormat.trim()} for compatibility.`);
    }

    if (state.faststart && state.videoFormat === "mp4") {
      args.push("-movflags", "+faststart");
      notes.push("Places stream metadata at the front of the file.");
    }

    notes.push(`Reads numbered frames at ${state.sequenceFramerate || "24"} fps and encodes them into video.`);
    notes.push(`Writes the sequence as ${state.videoFormat.toUpperCase()}.`);
  }

  appendExtraFlags(args, state.extraFlags);
  args.push(outputRef);

  return { args, notes };
}

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
    lines.push("    mv -f \"$temp_path\" \"$final_path\"");
  }
  lines.push("  fi");
  lines.push("done");

  return lines.join("\n");
};

export function FfmpegBuilderTool() {
  const [state, setState] = useState<BuilderState>(PRESET_STATE.transcode);
  const [copiedKind, setCopiedKind] = useState<"output" | "flags" | null>(null);
  const [outputView, setOutputView] = useState<"compact" | "wrapped">("wrapped");

  const commandData = useMemo(() => {
    const single = buildFfmpegArgs(
      state,
      quote(state.workflow === "image-sequence" ? state.sequencePattern || state.inputPath : state.inputPath),
      quote(state.outputPath)
    );
    const warnings = buildWarnings(state);
    const sections = buildDetailSections(state);

    if (state.batchMode && state.workflow !== "image-sequence") {
      const batchArgs = buildFfmpegArgs(
        state,
        state.batchShell === "powershell" ? quote("$($file.FullName)") : "\"$file\"",
        state.batchShell === "powershell" ? quote("$outputPath") : "\"$output_path\""
      ).args;
      const command = state.batchShell === "powershell" ? buildPowerShellBatchScript(state) : buildBashBatchScript(state);

      return {
        commandCompact: command,
        commandWrapped: command,
        flags: batchArgs.slice(1).join(" "),
        sections,
        warnings,
        heading: `Generated ${state.batchShell === "powershell" ? "PowerShell" : "Bash"} Script`,
      };
    }

    const compact = single.args.join(" ");
    return {
      commandCompact: compact,
      commandWrapped: formatWrappedCommand(compact, false),
      flags: single.args.slice(1).join(" "),
      sections,
      warnings,
      heading: "Generated Command",
    };
  }, [state]);

  const copyText = async (value: string, kind: "output" | "flags") => {
    await navigator.clipboard.writeText(value);
    setCopiedKind(kind);
    window.setTimeout(() => setCopiedKind(null), 1500);
  };

  const setWorkflow = (workflow: Workflow) => {
    setState((current) => applyWorkflowPreset(current, workflow));
  };

  const update = <K extends keyof BuilderState>(key: K, value: BuilderState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
  };

  const updateOutputPath = (value: string) => {
    update("outputPath", replaceExtension(value, getFinalExtension(state), "output"));
  };

  const setVideoFormat = (value: VideoOutputFormat) => {
    setState((current) => syncVideoFormatState(current, value));
  };

  const setAudioFormat = (value: AudioOutputFormat) => {
    setState((current) => syncAudioFormatState(current, value));
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

  const supportsBatch = state.workflow !== "image-sequence";
  const currentVideoFormat = getVideoFormatConfig(state.videoFormat);
  const currentAudioFormat = getAudioFormatConfig(state.audioFormat);
  const showFaststart = (state.workflow === "transcode" || state.workflow === "image-sequence") && currentVideoFormat.supportsFaststart;

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
                  {state.workflow === "image-sequence" && (
                    <p className="text-xs text-muted-foreground">Use a numbered pattern such as `frame-%04d.png`.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outputPath">Output</Label>
                  <Input
                    id="outputPath"
                    value={state.outputPath}
                    onChange={(event) => updateOutputPath(event.target.value)}
                    placeholder={`output.${getFinalExtension(state)}`}
                  />
                </div>

                {(state.workflow === "transcode" || state.workflow === "image-sequence") && (
                  <div className="space-y-2">
                    <Label>Output Format</Label>
                    <Select value={state.videoFormat} onValueChange={(value) => setVideoFormat(value as VideoOutputFormat)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VIDEO_FORMAT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {state.workflow === "extract-audio" && (
                  <div className="space-y-2">
                    <Label>Output Format</Label>
                    <Select value={state.audioFormat} onValueChange={(value) => setAudioFormat(value as AudioOutputFormat)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AUDIO_FORMAT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
                          {currentVideoFormat.videoCodecs.map((codec) => (
                            <SelectItem key={codec} value={codec}>
                              {codec}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="crf">CRF</Label>
                      <Input id="crf" value={state.crf} onChange={(event) => update("crf", event.target.value)} placeholder="23" />
                    </div>
                    {state.videoCodec !== "libvpx-vp9" ? (
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
                    ) : (
                      <div className="space-y-2">
                        <Label>Preset</Label>
                        <Input value="Not used for VP9 in this builder" readOnly />
                      </div>
                    )}
                  </>
                )}

                {state.workflow === "transcode" && !state.removeAudio && (
                  <>
                    <div className="space-y-2">
                      <Label>Audio Codec</Label>
                      <Select value={state.audioCodec} onValueChange={(value) => update("audioCodec", value as AudioCodec)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currentVideoFormat.audioCodecs.map((codec) => (
                            <SelectItem key={codec} value={codec}>
                              {codec}
                            </SelectItem>
                          ))}
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
                          {AUDIO_ONLY_CODEC_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {state.audioOnlyCodec !== "flac" && state.audioOnlyCodec !== "copy" && (
                      <div className="space-y-2">
                      <Label htmlFor="audioOnlyBitrate">Audio Bitrate</Label>
                      <Input
                        id="audioOnlyBitrate"
                        value={state.audioBitrate}
                        onChange={(event) => update("audioBitrate", event.target.value)}
                        placeholder={currentAudioFormat.bitrateLabel || "192k"}
                      />
                      </div>
                    )}
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
                  {showFaststart && (
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
                    <>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={state.gifPalette}
                          onChange={(event) => update("gifPalette", event.target.checked)}
                        />
                        Generate palette
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={state.loopGif}
                          onChange={(event) => update("loopGif", event.target.checked)}
                        />
                        Loop GIF forever
                      </label>
                    </>
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
            <CardDescription>Generate a reusable PowerShell or Bash script for whole folders, including optional recursive processing and replace-in-place output.</CardDescription>
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
              <Label htmlFor="batchDirectory">Folder</Label>
              <Input id="batchDirectory" value={state.batchDirectory} onChange={(event) => update("batchDirectory", event.target.value)} disabled={!state.batchMode} placeholder="D:\\media" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchPattern">Input Pattern</Label>
              <Input id="batchPattern" value={state.batchPattern} onChange={(event) => update("batchPattern", event.target.value)} disabled={!state.batchMode} placeholder="*.mp4" />
              <p className="text-xs text-muted-foreground">
                Use wildcards such as `*.mp4` or `clip-*.mov`. PowerShell uses `Get-ChildItem -Filter`; Bash uses `find -name`.
              </p>
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
                Batch output uses the same format as the generated command: `.{getFinalExtension(state)}`.
              </p>
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
            <div className="flex flex-wrap gap-3">
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
            </div>
            <Textarea
              readOnly
              wrap="soft"
              value={outputView === "wrapped" ? commandData.commandWrapped : commandData.commandCompact}
              className="min-h-36 font-mono text-sm whitespace-pre-wrap break-all"
            />
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => copyText(outputView === "wrapped" ? commandData.commandWrapped : commandData.commandCompact, "output")}>
                {copiedKind === "output" ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
                {copiedKind === "output" ? "Copied Output" : "Copy Output"}
              </Button>
              <Button variant="outline" onClick={() => copyText(commandData.flags, "flags")}>
                {copiedKind === "flags" ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
                {copiedKind === "flags" ? "Copied Flags" : "Copy Flags"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="size-5" />
              Command Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {commandData.warnings.map((warning) => (
              <p key={warning} className="text-amber-700 dark:text-amber-300">
                Warning: {warning}
              </p>
            ))}
            {commandData.sections.length > 0 ? (
              commandData.sections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <p className="font-medium text-foreground">{section.title}</p>
                  {section.items.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
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
