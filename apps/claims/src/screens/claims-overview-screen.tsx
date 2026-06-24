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

const severityMix = [
  { label: "High severity", progress: 24, status: "Escalated" },
  { label: "Standard review", progress: 58, status: "In review" },
  { label: "Fast-track", progress: 18, status: "Ready" }
];

const operatingLanes = [
  {
    label: "Coverage review",
    owner: "Claims",
    status: "On track",
    detail: "Policy match and benefit eligibility are current for priority files."
  },
  {
    label: "Reserve updates",
    owner: "Finance",
    status: "Review",
    detail: "Large-loss reserve changes are waiting on supervisor approval."
  },
  {
    label: "Settlement queue",
    owner: "Operations",
    status: "Queued",
    detail: "Three files are ready for final offer documentation."
  }
];

export function ClaimsOverviewScreen() {
  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Open claims" value="18" trend="5 high priority" />
        <MetricCard label="Avg cycle time" value="6.2d" trend="Down 0.8d" />
        <MetricCard label="Reserve exposure" value="$1.8M" trend="Across open files" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Severity Mix</CardTitle>
            <CardDescription>
              Current claim volume by operational handling lane.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {severityMix.map((item) => (
              <div key={item.label} className="grid gap-2 border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{item.label}</strong>
                  <StatusBadge status={item.status} />
                </div>
                <Progress value={item.progress} />
                <p className="m-0 text-xs text-muted-foreground">
                  {item.progress}% of active workload
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Checkpoint</CardTitle>
            <CardDescription>
              Operational item needing attention today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Clock3Icon />
              <AlertTitle>Reserve review due today</AlertTitle>
              <AlertDescription>
                Two high-severity files need reserve confirmation before
                settlement planning can continue.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {operatingLanes.map((lane) => (
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
  if (status === "On track" || status === "Ready") {
    return <Badge>{status}</Badge>;
  }

  if (status === "Review" || status === "In review") {
    return <Badge variant="secondary">{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}
