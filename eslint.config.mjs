import nxPlugin from "@nx/eslint-plugin";
import globals from "globals";

const boundaryRules = [
  {
    sourceTag: "type:app-shell",
    onlyDependOnLibsWithTags: ["type:platform"]
  },
  {
    sourceTag: "type:vertical",
    onlyDependOnLibsWithTags: ["type:platform"]
  },
  {
    sourceTag: "type:platform",
    onlyDependOnLibsWithTags: ["type:platform"]
  },
  {
    sourceTag: "scope:claims",
    notDependOnLibsWithTags: ["scope:finance"]
  },
  {
    sourceTag: "scope:finance",
    notDependOnLibsWithTags: ["scope:claims"]
  },
  {
    sourceTag: "type:platform",
    notDependOnLibsWithTags: ["type:app-shell", "type:vertical"]
  }
];

export default [
  {
    ignores: [
      ".nx/**",
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "pnpm-lock.yaml"
    ]
  },
  ...nxPlugin.configs["flat/base"],
  ...nxPlugin.configs["flat/typescript"],
  ...nxPlugin.configs["flat/javascript"],
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          allow: [],
          depConstraints: boundaryRules,
          enforceBuildableLibDependency: true
        }
      ]
    }
  }
];
