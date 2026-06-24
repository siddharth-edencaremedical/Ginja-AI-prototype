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

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    env: process.env,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    console.error(`${command} ${args.join(" ")} failed with exit code ${result.status}.`);
    process.exit(1);
  }
}
