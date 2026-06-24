import {
  Badge,
  Button,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger
} from "@ginja/design-system";
import { ClipboardCheckIcon, ShieldCheckIcon } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const routeBasePath = "/claims";

export function ClaimsModuleLayout() {
  const location = useLocation();
  const isShellMounted = location.pathname.startsWith(routeBasePath);
  const rootPath = isShellMounted ? routeBasePath : "/";
  const workbenchPath = isShellMounted
    ? `${routeBasePath}/workbench`
    : "/workbench";
  const activeTab = location.pathname.endsWith("/workbench")
    ? "workbench"
    : "overview";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Claims operations</Badge>
            <Badge>
              <ShieldCheckIcon data-icon="inline-start" />
              Rollback test release 2
            </Badge>
            <Badge variant="outline">18 active files</Badge>
          </div>
          <h2 className="m-0 text-2xl font-semibold tracking-tight">Claims</h2>
          <p className="m-0 mt-2 text-sm text-muted-foreground">
            Track intake, adjudication, reserves, and settlement readiness with
            the updated priority review experience.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button>
            <ClipboardCheckIcon data-icon="inline-start" />
            Assign priority review
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
            <TabsTrigger value="workbench" asChild>
              <NavLink to={workbenchPath}>Workbench</NavLink>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Separator />
        <Outlet />
      </section>
    </div>
  );
}
