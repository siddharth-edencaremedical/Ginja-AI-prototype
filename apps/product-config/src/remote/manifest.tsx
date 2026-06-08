import {
  REMOTE_MODULE_CONTRACT_VERSION,
  type RemoteModuleManifest
} from "@ginja/shared-types";

import { ProductConfigModuleLayout } from "./module-layout";
import { ProductCatalogScreen } from "../screens/product-catalog-screen";
import { ProductConfigOverviewScreen } from "../screens/product-config-overview-screen";

export const productConfigManifest: RemoteModuleManifest = {
  id: "product-config",
  displayName: "Product Config",
  routeBasePath: "/product-config",
  requiredPermissions: ["product-config:view"],
  contractVersion: REMOTE_MODULE_CONTRACT_VERSION,
  builtAt: __REMOTE_BUILD_BUILT_AT__,
  gitSha: __REMOTE_BUILD_GIT_SHA__,
  minShellVersion: __REMOTE_MIN_SHELL_VERSION__,
  navigation: [
    {
      id: "product-config-overview",
      label: "Product Config",
      path: "/product-config",
      requiredPermissions: ["product-config:view"],
      order: 10
    }
  ],
  routes: [
    {
      element: <ProductConfigModuleLayout />,
      children: [
        {
          index: true,
          element: <ProductConfigOverviewScreen />
        },
        {
          path: "products",
          element: <ProductCatalogScreen />
        }
      ]
    }
  ]
};

export default productConfigManifest;
