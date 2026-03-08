const userAgent = process.env.npm_config_user_agent ?? "";
const execPath = process.env.npm_execpath ?? "";

const hasBunRuntime = typeof process.versions.bun === "string";
const invokedByNpm =
  userAgent.startsWith("npm/") ||
  execPath.toLowerCase().includes("npm-cli") ||
  execPath.toLowerCase().includes("\\npm\\");

if (!hasBunRuntime || invokedByNpm) {
  console.error("This project uses Bun. Run `bun install` and `bun run <script>`.");
  process.exit(1);
}
