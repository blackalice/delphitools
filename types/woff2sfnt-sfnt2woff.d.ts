declare module "woff2sfnt-sfnt2woff" {
  export function toSfnt(buffer: Uint8Array): Uint8Array;
  export function toWoff(buffer: Uint8Array): Uint8Array;

  const api: {
    toSfnt: typeof toSfnt;
    toWoff: typeof toWoff;
  };

  export default api;
}
