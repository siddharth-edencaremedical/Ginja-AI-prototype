#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  defaultRegistryEnvironment,
  defaultTenantId,
  getBooleanFlag,
  getRemote,
  getScope,
  getStringFlag,
  parseArgs,
  readContractVersion,
  remoteAssetBase,
  sqlString,
  withStorageScope,
  workspaceRoot,
  d1Query
} from "./remote-utils.mjs";

const { flags, positionals } = parseArgs(process.argv.slice(2));

if (flags.help || positionals.length < 2) {
  console.log(`Usage:
  pnpm cf:validate:rollback:remote <remote-id> <rollback-version> [--local|--remote]

Options:
  --smoke-url <url>      Worker origin for protected gateway smoke checks.
  --token <token>        Demo token used by smoke checks. Default: mock-token-admin
  --environment <name>   Registry environment. Default: development
  --tenant <id>          Tenant activation key. Default: tenant-ginja-ai
  --actor <name>         Audit value for rollback activation. Default: local-operator
  --skip-restore         Leave the rollback version active after validation.
`);
  process.exit(flags.help ? 0 : 1);
}

const [remoteId, rollbackVersion] = positionals;
const remote = getRemote(remoteId);
const scope = getScope(flags);
const environment = getStringFlag(
  flags,
  "environment",
  defaultRegistryEnvironment
);
const tenantId = getStringFlag(flags, "tenant", defaultTenantId);
const actor = getStringFlag(flags, "actor", process.env.USER ?? "local-operator");
const smokeUrl = getStringFlag(flags, "smoke-url", process.env.WORKER_URL);
const smokeToken = getStringFlag(flags, "token", "mock-token-admin");
const skipRestore = getBooleanFlag(flags, "skip-restore");
const supportedContractVersion = readContractVersion();

if (!smokeUrl) {
  throw new Error("Provide --smoke-url <worker-url> or set WORKER_URL.");
}

const activeVersion = readCurrentActiveVersion(remoteId, scope, environment, tenantId);

if (!activeVersion) {
  throw new Error(
    `No active version is registered for ${remote.displayName} in ${scope} ${environment}/${tenantId}.`
  );
}

if (activeVersion === rollbackVersion) {
  throw new Error(
    `Rollback target ${remote.displayName} ${rollbackVersion} is already active. Choose a different version.`
  );
}

const targetRelease = readRemoteRelease(remoteId, rollbackVersion, scope);

if (!targetRelease) {
  throw new Error(`Release ${remoteId}@${rollbackVersion} is not registered.`);
}

if (Number(targetRelease.contractVersion) !== supportedContractVersion) {
  throw new Error(
    `Release ${remoteId}@${rollbackVersion} has unsupported contract version ${targetRelease.contractVersion}; current shell supports ${supportedContractVersion}.`
  );
}

if (!["available", "active"].includes(String(targetRelease.status))) {
  throw new Error(
    `Release ${remoteId}@${rollbackVersion} has status "${targetRelease.status}" and cannot be activated.`
  );
}

console.log(
  `Validating rollback for ${remote.displayName}: ${activeVersion} -> ${rollbackVersion}.`
);

await activateRemoteVersion(
  remoteId,
  rollbackVersion,
  scope,
  environment,
  tenantId,
  actor
);

let targetActivated = true;

try {
  await smokeRemoteRelease(remoteId, rollbackVersion, smokeUrl, smokeToken);

  if (!skipRestore) {
    await activateRemoteVersion(
      remoteId,
      activeVersion,
      scope,
      environment,
      tenantId,
      `${actor} (rollback validation restore)`
    );

    targetActivated = false;

    await smokeRemoteRelease(remoteId, activeVersion, smokeUrl, smokeToken);
    console.log(
      `Restored ${remote.displayName} ${activeVersion} after rollback validation.`
    );
  }
} catch (error) {
  if (!skipRestore && targetActivated) {
    try {
      await activateRemoteVersion(
        remoteId,
        activeVersion,
        scope,
        environment,
        tenantId,
        `${actor} (rollback validation restore)`
      );
      await smokeRemoteRelease(remoteId, activeVersion, smokeUrl, smokeToken);
      console.log(
        `Restored ${remote.displayName} ${activeVersion} after rollback validation failed.`
      );
    } catch (restoreError) {
      throw new Error(
        `Rollback validation for ${remote.displayName} failed, and restoring ${activeVersion} also failed.\nOriginal error: ${formatError(error)}\nRestore error: ${formatError(restoreError)}`
      );
    }
  }

  throw error;
}

