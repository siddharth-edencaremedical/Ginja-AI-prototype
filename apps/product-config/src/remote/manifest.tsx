import type { RemoteModuleManifest } from "@ginja/shared-types";

import { ProductConfigModuleLayout } from "./module-layout";
import { ProductCatalogScreen } from "../screens/product-catalog-screen";
import { ProductConfigOverviewScreen } from "../screens/product-config-overview-screen";

export const productConfigManifest: RemoteModuleManifest = {
  id: "product-config",
  displayName: "Product Config",
  routeBasePath: "/product-config",
  requiredPermissions: ["product-config:view"],
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
