#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const defaultPlatformServiceBaseUrl =
  "https://ginja-ai-internal-platform-service.onrender.com";

const remotes = {
  claims: {
    project: "claims",
    moduleIdEnv: "CLAIMS_MODULE_ID",
    majorVersionEnv: "CLAIMS_MAJOR_VERSION",
    minorVersionEnv: "CLAIMS_MINOR_VERSION"
  },
  finance: {
    project: "finance",
    moduleIdEnv: "FINANCE_MODULE_ID",
    majorVersionEnv: "FINANCE_MAJOR_VERSION",
    minorVersionEnv: "FINANCE_MINOR_VERSION"
  }
};

const { flags, positionals } = parseArgs(process.argv.slice(2));

if (flags.help || positionals.length < 1) {
  console.log(`Usage:
  pnpm platform:release:remote <remote-id> [--module-id <id>]

Options:
  --base-url <url>        Platform service base URL.
  --token <token>         Platform service bearer token.
  --module-id <id>        Platform module id. Defaults to each module env var.
  --major-version <n>     Major version. Defaults to each module env var, then 1.
  --minor-version <n>     Minor version. Defaults to each module env var, then 0.
  --metadata <json>       Extra release metadata to merge into defaults.
  --git-sha <sha>         Release commit metadata. Defaults to current git SHA.
  --built-at <iso>        Build timestamp metadata. Defaults to now.
  --skip-build            Reuse existing dist/apps/<remote> output.
`);
  process.exit(flags.help ? 0 : 1);
}

const [remoteId] = positionals;
const remote = getRemote(remoteId);
const baseUrl = normalizeBaseUrl(
  getStringFlag(flags, "base-url", process.env.PLATFORM_SERVICE_BASE_URL) ??
    defaultPlatformServiceBaseUrl
);
const token = getStringFlag(flags, "token", process.env.PLATFORM_SERVICE_TOKEN);
const moduleId = getStringFlag(
  flags,
  "module-id",
  process.env[remote.moduleIdEnv]
);
const majorVersion = getIntegerFlag(
  flags,
  "major-version",
  process.env[remote.majorVersionEnv] ?? "1"
);
const minorVersion = getIntegerFlag(
  flags,
  "minor-version",
  process.env[remote.minorVersionEnv] ?? "0"
);
const gitSha = getStringFlag(flags, "git-sha", getGitSha());
const builtAt = getStringFlag(flags, "built-at", new Date().toISOString());
const distRoot = path.join(workspaceRoot, "dist/apps", remote.project);

if (!token) {
  fail("Provide --token <token> or set PLATFORM_SERVICE_TOKEN.");
}

if (!moduleId) {
  fail(`Provide --module-id <id> or set ${remote.moduleIdEnv}.`);
}

if (!getBooleanFlag(flags, "skip-build")) {
  run("pnpm", ["nx", "build", remote.project, "--skip-nx-cache"], {
    env: {
      REMOTE_BUILD_BUILT_AT: builtAt,
      REMOTE_BUILD_GIT_SHA: gitSha
    }
  });
}

const files = listFilesRecursive(distRoot).filter(
  (file) => !toPosixRelative(distRoot, file).endsWith(".html")
);
const entryFile = files.find(
  (file) => toPosixRelative(distRoot, file) === "remoteEntry.js"
);

if (!entryFile) {
  fail(`Build output for ${remoteId} does not include remoteEntry.js.`);
}

const staticFiles = files.filter((file) => file !== entryFile);
const metadata = {
  remoteId,
  project: remote.project,
  commit: gitSha,
  builtAt,
  ...readMetadata(flags.metadata)
};

await uploadRelease({
  baseUrl,
  token,
  moduleId,
  majorVersion,
  minorVersion,
  metadata,
  distRoot,
  entryFile,
  staticFiles
});

console.log(
  `Uploaded ${remoteId} release for module ${moduleId} (${majorVersion}.${minorVersion}).`
);

function parseArgs(argv) {
  const positionals = [];
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const [rawName, inlineValue] = arg.slice(2).split("=", 2);
    const name = rawName.trim();

    if (!name) {
      continue;
    }

    if (inlineValue !== undefined) {
      flags[name] = inlineValue;
      continue;
    }

    const next = argv[index + 1];

    if (next && !next.startsWith("--")) {
      flags[name] = next;
      index += 1;
    } else {
      flags[name] = true;
    }
  }

  return { flags, positionals };
}

function getRemote(remoteId) {
  const remote = remotes[remoteId];

  if (!remote) {
    fail(
      `Unknown remote "${remoteId}". Expected one of: ${Object.keys(remotes).join(
        ", "
      )}.`
    );
  }

  return remote;
}

function getStringFlag(flags, name, fallback) {
  const value = flags[name];

  if (value === undefined || value === true) {
    return fallback;
  }

  return String(value);
}

function getIntegerFlag(flags, name, fallback) {
  const value = getStringFlag(flags, name, fallback);
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    fail(`--${name} must be a non-negative integer.`);
  }

  return parsed;
}

function getBooleanFlag(flags, name) {
  return flags[name] === true;
}

function getGitSha() {
  return run("git", ["rev-parse", "--short=12", "HEAD"], {
    capture: true
  }).trim();
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit"
  });

  if (result.status !== 0) {
    if (options.capture && result.stderr) {
      process.stderr.write(result.stderr);
    }

    fail(`${command} ${args.join(" ")} failed with exit code ${result.status}.`);
  }

  return result.stdout ?? "";
}

function listFilesRecursive(root) {
  const files = [];

  function walk(current) {
    for (const entry of readdirSync(current)) {
      const absolute = path.join(current, entry);
      const stats = statSync(absolute);

      if (stats.isDirectory()) {
        walk(absolute);
      } else if (stats.isFile()) {
        files.push(absolute);
      }
    }
  }

  if (existsSync(root)) {
    walk(root);
  }

  return files;
}

function toPosixRelative(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function readMetadata(value) {
  if (value === undefined || value === true) {
    return {};
  }

  try {
    const metadata = JSON.parse(String(value));

    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      fail("--metadata must be a JSON object.");
    }

    return metadata;
  } catch (error) {
    fail(`Could not parse --metadata JSON: ${error.message}`);
  }
}

async function uploadRelease({
  baseUrl,
  token,
  moduleId,
  majorVersion,
  minorVersion,
  metadata,
  distRoot,
  entryFile,
  staticFiles
}) {
  const url = new URL(
    `/api/v1/platform/organization/modules/${encodeURIComponent(
      moduleId
    )}/releases`,
    baseUrl
  );

  const formData = new FormData();
  formData.append("major_version", String(majorVersion));
  formData.append("minor_version", String(minorVersion));
  formData.append("metadata", JSON.stringify(metadata));
  formData.append(
    "entry_file",
    new Blob([readFileSync(entryFile)]),
    "remoteEntry.js"
  );

  for (const file of staticFiles) {
    formData.append(
      "static_files",
      new Blob([readFileSync(file)]),
      toPosixRelative(distRoot, file)
    );
  }

  const response = await fetch(url, {
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`
    },
    method: "POST"
  });
  const responseText = await response.text();

  if (!response.ok) {
    fail(
      `Platform release upload returned ${response.status} ${response.statusText}: ${responseText}`
    );
  }

  if (responseText) {
    console.log(responseText);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
