#!/usr/bin/env node
import {
  getBooleanFlag,
  parseArgs,
  run
} from "./remote-utils.mjs";

const { flags } = parseArgs(process.argv.slice(2));

if (flags.help) {
  console.log(`Usage:
  pnpm cf:deploy:shell [--skip-build]

Options:
  --skip-build  Reuse an existing dist/apps/shell build.
`);
  process.exit(0);
}

if (!getBooleanFlag(flags, "skip-build")) {
  run("pnpm", ["nx", "build", "shell"]);
}

run("pnpm", ["exec", "wrangler", "deploy", "--keep-vars"]);
