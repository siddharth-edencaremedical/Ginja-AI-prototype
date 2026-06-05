import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appRoot, "../..");
const publicDir = path.resolve(workspaceRoot, "public");

function getAssetPrefix(remoteEntryUrl: string | undefined): string {
  if (!remoteEntryUrl) {
    return "/";
  }

  const parsedUrl = new URL(remoteEntryUrl, "http://localhost");
  const basePath = parsedUrl.pathname.replace(/[^/]*$/, "");

  if (/^(?:https?:)?\/\//.test(remoteEntryUrl)) {
    const origin = remoteEntryUrl.startsWith("//")
      ? `//${parsedUrl.host}`
      : parsedUrl.origin;

    return `${origin}${basePath}`;
  }

  return basePath;
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

export default defineConfig({
  plugins: [pluginReact(), pluginTailwindcss()],
  source: {
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
    assetPrefix: getAssetPrefix(process.env.UNDERWRITING_REMOTE_URL),
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
  }
});
