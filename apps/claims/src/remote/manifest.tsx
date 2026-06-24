import {
  REMOTE_MODULE_CONTRACT_VERSION,
  type RemoteModuleManifest
} from "@ginja/shared-types";

import { ClaimsModuleLayout } from "./module-layout";
import { ClaimsOverviewScreen } from "../screens/claims-overview-screen";
import { ClaimsWorkbenchScreen } from "../screens/claims-workbench-screen";

export const claimsManifest: RemoteModuleManifest = {
  id: "claims",
  displayName: "Claims",
  routeBasePath: "/claims",
  requiredPermissions: ["claims:view"],
  contractVersion: REMOTE_MODULE_CONTRACT_VERSION,
  builtAt: __REMOTE_BUILD_BUILT_AT__,
  gitSha: __REMOTE_BUILD_GIT_SHA__,
  minShellVersion: __REMOTE_MIN_SHELL_VERSION__,
  navigation: [
    {
      id: "claims-overview",
      label: "Claims",
      path: "/claims",
      requiredPermissions: ["claims:view"],
      order: 10
    }
  ],
  routes: [
    {
      element: <ClaimsModuleLayout />,
      children: [
        {
          index: true,
          element: <ClaimsOverviewScreen />
        },
        {
          path: "workbench",
          element: <ClaimsWorkbenchScreen />
        }
      ]
    }
  ]
};

export default claimsManifest;
