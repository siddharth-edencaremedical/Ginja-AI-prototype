import {
  REMOTE_MODULE_CONTRACT_VERSION,
  type RemoteModuleManifest
} from "@ginja/shared-types";

import { UnderwritingModuleLayout } from "./module-layout";
import { CaseQueueScreen } from "../screens/case-queue-screen";
import { CaseReviewScreen } from "../screens/case-review-screen";

export const underwritingManifest: RemoteModuleManifest = {
  id: "underwriting",
  displayName: "Underwriting",
  routeBasePath: "/underwriting",
  requiredPermissions: ["underwriting:view"],
  contractVersion: REMOTE_MODULE_CONTRACT_VERSION,
  builtAt: __REMOTE_BUILD_BUILT_AT__,
  gitSha: __REMOTE_BUILD_GIT_SHA__,
  minShellVersion: __REMOTE_MIN_SHELL_VERSION__,
  navigation: [
    {
      id: "underwriting-queue",
      label: "Underwriting",
      path: "/underwriting",
      requiredPermissions: ["underwriting:view"],
      order: 20
    }
  ],
  routes: [
    {
      element: <UnderwritingModuleLayout />,
      children: [
        {
          index: true,
          element: <CaseQueueScreen />
        },
        {
          path: "cases",
          element: <CaseReviewScreen />
        }
      ]
    }
  ]
};

export default underwritingManifest;
