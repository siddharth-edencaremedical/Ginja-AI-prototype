import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appRoot, "../..");
const publicDir = path.resolve(workspaceRoot, "public");
const remoteAssetPrefixPattern =
  /^(?<origin>(?:https?:)?\/\/[^/]+)?(?<path>\/remote-assets\/(?<remoteId>[^/]+)\/releases\/(?<version>[^/]+)\/)$/;

function getRemoteAssetPrefix(remoteId: string): string {
  const remoteAssetBase = process.env.REMOTE_ASSET_BASE;

  if (!remoteAssetBase) {
    return "/";
  }

  const match = remoteAssetBase.match(remoteAssetPrefixPattern);

  if (!match?.groups) {
    throw new Error(
      `REMOTE_ASSET_BASE must be an immutable release base like /remote-assets/${remoteId}/releases/<version>/.`
    );
  }

  const matchedRemoteId = match.groups.remoteId;
  const matchedVersion = match.groups.version;

  if (!matchedRemoteId || !matchedVersion) {
    throw new Error(
      `REMOTE_ASSET_BASE must include a remote id and release version for "${remoteId}".`
    );
  }

  if (matchedRemoteId !== remoteId) {
    throw new Error(
      `REMOTE_ASSET_BASE remote id "${matchedRemoteId}" does not match "${remoteId}".`
    );
  }

  if (matchedVersion.trim().length === 0) {
    throw new Error("REMOTE_ASSET_BASE must include a non-empty release version.");
  }

  return remoteAssetBase;
}

function getRemoteBuildDefines(): Record<string, string> {
  return {
    __REMOTE_BUILD_BUILT_AT__: JSON.stringify(
      process.env.REMOTE_BUILD_BUILT_AT ?? new Date().toISOString()
    ),
    __REMOTE_BUILD_GIT_SHA__: JSON.stringify(getRemoteBuildGitSha()),
    __REMOTE_MIN_SHELL_VERSION__: process.env.REMOTE_MIN_SHELL_VERSION
      ? JSON.stringify(process.env.REMOTE_MIN_SHELL_VERSION)
      : "undefined"
  };
}

function getRemoteBuildGitSha(): string {
  if (process.env.REMOTE_BUILD_GIT_SHA) {
    return process.env.REMOTE_BUILD_GIT_SHA;
  }

  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: workspaceRoot,
      stdio: ["ignore", "pipe", "ignore"]
    })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

const alias = {
  "@ginja/api-client": path.resolve(
    workspaceRoot,
    "packages/api-client/src/index.ts"
  ),
  "@ginja/auth": path.resolve(workspaceRoot, "packages/auth/src/index.ts"),
  "@ginja/design-system": path.resolve(
    workspaceRoot,
    "packages/design-system/src/index.ts"
  ),
  "@ginja/design-system/components": path.resolve(
    workspaceRoot,
    "packages/design-system/src/components"
  ),
  "@ginja/design-system/hooks": path.resolve(
    workspaceRoot,
    "packages/design-system/src/hooks"
  ),
  "@ginja/design-system/assets": path.resolve(
    workspaceRoot,
    "packages/design-system/src/assets"
  ),
  "@ginja/design-system/lib": path.resolve(
    workspaceRoot,
    "packages/design-system/src/lib"
  ),
  "@ginja/design-system/styles.css": path.resolve(
    workspaceRoot,
    "packages/design-system/src/styles/globals.css"
  ),
  "@ginja/feature-flags": path.resolve(
    workspaceRoot,
    "packages/feature-flags/src/index.ts"
  ),
  "@ginja/logging": path.resolve(
    workspaceRoot,
    "packages/logging/src/index.ts"
  ),
  "@ginja/permissions": path.resolve(
    workspaceRoot,
    "packages/permissions/src/index.ts"
  ),
  "@ginja/shared-types": path.resolve(
    workspaceRoot,
    "packages/shared-types/src/index.ts"
  )
};

const shared = {
  "@ginja/auth": { singleton: true, requiredVersion: false, version: false },
  "@ginja/design-system": {
    singleton: true,
    requiredVersion: false,
    version: false
  },
  "@ginja/feature-flags": {
    singleton: true,
    requiredVersion: false,
    version: false
  },
  react: { singleton: true, requiredVersion: "^19.2.0" },
  "react-dom": { singleton: true, requiredVersion: "^19.2.0" },
  "react-router-dom": { singleton: true, requiredVersion: "^7.9.0" }
} as const;

export default defineConfig(({ command }) => ({
  plugins: [pluginReact(), pluginTailwindcss()],
  source: {
    define: getRemoteBuildDefines(),
    entry: {
      index: "./src/main.tsx"
    }
  },
  resolve: {
    alias
  },
  html: {
    template: "./index.html"
  },
  output: {
    assetPrefix: getRemoteAssetPrefix("underwriting"),
    cleanDistPath: true,
    distPath: {
      root: path.resolve(workspaceRoot, "dist/apps/underwriting")
    }
  },
  server: {
    publicDir: {
      name: publicDir
    },
    port: 4202
  },
  moduleFederation: {
    options: {
      name: "underwriting",
      filename: "remoteEntry.js",
      exposes: {
        "./manifest": "./src/remote/manifest.tsx"
      },
      shared
    }
  },
  tools: {
    htmlPlugin: command === "build" ? false : undefined
  }
}));
