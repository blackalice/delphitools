import { Buffer } from "buffer";
import woffTool from "woff2sfnt-sfnt2woff";

type SourceFormat = "woff" | "woff2";

type Woff2Decompressor = (buffer: Uint8Array) => Promise<Uint8Array>;

let woff2DecompressorPromise: Promise<Woff2Decompressor> | null = null;

async function loadWoff2Decompressor() {
  if (!woff2DecompressorPromise) {
    woff2DecompressorPromise = import("./wawoff2-browser.js").then((module) =>
      ("default" in module ? module.default : module) as Woff2Decompressor
    );
  }

  return woff2DecompressorPromise;
}

export async function convertFontToSfnt(
  fontBytes: Uint8Array,
  sourceFormat: SourceFormat
) {
  const fontBuffer = Buffer.from(fontBytes);

  if (sourceFormat === "woff") {
    return new Uint8Array(woffTool.toSfnt(fontBuffer));
  }

  const decompressWoff2 = await loadWoff2Decompressor();
  const converted = await decompressWoff2(fontBuffer);

  return new Uint8Array(converted);
}