console.log(
  `Rollback validation passed for ${remote.displayName} ${rollbackVersion}${skipRestore ? " and left active" : `, then restored ${activeVersion}`}.`
);

function readCurrentActiveVersion(remoteId, scope, environment, tenantId) {
  const rows = d1Query(
    `
    SELECT active_version AS activeVersion
    FROM remote_activations
    WHERE environment = ${sqlString(environment)}
      AND tenant_id IN (${sqlString(tenantId)}, '*')
      AND remote_id = ${sqlString(remoteId)}
    ORDER BY CASE WHEN tenant_id = ${sqlString(tenantId)} THEN 0 ELSE 1 END
    LIMIT 1
    `,
    scope
  );

  return String(rows[0]?.activeVersion ?? "");
}

function readRemoteRelease(remoteId, version, scope) {
  const rows = d1Query(
    `
    SELECT
      rr.version AS version,
      rr.contract_version AS contractVersion,
      rr.status AS status
    FROM remote_modules rm
    JOIN remote_releases rr ON rr.remote_id = rm.remote_id
    WHERE rm.remote_id = ${sqlString(remoteId)}
      AND rm.enabled = 1
      AND rr.version = ${sqlString(version)}
    LIMIT 1
    `,
    scope
  );

  return rows[0] ?? null;
}

function activateRemoteVersion(
  remoteId,
  version,
  scope,
  environment,
  tenantId,
  actor
) {
  const result = runWrangler(
    withStorageScope(
      [
        "d1",
        "execute",
        "REMOTE_REGISTRY",
        "--command",
        `
        INSERT INTO remote_activations (
          environment,
          tenant_id,
          remote_id,
          active_version,
          activated_by,
          activated_at
        )
        VALUES (
          ${sqlString(environment)},
          ${sqlString(tenantId)},
          ${sqlString(remoteId)},
          ${sqlString(version)},
          ${sqlString(actor)},
          CURRENT_TIMESTAMP
        )
        ON CONFLICT(environment, tenant_id, remote_id) DO UPDATE SET
          active_version = excluded.active_version,
          activated_by = excluded.activated_by,
          activated_at = excluded.activated_at;
        `,
        "--yes"
      ],
      scope
    )
  );

  if (result.status !== 0) {
    throw new Error(
      result.stderr?.trim() ||
        result.stdout?.trim() ||
        `wrangler d1 execute failed with exit code ${result.status}.`
    );
  }
}

async function smokeRemoteRelease(remoteId, version, workerUrl, token) {
  const origin = workerUrl.replace(/\/+$/, "");
  const assetBase = remoteAssetBase(remoteId, version);
  const headers = { Authorization: `Bearer ${token}` };

  const registry = await fetch(`${origin}/api/runtime/remotes`, {
    headers
  });

  await expectStatus(registry, 200, "runtime registry");

  const payload = await registry.json();
  const item = payload.remotes?.find(
    (candidate) => candidate.id === remoteId && candidate.version === version
  );

  if (!item) {
    throw new Error(`Runtime registry did not return ${remoteId}@${version}.`);
  }

  const setCookie = registry.headers.get("set-cookie");

  if (setCookie) {
    headers.Cookie = setCookie.split(";", 1)[0];
    delete headers.Authorization;
  }

  const remoteEntry = await fetch(`${origin}${assetBase}remoteEntry.js`, {
    headers
  });

  await expectStatus(remoteEntry, 200, "remoteEntry.js");
  expectHeader(remoteEntry, "cache-control", "no-store", "remoteEntry.js");

  console.log(`OK ${remoteId} remoteEntry.js @ ${version}`);
}

async function expectStatus(response, expected, label) {
  if (response.status === expected) {
    return;
  }

  const body = await response.text();
  throw new Error(
    `${label} returned ${response.status}; expected ${expected}.\n${body.slice(
      0,
      500
    )}`
  );
}

function expectHeader(response, name, expected, label) {
  const actual = response.headers.get(name);

  if (actual !== expected) {
    throw new Error(`${label} ${name} was "${actual}", expected "${expected}".`);
  }
}

function runWrangler(args) {
  const result = spawnSync("pnpm", ["exec", "wrangler", ...args], {
    cwd: workspaceRoot,
    env: { ...process.env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function formatError(error) {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}
