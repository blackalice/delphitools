const WOFF2_READY_TIMEOUT_MS = 5_000;
const WOFF2_DECODER_URL = "/lib/wawoff2/decompress_binding.js";

let modulePromise;

function describeModuleState(emModule) {
  const ownKeys = Object.getOwnPropertyNames(emModule)
    .filter((key) =>
      /decompress|run|Runtime|asm|wasm|ready|calledRun|onRuntimeInitialized/i.test(key)
    )
    .sort();

  return JSON.stringify({
    calledRun: emModule.calledRun,
    hasDecompress: typeof emModule.decompress === "function",
    hasAsm: Boolean(emModule.asm),
    hasOnRuntimeInitialized: typeof emModule.onRuntimeInitialized === "function",
    ownKeys,
  });
}

async function loadModuleSource() {
  const response = await fetch(WOFF2_DECODER_URL, { cache: "force-cache" });

  if (!response.ok) {
    throw new Error(`Failed to load local WOFF2 decoder asset: ${response.status}`);
  }

  return response.text();
}

function initializeDecoder(source) {
  return new Promise((resolve, reject) => {
    const emModule = {};
    const timeoutId = setTimeout(() => {
      reject(
        new Error(
          `WOFF2 decoder failed to initialize in the browser. ${describeModuleState(emModule)}`
        )
      );
    }, WOFF2_READY_TIMEOUT_MS);

    emModule.onRuntimeInitialized = () => {
      clearTimeout(timeoutId);
      resolve(emModule);
    };

    try {
      const evaluatedModule = new Function(
        "Module",
        `${source}\nreturn Module;`
      )(emModule);

      if (typeof evaluatedModule.decompress === "function") {
        clearTimeout(timeoutId);
        resolve(evaluatedModule);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  }).then((emModule) => {
    if (typeof emModule.decompress !== "function") {
      throw new Error(
        `WOFF2 decoder is unavailable after initialization. ${describeModuleState(emModule)}`
      );
    }

    return emModule;
  });
}

async function getDecoderModule() {
  if (!modulePromise) {
    modulePromise = loadModuleSource().then((source) => initializeDecoder(source));
  }

  return modulePromise;
}

module.exports = async function decompressWoff2(buffer) {
  const emModule = await getDecoderModule();
  const result = emModule.decompress(buffer);

  if (result === false) {
    throw new Error("Recovering the WOFF2 font data failed.");
  }

  return result;
};
