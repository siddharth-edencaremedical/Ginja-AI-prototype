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

const cashFlow = [
  { label: "Premium receivables", progress: 86, status: "On track" },
  { label: "Claims funding", progress: 64, status: "Review" },
  { label: "Reserve adjustments", progress: 42, status: "Queued" }
];

const financeLanes = [
  {
    label: "Premium posting",
    owner: "Billing",
    status: "On track",
    detail: "Batch posting is current through the latest carrier feed."
  },
  {
    label: "Claims reserves",
    owner: "Finance",
    status: "Review",
    detail: "Large-loss reserve deltas need sign-off before close."
  },
  {
    label: "Settlement funding",
    owner: "Treasury",
    status: "Queued",
    detail: "Three settlement packets are waiting for disbursement approval."
  }
];

export function FinanceDashboardScreen() {
  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Premium posted" value="$3.2M" trend="Current cycle" />
        <MetricCard label="Reserve movement" value="$820K" trend="Pending review" />
        <MetricCard label="Open exceptions" value="9" trend="4 due today" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Status</CardTitle>
            <CardDescription>
              Operational progress across the finance close lanes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {cashFlow.map((item) => (
              <div key={item.label} className="grid gap-2 border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{item.label}</strong>
                  <StatusBadge status={item.status} />
                </div>
                <Progress value={item.progress} />
                <p className="m-0 text-xs text-muted-foreground">
                  {item.progress}% processed
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Close Checkpoint</CardTitle>
            <CardDescription>
              Finance item that needs attention before cycle close.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Clock3Icon />
              <AlertTitle>Reserve approval pending</AlertTitle>
              <AlertDescription>
                Finance needs approval on two claims reserve changes before
                settlement funding can clear.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {financeLanes.map((lane) => (
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
            Ledger
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
  if (status === "On track") {
    return <Badge>{status}</Badge>;
  }

  if (status === "Review") {
    return <Badge variant="secondary">{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}
