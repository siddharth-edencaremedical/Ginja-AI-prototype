import {
  REMOTE_MODULE_CONTRACT_VERSION,
  type RemoteModuleManifest
} from "@ginja/shared-types";

import { FinanceModuleLayout } from "./module-layout";
import { FinanceDashboardScreen } from "../screens/finance-dashboard-screen";
import { ReconciliationScreen } from "../screens/reconciliation-screen";

export const financeManifest: RemoteModuleManifest = {
  id: "finance",
  displayName: "Finance",
  routeBasePath: "/finance",
  requiredPermissions: ["finance:view"],
  contractVersion: REMOTE_MODULE_CONTRACT_VERSION,
  builtAt: __REMOTE_BUILD_BUILT_AT__,
  gitSha: __REMOTE_BUILD_GIT_SHA__,
  minShellVersion: __REMOTE_MIN_SHELL_VERSION__,
  navigation: [
    {
      id: "finance-dashboard",
      label: "Finance",
      path: "/finance",
      requiredPermissions: ["finance:view"],
      order: 20
    }
  ],
  routes: [
    {
      element: <FinanceModuleLayout />,
      children: [
        {
          index: true,
          element: <FinanceDashboardScreen />
        },
        {
          path: "reconciliation",
          element: <ReconciliationScreen />
        }
      ]
    }
  ]
};

export default financeManifest;
