import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress
} from "@ginja/design-system";
import { CheckCircle2Icon, Clock3Icon } from "lucide-react";

const marketReadiness = [
  { label: "Texas HMO", progress: 94, status: "Ready" },
  { label: "Florida PPO", progress: 72, status: "Review" },
  { label: "California EPO", progress: 58, status: "Draft" }
];

const configurationLanes = [
  {
    label: "Benefit design",
    owner: "Product",
    status: "Complete",
    detail: "Core plan, riders, and coverage tiers are approved."
  },
  {
    label: "Pricing tables",
    owner: "Actuarial",
    status: "Review",
    detail: "Two draft versions are waiting on rate filing validation."
  },
  {
    label: "Underwriting handoff",
    owner: "Operations",
    status: "Queued",
    detail: "Rules package is staged for intake mapping."
  }
];

export function ProductConfigOverviewScreen() {
  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Active products" value="4" trend="2 market-ready" />
        <MetricCard label="Draft versions" value="2" trend="1 needs pricing" />
        <MetricCard label="Markets" value="3" trend="TX, FL, CA" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Market Readiness</CardTitle>
            <CardDescription>
              Product filing progress by market and plan family.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {marketReadiness.map((item) => (
              <div key={item.label} className="grid gap-2 border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{item.label}</strong>
                  <StatusBadge status={item.status} />
                </div>
                <Progress value={item.progress} />
                <p className="m-0 text-xs text-muted-foreground">
                  {item.progress}% complete
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Release Gate</CardTitle>
            <CardDescription>
              Next operational checkpoint before activation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Clock3Icon />
              <AlertTitle>Pricing review due today</AlertTitle>
              <AlertDescription>
                Validate Florida PPO tables before the underwriting package is
                promoted.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {configurationLanes.map((lane) => (
          <Card key={lane.label}>
            <CardHeader>
              <CardTitle>{lane.label}</CardTitle>
              <CardAction>
                <StatusBadge status={lane.status} />
              </CardAction>
              <CardDescription>{lane.owner}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="m-0 text-sm text-muted-foreground">{lane.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  trend,
  value
}: {
  label: string;
  trend: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardAction>
          <Badge variant="outline">
            <CheckCircle2Icon data-icon="inline-start" />
            Live
          </Badge>
        </CardAction>
        <CardDescription>{trend}</CardDescription>
      </CardHeader>
      <CardContent>
        <strong className="text-2xl font-semibold tracking-tight">{value}</strong>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "Complete" || status === "Ready") {
    return <Badge>{status}</Badge>;
  }

  if (status === "Review") {
    return <Badge variant="secondary">{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}
