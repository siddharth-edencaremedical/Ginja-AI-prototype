import {
  Badge,
  Button,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger
} from "@ginja/design-system";
import { ClipboardListIcon, UserPlusIcon } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const routeBasePath = "/underwriting";

export function UnderwritingModuleLayout() {
  const location = useLocation();
  const isShellMounted = location.pathname.startsWith(routeBasePath);
  const rootPath = isShellMounted ? routeBasePath : "/";
  const casesPath = isShellMounted ? `${routeBasePath}/cases` : "/cases";
  const activeTab = location.pathname.endsWith("/cases") ? "cases" : "queue";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Underwriting operations</Badge>
            <Badge variant="outline">12 open cases</Badge>
          </div>
          <h2 className="m-0 text-2xl font-semibold tracking-tight">
            Underwriting
          </h2>
          <p className="m-0 mt-2 text-sm text-muted-foreground">
            Manage submission intake, evidence completeness, risk tiering, and
            decision readiness across the active queue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <ClipboardListIcon data-icon="inline-start" />
            Triage rules
          </Button>
          <Button>
            <UserPlusIcon data-icon="inline-start" />
            Assign case
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Tabs value={activeTab}>
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="queue" asChild>
              <NavLink to={rootPath} end>
                Queue
              </NavLink>
            </TabsTrigger>
            <TabsTrigger value="cases" asChild>
              <NavLink to={casesPath}>Review</NavLink>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Separator />
        <Outlet />
      </section>
    </div>
  );
}
