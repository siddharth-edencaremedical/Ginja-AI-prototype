#!/usr/bin/env node
import {
  fail,
  getDistRoot,
  getRemote,
  getStringFlag,
  listFilesRecursive,
  parseArgs,
  remoteAssetBase,
  toPosixRelative
} from "./remote-utils.mjs";

const { flags, positionals } = parseArgs(process.argv.slice(2));

if (flags.help || positionals.length < 2) {
  console.log(`Usage:
  pnpm cf:smoke:remote <remote-id> <version> --url <worker-url> [--preview]

Options:
  --url <url>       Worker origin, for example http://localhost:8787 or https://app.example.com
  --token <token>   Demo bearer token. Default: mock-token-admin
  --preview         Smoke an uploaded release that is not active yet.
`);
  process.exit(flags.help ? 0 : 1);
}

const [remoteId, version] = positionals;
const remote = getRemote(remoteId);
const workerUrl = getStringFlag(flags, "url", process.env.WORKER_URL);
const token = getStringFlag(flags, "token", "mock-token-admin");
const preview = flags.preview === true;

if (!workerUrl) {
  fail("Provide --url <worker-url> or set WORKER_URL.");
}

const origin = workerUrl.replace(/\/+$/, "");
const assetBase = remoteAssetBase(remoteId, version);
const authHeaders = {
  Authorization: `Bearer ${token}`
};

if (preview) {
  authHeaders["X-Ginja-Release-Preview"] = "1";
}

if (!preview) {
  const registry = await fetch(`${origin}/api/runtime/remotes`, {
    headers: authHeaders
  });

  await expectStatus(registry, 200, "runtime registry");

  const payload = await registry.json();
  const item = payload.remotes?.find(
    (candidate) => candidate.id === remoteId && candidate.version === version
  );

  if (!item) {
    fail(`Runtime registry did not return ${remoteId}@${version}.`);
  }

  const setCookie = registry.headers.get("set-cookie");

  if (setCookie) {
    authHeaders.Cookie = setCookie.split(";", 1)[0];
    delete authHeaders.Authorization;
  }
}

const remoteEntry = await fetch(`${origin}${assetBase}remoteEntry.js`, {
  headers: authHeaders
});

await expectStatus(remoteEntry, 200, "remoteEntry.js");
expectHeader(remoteEntry, "cache-control", "no-store", "remoteEntry.js");
console.log(`OK ${remote.displayName} remoteEntry.js`);

const chunkPath = findSmokeChunk(remote);

if (chunkPath) {
  const chunk = await fetch(`${origin}${assetBase}${chunkPath}`, {
    headers: authHeaders
  });

  await expectStatus(chunk, 200, chunkPath);
  expectHeader(
    chunk,
    "cache-control",
    "private, max-age=31536000, immutable",
    chunkPath
  );
  console.log(`OK ${remote.displayName} asset ${chunkPath}`);
} else {
  console.log("No built async/static asset found to smoke-check.");
}

console.log(
  `Smoke check passed for ${remote.displayName} ${version}${
    preview ? " using release preview access" : ""
  }.`
);

function findSmokeChunk(remoteConfig) {
  const distRoot = getDistRoot(remoteConfig);
  const files = listFilesRecursive(distRoot)
    .map((file) => toPosixRelative(distRoot, file))
    .filter(
      (file) =>
        file !== "remoteEntry.js" &&
        !file.endsWith(".html") &&
        !file.endsWith(".map")
    )
    .sort();

  return files.find((file) => file.endsWith(".js")) ?? files[0];
}

async function expectStatus(response, expected, label) {
  if (response.status !== expected) {
    const body = await response.text();
    fail(
      `${label} returned ${response.status}; expected ${expected}.\n${body.slice(
        0,
        500
      )}`
    );
  }
}

function expectHeader(response, name, expected, label) {
  const actual = response.headers.get(name);

  if (actual !== expected) {
    fail(`${label} ${name} was "${actual}", expected "${expected}".`);
  }
}
