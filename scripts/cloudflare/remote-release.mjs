#!/usr/bin/env node
import path from "node:path";
import {
  d1Execute,
  defaultBucketName,
  defaultRegistryEnvironment,
  defaultReleaseVersion,
  defaultTenantId,
  fail,
  getBooleanFlag,
  getDistRoot,
  getGitSha,
  getNumberFlag,
  getRemote,
  getScope,
  getStringFlag,
  listFilesRecursive,
  parseArgs,
  readContractVersion,
  remoteAssetBase,
  remoteR2Prefix,
  run,
  sqlNumber,
  sqlString,
  toPosixRelative,
  withStorageScope,
  wrangler,
  workspaceRoot
} from "./remote-utils.mjs";

const { flags, positionals } = parseArgs(process.argv.slice(2));

if (flags.help || positionals.length < 1) {
  console.log(`Usage:
  pnpm cf:release:remote <remote-id> [--local|--remote] [--version <version>]

Options:
  --activate              Activate after upload/register and optional preview smoke.
  --smoke-url <url>       Worker origin for protected gateway smoke checks.
  --token <token>         Demo token used by smoke checks. Default: mock-token-admin
  --environment <name>    Registry environment. Default: development
  --tenant <id>           Tenant activation key. Default: tenant-ginja-ai
  --actor <name>          Audit value for activation. Default: local-operator
  --bucket <name>         R2 bucket. Default: ginja-ai-prototype-remote-artifacts
  --skip-checks           Skip remote typecheck and lint.
  --skip-build            Reuse existing dist/apps/<remote> output.
  --skip-upload           Register metadata without uploading artifacts.
  --contract-version <n>  Override contract metadata, mainly for local failure tests.
`);
  process.exit(flags.help ? 0 : 1);
}

const [remoteId] = positionals;
const remote = getRemote(remoteId);
const scope = getScope(flags);
const gitSha = getStringFlag(flags, "git-sha", getGitSha());
const version = getStringFlag(flags, "version", defaultReleaseVersion(gitSha));
const builtAt = getStringFlag(flags, "built-at", new Date().toISOString());
const bucketName = getStringFlag(flags, "bucket", defaultBucketName);
const environment = getStringFlag(
  flags,
  "environment",
  defaultRegistryEnvironment
);
const tenantId = getStringFlag(flags, "tenant", defaultTenantId);
const actor = getStringFlag(flags, "actor", process.env.USER ?? "local-operator");
const smokeUrl = getStringFlag(flags, "smoke-url", process.env.WORKER_URL);
const smokeToken = getStringFlag(flags, "token", "mock-token-admin");
const contractVersion = getNumberFlag(
  flags,
  "contract-version",
  readContractVersion()
);
const assetBase = remoteAssetBase(remoteId, version);
const r2Prefix = remoteR2Prefix(remoteId, version);
const distRoot = getDistRoot(remote);

if (!getBooleanFlag(flags, "skip-checks")) {
  run("pnpm", ["nx", "typecheck", remote.project]);
  run("pnpm", ["nx", "lint", remote.project]);
}

if (!getBooleanFlag(flags, "skip-build")) {
  run("pnpm", ["nx", "build", remote.project, "--skip-nx-cache"], {
    env: {
      REMOTE_ASSET_BASE: assetBase,
      REMOTE_BUILD_BUILT_AT: builtAt,
      REMOTE_BUILD_GIT_SHA: gitSha
    }
  });
}

const files = listFilesRecursive(distRoot).filter(
  (file) => !toPosixRelative(distRoot, file).endsWith(".html")
);

if (files.length === 0) {
  fail(`No files found under ${path.relative(workspaceRoot, distRoot)}.`);
}

if (!files.some((file) => toPosixRelative(distRoot, file) === "remoteEntry.js")) {
  fail(`Build output for ${remoteId} does not include remoteEntry.js.`);
}

if (!getBooleanFlag(flags, "skip-upload")) {
  for (const file of files) {
    const relative = toPosixRelative(distRoot, file);

    wrangler(
      withStorageScope(
        [
          "r2",
          "object",
          "put",
          `${bucketName}/${r2Prefix}/${relative}`,
          "--file",
          file,
          "--force"
        ],
        scope
      )
    );
  }
}

d1Execute(
  `
  INSERT INTO remote_modules (
    remote_id,
    display_name,
    route_base_path,
    scope_class_name,
    remote_name,
    required_permissions_json,
    feature_flags_json,
    enabled,
    display_order
  )
  VALUES (
    ${sqlString(remoteId)},
    ${sqlString(remote.displayName)},
    ${sqlString(remote.routeBasePath)},
    ${sqlString(remote.scopeClassName)},
    ${sqlString(remote.remoteName)},
    ${sqlString(JSON.stringify(remote.requiredPermissions))},
    ${sqlString(
      remote.featureFlags ? JSON.stringify(remote.featureFlags) : null
    )},
    1,
    ${sqlNumber(remoteId === "product-config" ? 10 : 20)}
  )
  ON CONFLICT(remote_id) DO UPDATE SET
    display_name = excluded.display_name,
    route_base_path = excluded.route_base_path,
    scope_class_name = excluded.scope_class_name,
    remote_name = excluded.remote_name,
    required_permissions_json = excluded.required_permissions_json,
    feature_flags_json = excluded.feature_flags_json,
    enabled = excluded.enabled,
    display_order = excluded.display_order,
    updated_at = CURRENT_TIMESTAMP;

  INSERT INTO remote_releases (
    remote_id,
    version,
    r2_prefix,
    contract_version,
    min_shell_version,
    git_sha,
    built_at,
    status
  )
  VALUES (
    ${sqlString(remoteId)},
    ${sqlString(version)},
    ${sqlString(r2Prefix)},
    ${sqlNumber(contractVersion)},
    ${sqlString(getStringFlag(flags, "min-shell-version", null))},
    ${sqlString(gitSha)},
    ${sqlString(builtAt)},
    'available'
  )
  ON CONFLICT(remote_id, version) DO UPDATE SET
    r2_prefix = excluded.r2_prefix,
    contract_version = excluded.contract_version,
    min_shell_version = excluded.min_shell_version,
    git_sha = excluded.git_sha,
    built_at = excluded.built_at,
    status = excluded.status,
    updated_at = CURRENT_TIMESTAMP;
  `,
  scope
);

console.log(
  `Registered ${remote.displayName} ${version} as available in ${scope} D1.`
);

if (smokeUrl) {
  run("node", [
    "scripts/cloudflare/smoke-remote.mjs",
    remoteId,
    version,
    "--url",
    smokeUrl,
    "--token",
    smokeToken,
    "--preview"
  ]);
}

if (getBooleanFlag(flags, "activate")) {
  run("node", [
    "scripts/cloudflare/remote-activate.mjs",
    remoteId,
    version,
    scope === "remote" ? "--remote" : "--local",
    "--environment",
    environment,
    "--tenant",
    tenantId,
    "--actor",
    actor
  ]);

  if (smokeUrl) {
    run("node", [
      "scripts/cloudflare/smoke-remote.mjs",
      remoteId,
      version,
      "--url",
      smokeUrl,
      "--token",
      smokeToken
    ]);
  }
}

console.log(`Release version: ${version}`);
console.log(`Remote asset base: ${assetBase}`);
console.log(`R2 prefix: ${r2Prefix}`);
