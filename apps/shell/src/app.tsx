import { useAuth, useSession } from "@ginja/auth";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Progress,
  Separator,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  Skeleton,
  TooltipProvider,
  cn,
  useSidebar
} from "@ginja/design-system";
import logoUrl from "@ginja/design-system/assets/logo";
import logoMarkUrl from "@ginja/design-system/assets/logo-mark";
import { hasEveryFeatureFlag, useFeatureFlags } from "@ginja/feature-flags";
import type { FeatureFlagState } from "@ginja/feature-flags";
import { createLogger } from "@ginja/logging";
import { hasEveryPermission } from "@ginja/permissions";
import type { PermissionSubject } from "@ginja/permissions";
import {
  REMOTE_MODULE_CONTRACT_VERSION,
  type RemoteModuleManifest,
  type RemoteRegistryItem
} from "@ginja/shared-types";
import { loadRemote, registerRemotes } from "@module-federation/runtime-tools";
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  ClipboardCheckIcon,
  CircleDollarSignIcon,
  HomeIcon,
  LogOutIcon,
  RouteIcon
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Component, useEffect, useMemo, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useRoutes
} from "react-router-dom";

import { LoginPage } from "./login-page";
import {
  fetchRuntimeRemoteRegistry,
  getLocalDevelopmentRemoteRegistry,
  isLocalDevelopmentHost,
  knownRemoteRegistrations
} from "./remote-registry";
import type { KnownRemoteRegistration } from "./remote-registry";

const logger = createLogger("shell");
const supportedRemoteContractVersions = new Set([REMOTE_MODULE_CONTRACT_VERSION]);

type RemoteRuntimeState =
  | {
      registration: KnownRemoteRegistration;
      status: "blocked";
    }
  | {
      registration: RemoteRegistration;
      status: "loading";
    }
  | {
      registration: RemoteRegistryItem;
      status: "ready";
      manifest: RemoteModuleManifest;
    }
  | {
      registration: RemoteRegistration;
      status: "failed";
      error: unknown;
    };

type RemoteRegistration = KnownRemoteRegistration | RemoteRegistryItem;

interface RemoteAccessPolicy {
  requiredPermissions: string[];
  featureFlags?: string[];
}

interface ShellNavigationItem {
  icon: LucideIcon;
  id: string;
  label: string;
  path: string;
  order?: number;
}

const remoteIcons: Record<string, LucideIcon> = {
  claims: ClipboardCheckIcon,
  finance: CircleDollarSignIcon
};

const registeredRemotes = new Set<string>();

async function loadRemoteManifest(
  remoteName: string,
  remoteEntryUrl: string
): Promise<RemoteModuleManifest> {
  if (!registeredRemotes.has(remoteName)) {
    registerRemotes([{ entry: remoteEntryUrl, name: remoteName }]);
    registeredRemotes.add(remoteName);
  }

  const remote = await loadRemote<{ default: RemoteModuleManifest }>(
    `${remoteName}/manifest`
  );

  if (!remote) {
    throw new Error(`Remote "${remoteName}" did not expose a manifest.`);
  }

  return remote.default;
}

export function App() {
  const { status } = useAuth();

  if (status === "unknown") {
    return <ShellSplash />;
  }

  if (status === "unauthenticated") {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <ShellLayout />
      </SidebarProvider>
    </TooltipProvider>
  );
}

