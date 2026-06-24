import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appRoot, "../..");
const publicDir = path.resolve(workspaceRoot, "public");
const defaultPlatformServiceBaseUrl =
  "https://ginja-ai-internal-platform-service.onrender.com";

function getShellDefines(): Record<string, string> {
  return {
    __PLATFORM_SERVICE_BASE_URL__: JSON.stringify(
      process.env.PLATFORM_SERVICE_BASE_URL ?? defaultPlatformServiceBaseUrl
    ),
    __CLAIMS_MODULE_ID__: JSON.stringify(process.env.CLAIMS_MODULE_ID ?? ""),
    __FINANCE_MODULE_ID__: JSON.stringify(process.env.FINANCE_MODULE_ID ?? "")
  };
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
    define: getShellDefines(),
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
    cleanDistPath: true,
    distPath: {
      root: path.resolve(workspaceRoot, "dist/apps/shell")
    }
  },
  server: {
    publicDir: {
      name: publicDir
    },
    port: 4200
  },
  moduleFederation: {
    options: {
      name: "shell",
      // Remotes are intentionally NOT declared here. A static `remotes` entry
      // hands the MF runtime each remote's `remoteEntry.js` URL up front, so
      // the browser contacts the remote origin (to bootstrap its container)
      // even for users who lack access. Instead the shell registers and loads
      // each remote at runtime, gated by permission (see app.tsx), so an
      // unauthorized user makes zero requests to the remote's origin.
      remotes: {},
      shared
    }
  }
});
