#!/usr/bin/env node
import {
  d1Execute,
  d1Query,
  defaultRegistryEnvironment,
  defaultTenantId,
  fail,
  getRemote,
  getScope,
  getStringFlag,
  parseArgs,
  readContractVersion,
  sqlString
} from "./remote-utils.mjs";

const { flags, positionals } = parseArgs(process.argv.slice(2));

if (flags.help || positionals.length < 2) {
  console.log(`Usage:
  pnpm cf:activate:remote <remote-id> <version> [--local|--remote]
  pnpm cf:rollback:remote <remote-id> <previous-version> [--local|--remote]

Options:
  --environment <name>   Registry environment. Default: development
  --tenant <id>          Tenant activation key. Default: tenant-ginja-ai
  --actor <name>         Audit value for activated_by. Default: local-operator
`);
  process.exit(flags.help ? 0 : 1);
}

const [remoteId, version] = positionals;
const remote = getRemote(remoteId);
const scope = getScope(flags);
const environment = getStringFlag(
  flags,
  "environment",
  defaultRegistryEnvironment
);
const tenantId = getStringFlag(flags, "tenant", defaultTenantId);
const actor = getStringFlag(flags, "actor", process.env.USER ?? "local-operator");
const supportedContractVersion = readContractVersion();

const releaseRows = d1Query(
  `
  SELECT version, contract_version AS contractVersion, status
  FROM remote_releases
  WHERE remote_id = ${sqlString(remoteId)}
    AND version = ${sqlString(version)}
  LIMIT 1
  `,
  scope
);

const release = releaseRows[0];

if (!release) {
  fail(`Release ${remoteId}@${version} is not registered.`);
}

if (Number(release.contractVersion) !== supportedContractVersion) {
  fail(
    `Release ${remoteId}@${version} has unsupported contract version ${release.contractVersion}; current shell supports ${supportedContractVersion}.`
  );
}

if (!["available", "active"].includes(String(release.status))) {
  fail(
    `Release ${remoteId}@${version} has status "${release.status}" and cannot be activated.`
  );
}

d1Execute(
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
  scope
);

console.log(
  `Activated ${remote.displayName} ${version} for ${environment}/${tenantId} in ${scope} D1.`
);
