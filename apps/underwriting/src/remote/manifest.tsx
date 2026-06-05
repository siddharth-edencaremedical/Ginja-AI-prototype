import type { RemoteModuleManifest } from "@ginja/shared-types";

import { UnderwritingModuleLayout } from "./module-layout";
import { CaseQueueScreen } from "../screens/case-queue-screen";
import { CaseReviewScreen } from "../screens/case-review-screen";

export const underwritingManifest: RemoteModuleManifest = {
  id: "underwriting",
  displayName: "Underwriting",
  routeBasePath: "/underwriting",
  requiredPermissions: ["underwriting:view"],
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
