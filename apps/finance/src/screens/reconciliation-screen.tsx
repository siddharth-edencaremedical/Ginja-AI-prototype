import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@ginja/design-system";
import { CheckCircle2Icon, FileTextIcon, SendIcon } from "lucide-react";

const reconciliationItems = [
  {
    item: "Carrier premium feed",
    owner: "Billing",
    status: "Matched",
    nextAction: "Archive matched batch"
  },
  {
    item: "Claims reserve ledger",
    owner: "Finance",
    status: "Review",
    nextAction: "Confirm reserve deltas"
  },
  {
    item: "Settlement disbursements",
    owner: "Treasury",
    status: "Open",
    nextAction: "Approve funding queue"
  },
  {
    item: "Commission accruals",
    owner: "Finance",
    status: "Matched",
    nextAction: "Send close evidence"
  }
];

export function ReconciliationScreen() {
  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 md:grid-cols-3">
        <ReconciliationMetric label="Matched" value="91%" detail="Across feeds" />
        <ReconciliationMetric label="Exceptions" value="9" detail="4 due today" />
        <ReconciliationMetric label="Close controls" value="5" detail="Pinned tasks" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Readiness</CardTitle>
            <CardDescription>
              Current close health for finance operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Alert>
              <CheckCircle2Icon />
              <AlertTitle>Premium feed matched</AlertTitle>
              <AlertDescription>
                Carrier premium records are matched. Reserve and settlement
                exceptions remain before cycle close.
              </AlertDescription>
            </Alert>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Close package</span>
                <span className="text-xs text-muted-foreground">74%</span>
              </div>
              <Progress value={74} />
            </div>
            <Button>
              <SendIcon data-icon="inline-start" />
              Send close packet
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exception Checklist</CardTitle>
            <CardDescription>
              Finance feeds and operational ownership.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feed</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliationItems.map((item) => (
                  <TableRow key={item.item}>
                    <TableCell>
                      <strong>{item.item}</strong>
                    </TableCell>
                    <TableCell>{item.owner}</TableCell>
                    <TableCell>
                      <ReconciliationBadge status={item.status} />
                    </TableCell>
                    <TableCell>{item.nextAction}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ReconciliationMetric({
  detail,
  label,
  value
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardAction>
          <Badge variant="outline">
            <FileTextIcon data-icon="inline-start" />
            Close
          </Badge>
        </CardAction>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
      <CardContent>
        <strong className="text-xl font-semibold tracking-tight">{value}</strong>
      </CardContent>
    </Card>
  );
}

function ReconciliationBadge({ status }: { status: string }) {
  if (status === "Matched") {
    return <Badge>{status}</Badge>;
  }

  if (status === "Review") {
    return <Badge variant="secondary">{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}