function ShellLayout() {
  const session = useSession();
  const flags = useFeatureFlags();
  const { logout } = useAuth();
  const location = useLocation();
  const { isMobile, state: sidebarState } = useSidebar();
  const remoteStates = useRemoteManifests(session.user, flags);
  const isSidebarCollapsed = sidebarState === "collapsed" && !isMobile;

  const visibleNavigation = useMemo(() => {
    const remoteNavigation = remoteStates.flatMap((state) => {
      if (state.status !== "ready") {
        return [];
      }

      const { manifest } = state;
      const canAccessModule =
        hasEveryPermission(session.user, manifest.requiredPermissions) &&
        hasEveryFeatureFlag(flags, manifest.featureFlags);

      if (!canAccessModule) {
        return [];
      }

      return manifest.navigation
        .filter((item) => {
          return (
            hasEveryPermission(session.user, item.requiredPermissions ?? []) &&
            hasEveryFeatureFlag(flags, item.featureFlags)
          );
        })
        .map<ShellNavigationItem>((item) => ({
          icon: remoteIcons[manifest.id] ?? RouteIcon,
          id: `${manifest.id}:${item.id}`,
          label: item.label,
          path: item.path,
          order: item.order
        }));
    });

    remoteNavigation.sort((left, right) => {
      return (left.order ?? 0) - (right.order ?? 0);
    });

    return [
      { icon: HomeIcon, id: "home", label: "Home", path: "/" },
      ...remoteNavigation
    ];
  }, [flags, remoteStates, session.user]);
  const topbarTitle = useMemo(
    () => getTopbarTitle(visibleNavigation, location.pathname),
    [location.pathname, visibleNavigation]
  );

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-0">
          <div
            className={cn(
              "flex h-16 items-center",
              isSidebarCollapsed ? "justify-center px-0" : "px-4"
            )}
          >
            <img
              src={isSidebarCollapsed ? logoUrl : logoMarkUrl}
              alt="Ginja AI"
              className={cn(
                "shrink-0 object-contain",
                isSidebarCollapsed ? "size-10" : "h-8 w-auto max-w-[10.5rem]"
              )}
            />
          </div>
        </SidebarHeader>
        <SidebarSeparator
          className={cn(
            isSidebarCollapsed
              ? "data-horizontal:w-10"
              : "data-horizontal:w-[calc(100%-1.5rem)]"
          )}
        />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.path === "/"
                      ? location.pathname === "/"
                      : location.pathname.startsWith(item.path);

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <NavLink to={item.path} end={item.path === "/"}>
                          <Icon />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-2 md:flex-nowrap md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <SidebarTrigger className="shrink-0" />
            <Separator orientation="vertical" className="h-5 max-[760px]:hidden" />
            <h1 className="m-0 min-w-0 truncate text-lg font-semibold">
              {topbarTitle}
            </h1>
          </div>
          <div className="flex min-w-0 shrink-0 items-center justify-end max-[520px]:w-full max-[520px]:justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Open account menu"
                  variant="ghost"
                  className="h-10 min-w-0 justify-start gap-2 px-2 data-[state=open]:bg-muted"
                >
                  <Avatar size="sm">
                    <AvatarFallback>{getInitials(session.user.name)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-36 truncate text-left sm:block">
                    {session.user.name}
                  </span>
                  <ChevronDownIcon data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="flex items-start gap-3 px-3 py-3">
                  <Avatar size="lg">
                    <AvatarFallback>{getInitials(session.user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex flex-col gap-1">
                    <strong className="truncate text-sm font-semibold text-foreground">
                      {session.user.name}
                    </strong>
                    <span className="truncate text-xs">{session.user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      void logout();
                    }}
                  >
                    <LogOutIcon />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route index element={<Home navigation={visibleNavigation} />} />
            {remoteStates.map((state) => (
              <Route
                key={state.registration.id}
                path={`${state.registration.routeBasePath}/*`}
                element={<RemoteRoute state={state} />}
              />
            ))}
          </Routes>
        </main>
      </SidebarInset>
    </>
  );
}

function ShellSplash() {
  return (
    <div className="grid min-h-svh place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Opening workspace</CardTitle>
          <CardDescription>Preparing your work overview.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
          <Progress value={64} />
        </CardContent>
      </Card>
    </div>
  );
}

function useRemoteManifests(
  subject: PermissionSubject,
  flags: FeatureFlagState
): RemoteRuntimeState[] {
  const [remoteStates, setRemoteStates] = useState<RemoteRuntimeState[]>(() =>
    createInitialRemoteStates(subject, flags)
  );

  useEffect(() => {
    let cancelled = false;

    setRemoteStates(createInitialRemoteStates(subject, flags));

    loadRuntimeRemoteRegistry()
      .then((runtimeRegistry) => {
        if (cancelled) {
          return;
        }

        setRemoteStates(createRemoteStates(runtimeRegistry, subject, flags));

        runtimeRegistry.forEach((registration) => {
          const knownRegistration = knownRemoteRegistrations.find(
            (knownRemote) => knownRemote.id === registration.id
          );
          const registryCompatibilityError = getRemoteRegistryCompatibilityError(
            registration,
            knownRegistration
          );

          if (registryCompatibilityError) {
            logger.error("Remote registry item is incompatible", {
              error: registryCompatibilityError.message,
              remoteId: registration.id
            });

            return;
          }

          if (!canLoadRemote(registration, subject, flags)) {
            return;
          }

          loadRemoteManifest(registration.remoteName, registration.remoteEntryUrl)
            .then((manifest) => {
              const manifestCompatibilityError =
                getRemoteManifestCompatibilityError(registration, manifest);

              if (manifestCompatibilityError) {
                throw manifestCompatibilityError;
              }

              if (cancelled) {
                return;
              }

              setRemoteStates((currentStates) =>
                updateRemoteState(currentStates, {
                  registration,
                  status: "ready",
                  manifest
                })
              );
            })
            .catch((error: unknown) => {
              logger.error("Remote manifest unavailable", {
                error: getErrorMessage(error),
                remoteId: registration.id
              });

              if (cancelled) {
                return;
              }

              setRemoteStates((currentStates) =>
                updateRemoteState(currentStates, {
                  registration,
                  status: "failed",
                  error
                })
              );
            });
        });
      })
      .catch((error: unknown) => {
        logger.error("Runtime remote registry unavailable", {
          error: getErrorMessage(error)
        });

        if (cancelled) {
          return;
        }

        setRemoteStates(createFailedRemoteStates(subject, flags, error));
      });

    return () => {
      cancelled = true;
    };
  }, [subject, flags]);

  return remoteStates;
}

async function loadRuntimeRemoteRegistry(): Promise<RemoteRegistryItem[]> {
  try {
    const runtimeRegistry = await fetchRuntimeRemoteRegistry();

    if (runtimeRegistry.length > 0 || !isLocalDevelopmentHost()) {
      return runtimeRegistry;
    }

    logger.warn("Using local development remote registry fallback", {
      error: "Platform module registry returned no known modules."
    });

    return getLocalDevelopmentRemoteRegistry();
  } catch (error) {
    if (isLocalDevelopmentHost()) {
      logger.warn("Using local development remote registry fallback", {
        error: getErrorMessage(error)
      });

      return getLocalDevelopmentRemoteRegistry();
    }

    throw error;
  }
}

function canLoadRemote(
  registration: RemoteAccessPolicy,
  subject: PermissionSubject,
  flags: FeatureFlagState
): boolean {
  return (
    hasEveryPermission(subject, registration.requiredPermissions) &&
    hasEveryFeatureFlag(flags, registration.featureFlags)
  );
}

function getRemoteRegistryCompatibilityError(
  registration: RemoteRegistryItem,
  knownRegistration?: KnownRemoteRegistration
): Error | undefined {
  if (!knownRegistration) {
    return undefined;
  }

  if (registration.routeBasePath !== knownRegistration.routeBasePath) {
    return new Error(
      `Remote "${registration.id}" registry route base path "${registration.routeBasePath}" does not match expected route base path "${knownRegistration.routeBasePath}".`
    );
  }

  if (registration.remoteName !== knownRegistration.remoteName) {
    return new Error(
      `Remote "${registration.id}" registry remote name "${registration.remoteName}" does not match expected remote name "${knownRegistration.remoteName}".`
    );
  }

  if (
    !haveSameStringSet(
      registration.requiredPermissions,
      knownRegistration.requiredPermissions
    )
  ) {
    return new Error(
      `Remote "${registration.id}" registry permissions ${formatStringSet(registration.requiredPermissions)} do not match expected permissions ${formatStringSet(knownRegistration.requiredPermissions)}.`
    );
  }

  return undefined;
}

function getRemoteManifestCompatibilityError(
  registration: RemoteRegistryItem,
  manifest: RemoteModuleManifest
): Error | undefined {
  if (!isSupportedRemoteContractVersion(manifest.contractVersion)) {
    return new Error(
      `Remote "${registration.id}" manifest contract version ${manifest.contractVersion} is not supported.`
    );
  }

  if (manifest.id !== registration.id) {
    return new Error(
      `Remote manifest id "${manifest.id}" does not match registry id "${registration.id}".`
    );
  }

  if (manifest.routeBasePath !== registration.routeBasePath) {
    return new Error(
      `Remote "${registration.id}" manifest route base path "${manifest.routeBasePath}" does not match registry route base path "${registration.routeBasePath}".`
    );
  }

  if (
    !haveSameStringSet(
      manifest.requiredPermissions,
      registration.requiredPermissions
    )
  ) {
    return new Error(
      `Remote "${registration.id}" manifest permissions ${formatStringSet(manifest.requiredPermissions)} do not match registry permissions ${formatStringSet(registration.requiredPermissions)}.`
    );
  }

  return undefined;
}

function isSupportedRemoteContractVersion(contractVersion: number): boolean {
  return supportedRemoteContractVersions.has(contractVersion);
}

function haveSameStringSet(left: string[], right: string[]): boolean {
  const normalizedLeft = normalizeStringSet(left);
  const normalizedRight = normalizeStringSet(right);

  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  );
}

