function unavailable() {
  throw new Error("fs is not available in the browser.");
}

const fsShim = {
  readFile: unavailable,
  readFileSync: unavailable,
};

export const readFile = unavailable;
export const readFileSync = unavailable;
export default fsShim;
