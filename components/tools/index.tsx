"use client";

import { PxToRemTool } from "./px-to-rem";
import { WordCounterTool } from "./word-counter";
import { QrGeneratorTool } from "./qr-generator";
import { ImageConverterTool } from "./image-converter";
import { RegexTesterTool } from "./regex-tester";
import { SciCalcTool } from "./sci-calc";
import { GraphCalcTool } from "./graph-calc";
import { AlgebraCalcTool } from "./algebra-calc";
import { BaseConverterTool } from "./base-converter";
import { TimeCalcTool } from "./time-calc";
import { UnitConverterTool } from "./unit-converter";
import { EncoderTool } from "./encoder";
import { ImageTracerTool } from "./image-tracer";
import { GuillotineDirectorTool } from "./guillotine-director";
import { PdfPreflightTool } from "./pdf-preflight";
import { GifOptimiserTool } from "./gif-optimiser";
import { FontConverterTool } from "./font-converter";
import { DiffCheckerTool } from "./diff-checker";
import { ImageComparerTool } from "./image-comparer";
import { TextScratchpadTool } from "./text-scratchpad";
import { FfmpegBuilderTool } from "./ffmpeg-builder";
import { ImagemagickBuilderTool } from "./imagemagick-builder";
import { GifsicleBuilderTool } from "./gifsicle-builder";

export const toolComponents: Record<string, React.ComponentType> = {
  "px-to-rem": PxToRemTool,
  "word-counter": WordCounterTool,
  "qr-genny": QrGeneratorTool,
  "image-converter": ImageConverterTool,
  "regex-tester": RegexTesterTool,
  "sci-calc": SciCalcTool,
  "graph-calc": GraphCalcTool,
  "algebra-calc": AlgebraCalcTool,
  "base-converter": BaseConverterTool,
  "time-calc": TimeCalcTool,
  "unit-converter": UnitConverterTool,
  "encoder": EncoderTool,
  "image-tracer": ImageTracerTool,
  "gif-optimiser": GifOptimiserTool,
  "font-converter": FontConverterTool,
  "diff-checker": DiffCheckerTool,
  "image-comparer": ImageComparerTool,
  "text-scratchpad": TextScratchpadTool,
  "ffmpeg-builder": FfmpegBuilderTool,
  "imagemagick-builder": ImagemagickBuilderTool,
  "gifsicle-builder": GifsicleBuilderTool,
  "guillotine-director": GuillotineDirectorTool,
  "pdf-preflight": PdfPreflightTool,
};
