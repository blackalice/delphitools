declare module "gifsicle-wasm-browser" {
  export type GifsicleInputFile = {
    file: ArrayBuffer | Blob | File | string;
    name: string;
  };

  export type GifsicleRunOptions = {
    command: string[];
    folder?: string[];
    input: GifsicleInputFile[];
    isStrict?: boolean;
    start?: (files: GifsicleInputFile[]) => void;
  };

  export type GifsicleTool = {
    textToUrl(input?: unknown): Promise<string>;
  };

  const gifsicle: {
    tool: GifsicleTool;
    run(options: GifsicleRunOptions): Promise<File[]>;
  };

  export default gifsicle;
}
