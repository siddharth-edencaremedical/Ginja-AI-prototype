import { spawnSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

export const workspaceRoot = path.resolve(scriptDir, "../..");
export const defaultBucketName =
  process.env.REMOTE_ARTIFACTS_BUCKET ??
  "ginja-ai-prototype-remote-artifacts";
export const defaultRegistryEnvironment =
  process.env.REGISTRY_ENVIRONMENT ?? "development";
export const defaultTenantId =
  process.env.REMOTE_REGISTRY_TENANT_ID ?? "tenant-ginja-ai";

export const remotes = {
  "product-config": {
    project: "product-config",
    displayName: "Product Config",
    routeBasePath: "/product-config",
    scopeClassName: "product-config-remote",
    remoteName: "product_config",
    requiredPermissions: ["product-config:view"],
    featureFlags: null
  },
  underwriting: {
    project: "underwriting",
    displayName: "Underwriting",
    routeBasePath: "/underwriting",
    scopeClassName: "underwriting-remote",
    remoteName: "underwriting",
    requiredPermissions: ["underwriting:view"],
    featureFlags: null
  }
};

export function parseArgs(argv) {
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

export function getRemote(remoteId) {
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

export function getScope(flags) {
  if (flags.local && flags.remote) {
    fail("Choose only one of --local or --remote.");
  }

  return flags.remote ? "remote" : "local";
}

export function getStringFlag(flags, name, fallback) {
  const value = flags[name];

  if (value === undefined || value === true) {
    return fallback;
  }

  return String(value);
}

export function getNumberFlag(flags, name, fallback) {
  const value = getStringFlag(flags, name, undefined);

  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    fail(`--${name} must be an integer.`);
  }

  return parsed;
}

export function getBooleanFlag(flags, name) {
  return flags[name] === true;
}

export function run(command, args, options = {}) {
  if (options.dryRun) {
    console.log(`[dry-run] ${command} ${args.join(" ")}`);
    return "";
  }

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

export function wrangler(args, options = {}) {
  return run("pnpm", ["exec", "wrangler", ...args], options);
}

export function withStorageScope(args, scope) {
  return [...args, scope === "remote" ? "--remote" : "--local"];
}

export function d1Execute(sql, scope, options = {}) {
  const args = withStorageScope(
    [
      "d1",
      "execute",
      "REMOTE_REGISTRY",
      "--command",
      sql,
      "--yes",
      ...(options.json ? ["--json"] : [])
    ],
    scope
  );

  return wrangler(args, { capture: options.json, dryRun: options.dryRun });
}

export function d1Query(sql, scope) {
  const output = d1Execute(sql, scope, { json: true });
  const parsed = JSON.parse(output);
  const batches = Array.isArray(parsed) ? parsed : [parsed];
  const rows = [];

  for (const batch of batches) {
    if (Array.isArray(batch.results)) {
      rows.push(...batch.results);
    }

    if (Array.isArray(batch.result)) {
      for (const result of batch.result) {
        if (Array.isArray(result.results)) {
          rows.push(...result.results);
        }
      }
    }
  }

  return rows;
}

export function readContractVersion() {
  const source = readFileSync(
    path.join(workspaceRoot, "packages/shared-types/src/index.ts"),
    "utf8"
  );
  const match = source.match(/REMOTE_MODULE_CONTRACT_VERSION\s*=\s*(\d+)/);

  if (!match) {
    fail("Could not read REMOTE_MODULE_CONTRACT_VERSION from shared types.");
  }

  return Number(match[1]);
}

export function getGitSha() {
  const sha = run("git", ["rev-parse", "--short=12", "HEAD"], {
    capture: true
  }).trim();

  return sha || "unknown";
}

export function defaultReleaseVersion(gitSha = getGitSha()) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", ".");

  return `${date}-${gitSha}`;
}

export function getDistRoot(remote) {
  return path.join(workspaceRoot, "dist/apps", remote.project);
}

export function listFilesRecursive(root) {
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

export function toPosixRelative(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

export function remoteAssetBase(remoteId, version) {
  return `/remote-assets/${remoteId}/releases/${version}/`;
}

export function remoteR2Prefix(remoteId, version) {
  return `remotes/${remoteId}/releases/${version}`;
}

export function sqlString(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

export function sqlNumber(value) {
  if (!Number.isInteger(value)) {
    fail(`Expected an integer SQL value, received ${value}.`);
  }

  return String(value);
}

export function fail(message) {
  console.error(message);
  process.exit(1);
}
