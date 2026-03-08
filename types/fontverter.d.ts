declare module "fontverter" {
  export type FontFormat = "sfnt" | "woff" | "woff2" | "truetype";

  export function detectFormat(buffer: Uint8Array): "sfnt" | "woff" | "woff2";
  export function convert(
    buffer: Uint8Array,
    toFormat: FontFormat,
    fromFormat?: FontFormat
  ): Promise<Uint8Array>;
}
