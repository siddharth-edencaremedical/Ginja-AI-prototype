#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const flags = new Set(process.argv.slice(2));

if (flags.has("--help")) {
  console.log(`Usage:
  pnpm cf:deploy:shell [--skip-build]

Options:
  --skip-build  Reuse an existing dist/apps/shell build.
`);
  process.exit(0);
}

if (!flags.has("--skip-build")) {
  run("pnpm", ["nx", "build", "shell"]);
}

run("pnpm", ["exec", "wrangler", "deploy", "--keep-vars"]);
syncWorkerSecret("PLATFORM_SERVICE_TOKEN", process.env.PLATFORM_SERVICE_TOKEN, {
  required: true
});
syncWorkerSecret("PLATFORM_SERVICE_BASE_URL", process.env.PLATFORM_SERVICE_BASE_URL);

function syncWorkerSecret(name, value, options = {}) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    if (options.required) {
      console.warn(
        `${name} is not set; leaving the existing Cloudflare secret unchanged.`
      );
    }

    return;
  }

  run("pnpm", ["exec", "wrangler", "secret", "put", name], {
    input: `${trimmedValue}\n`
  });
}

function run(command, args, options = {}) {
  const hasInput = options.input !== undefined;
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    env: process.env,
    input: options.input,
    stdio: hasInput ? ["pipe", "inherit", "inherit"] : "inherit"
  });

  if (result.status !== 0) {
    console.error(`${command} ${args.join(" ")} failed with exit code ${result.status}.`);
    process.exit(1);
  }
}
