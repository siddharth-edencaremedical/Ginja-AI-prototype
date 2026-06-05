import {
  Badge,
  Button,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger
} from "@ginja/design-system";
import { PlusIcon, SlidersHorizontalIcon } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const routeBasePath = "/product-config";

export function ProductConfigModuleLayout() {
  const location = useLocation();
  const isShellMounted = location.pathname.startsWith(routeBasePath);
  const rootPath = isShellMounted ? routeBasePath : "/";
  const productsPath = isShellMounted ? `${routeBasePath}/products` : "/products";
  const activeTab = location.pathname.endsWith("/products")
    ? "products"
    : "overview";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Product operations</Badge>
            <Badge variant="outline">4 active markets</Badge>
          </div>
          <h2 className="m-0 text-2xl font-semibold tracking-tight">
            Product Config
          </h2>
          <p className="m-0 mt-2 text-sm text-muted-foreground">
            Maintain plan catalogs, market filing status, and version readiness
            before products move into underwriting workflows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <SlidersHorizontalIcon data-icon="inline-start" />
            Review rules
          </Button>
          <Button>
            <PlusIcon data-icon="inline-start" />
            New product
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Tabs value={activeTab}>
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="overview" asChild>
              <NavLink to={rootPath} end>
                Overview
              </NavLink>
            </TabsTrigger>
            <TabsTrigger value="products" asChild>
              <NavLink to={productsPath}>Catalog</NavLink>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Separator />
        <Outlet />
      </section>
    </div>
  );
}