function normalizeStringSet(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function formatStringSet(values: string[]): string {
  return `[${normalizeStringSet(values).join(", ")}]`;
}

function createInitialRemoteStates(
  subject: PermissionSubject,
  flags: FeatureFlagState
): RemoteRuntimeState[] {
  return knownRemoteRegistrations.map((registration) => ({
    registration,
    status: canLoadRemote(registration, subject, flags) ? "loading" : "blocked"
  }));
}

function createRemoteStates(
  runtimeRegistry: RemoteRegistryItem[],
  subject: PermissionSubject,
  flags: FeatureFlagState
): RemoteRuntimeState[] {
  const runtimeRegistryById = new Map(
    runtimeRegistry.map((registration) => [registration.id, registration])
  );
  const knownRemoteStates = knownRemoteRegistrations.map<RemoteRuntimeState>(
    (knownRegistration) => {
      if (!canLoadRemote(knownRegistration, subject, flags)) {
        return {
          registration: knownRegistration,
          status: "blocked"
        };
      }

      const runtimeRegistration = runtimeRegistryById.get(knownRegistration.id);

      if (!runtimeRegistration || !canLoadRemote(runtimeRegistration, subject, flags)) {
        return {
          registration: knownRegistration,
          status: "blocked"
        };
      }

      const compatibilityError = getRemoteRegistryCompatibilityError(
        runtimeRegistration,
        knownRegistration
      );

      if (compatibilityError) {
        return {
          registration: knownRegistration,
          status: "failed",
          error: compatibilityError
        };
      }

      return {
        registration: runtimeRegistration,
        status: "loading"
      };
    }
  );
  return knownRemoteStates;
}

function createFailedRemoteStates(
  subject: PermissionSubject,
  flags: FeatureFlagState,
  error: unknown
): RemoteRuntimeState[] {
  return knownRemoteRegistrations.map((registration) => {
    if (!canLoadRemote(registration, subject, flags)) {
      return {
        registration,
        status: "blocked"
      };
    }

    return {
      registration,
      status: "failed",
      error
    };
  });
}

function updateRemoteState(
  states: RemoteRuntimeState[],
  nextState: RemoteRuntimeState
): RemoteRuntimeState[] {
  return states.map((state) =>
    state.registration.id === nextState.registration.id ? nextState : state
  );
}

function Home({ navigation }: { navigation: ShellNavigationItem[] }) {
  const session = useSession();
  const workAreas = navigation.filter((item) => item.id !== "home");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <section className="grid gap-2">
        <p className="m-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {session.tenant.name}
        </p>
        <h2 className="m-0 text-2xl font-semibold tracking-tight">
          Today&apos;s work
        </h2>
        <p className="m-0 max-w-3xl text-sm text-muted-foreground">
          A focused view of claims operations, finance exceptions, and settlement
          readiness.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Open claims" value="18" description="5 high priority" />
        <MetricCard label="Finance exceptions" value="9" description="4 due today" />
        <MetricCard label="Settlement ready" value="74%" description="Across active files" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]">
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="m-0 text-base font-semibold">Work Areas</h3>
            <p className="m-0 mt-1 text-sm text-muted-foreground">
              Open the operational workspaces for claims and finance work.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {workAreas.length > 0 ? (
              workAreas.map((item) => {
                const Icon = item.icon;

                return (
                  <Card key={item.id} size="sm">
                    <CardHeader>
                      <CardTitle>{item.label}</CardTitle>
                      <CardAction>
                        <Icon />
                      </CardAction>
                      <CardDescription>
                        {getWorkAreaDescription(item.path)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild variant="outline" size="sm">
                        <NavLink to={item.path}>
                          Open
                          <ArrowUpRightIcon data-icon="inline-end" />
                        </NavLink>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Preparing work areas</CardTitle>
                  <CardDescription>
                    Your workspace will appear here shortly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Priority Queue</CardTitle>
            <CardDescription>Items that need attention next.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <PriorityItem
              label="Reserve review"
              detail="Large-loss file awaiting finance approval"
              status="Today"
            />
            <PriorityItem
              label="Northstar Foods"
              detail="High-priority claims file"
              status="High"
            />
            <PriorityItem
              label="Settlement funding"
              detail="Three packets pending treasury approval"
              status="Review"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  description,
  label,
  value
}: {
  description: string;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardAction>
          <Badge variant="outline">Today</Badge>
        </CardAction>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <strong className="text-2xl font-semibold tracking-tight">{value}</strong>
      </CardContent>
    </Card>
  );
}

function PriorityItem({
  detail,
  label,
  status
}: {
  detail: string;
  label: string;
  status: string;
}) {
  return (
    <div className="grid gap-2 border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>{label}</strong>
        <Badge variant={status === "High" ? "destructive" : "secondary"}>
          {status}
        </Badge>
      </div>
      <p className="m-0 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function RemoteRoute({ state }: { state: RemoteRuntimeState }) {
  const session = useSession();
  const flags = useFeatureFlags();
  const { registration } = state;

  if (state.status === "blocked") {
    return (
      <RemoteStatePanel
        title={registration.displayName}
        heading="Workspace unavailable"
        message="This area is not available for the current user."
        showProgress={false}
      />
    );
  }

  if (state.status === "loading") {
    return (
      <RemoteStatePanel
        title={registration.displayName}
        heading="Opening workspace"
        message="Loading this area."
        showProgress
      />
    );
  }

  if (state.status === "failed") {
    return (
      <RemoteStatePanel
        title={registration.displayName}
        heading="Workspace unavailable"
        message="This area could not be opened. Please try again."
        showProgress={false}
      />
    );
  }

  const { manifest } = state;
  const canAccessModule =
    hasEveryPermission(session.user, manifest.requiredPermissions) &&
    hasEveryFeatureFlag(flags, manifest.featureFlags);

  if (!canAccessModule) {
    return (
      <RemoteStatePanel
        title={manifest.displayName}
        heading="Workspace unavailable"
        message="This area is not available for the current user."
        showProgress={false}
      />
    );
  }

  return (
    <RemoteErrorBoundary title={manifest.displayName}>
      <div className={registration.scopeClassName} data-remote-module={manifest.id}>
        <RemoteRoutes manifest={manifest} />
      </div>
    </RemoteErrorBoundary>
  );
}

function RemoteRoutes({ manifest }: { manifest: RemoteModuleManifest }) {
  return useRoutes(manifest.routes);
}

function RemoteStatePanel({
  heading,
  message,
  showProgress,
  title
}: {
  heading: string;
  message: string;
  showProgress: boolean;
  title: string;
}) {
  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="m-0 text-sm text-muted-foreground">{message}</p>
        {showProgress ? <Progress value={52} /> : null}
      </CardContent>
    </Card>
  );
}

interface RemoteErrorBoundaryProps {
  children: ReactNode;
  title: string;
}

interface RemoteErrorBoundaryState {
  error?: Error;
}

class RemoteErrorBoundary extends Component<
  RemoteErrorBoundaryProps,
  RemoteErrorBoundaryState
> {
  override state: RemoteErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): RemoteErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("Remote render failed", {
      componentStack: info.componentStack,
      error: getErrorMessage(error),
      remoteTitle: this.props.title
    });
  }

  override render() {
    if (this.state.error) {
      return (
        <RemoteStatePanel
          title={this.props.title}
          heading="Workspace unavailable"
          message="This area could not be opened. Please try again."
          showProgress={false}
        />
      );
    }

    return this.props.children;
  }
}

function getTopbarTitle(
  items: ShellNavigationItem[],
  pathname: string
): string {
  const activeItem = items.reduce<ShellNavigationItem | undefined>(
    (currentMatch, item) => {
      if (!isPathWithinBase(pathname, item.path)) {
        return currentMatch;
      }

      if (!currentMatch || item.path.length > currentMatch.path.length) {
        return item;
      }

      return currentMatch;
    },
    undefined
  );

  if (activeItem?.id === "home") {
    return "Work overview";
  }

  const matchingRemote = knownRemoteRegistrations.find((registration) =>
    isPathWithinBase(pathname, registration.routeBasePath)
  );

  if (matchingRemote) {
    return activeItem?.label ?? matchingRemote.displayName;
  }

  if (activeItem) {
    return activeItem.label;
  }

  return "Work overview";
}

function isPathWithinBase(pathname: string, basePath: string): boolean {
  if (basePath === "/") {
    return pathname === "/";
  }

  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function getWorkAreaDescription(path: string): string {
  if (path.startsWith("/claims")) {
    return "Review claims, reserves, and settlement readiness.";
  }

  if (path.startsWith("/finance")) {
    return "Monitor ledger close, funding, and reconciliation exceptions.";
  }

  return "Open this workspace area.";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
