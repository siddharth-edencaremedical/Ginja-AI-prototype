import {
  Badge,
  Button,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger
} from "@ginja/design-system";
import { CircleDollarSignIcon } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const routeBasePath = "/finance";

export function FinanceModuleLayout() {
  const location = useLocation();
  const isShellMounted = location.pathname.startsWith(routeBasePath);
  const rootPath = isShellMounted ? routeBasePath : "/";
  const reconciliationPath = isShellMounted
    ? `${routeBasePath}/reconciliation`
    : "/reconciliation";
  const activeTab = location.pathname.endsWith("/reconciliation")
    ? "reconciliation"
    : "dashboard";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Finance operations</Badge>
            <Badge variant="outline">$4.8M in-cycle</Badge>
          </div>
          <h2 className="m-0 text-2xl font-semibold tracking-tight">Finance</h2>
          <p className="m-0 mt-2 text-sm text-muted-foreground">
            Monitor premium flow, claims reserves, settlement funding, and
            reconciliation exceptions across the operating ledger.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <CircleDollarSignIcon data-icon="inline-start" />
            Review ledger
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Tabs value={activeTab}>
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="dashboard" asChild>
              <NavLink to={rootPath} end>
                Dashboard
              </NavLink>
            </TabsTrigger>
            <TabsTrigger value="reconciliation" asChild>
              <NavLink to={reconciliationPath}>Reconciliation</NavLink>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Separator />
        <Outlet />
      </section>
    </div>
  );
}
