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

const evidenceItems = [
  { item: "Loss runs", owner: "Broker", status: "Complete" },
  { item: "Census upload", owner: "Applicant", status: "Complete" },
  { item: "Prior carrier notes", owner: "Underwriter", status: "Review" },
  { item: "Pricing exception", owner: "Actuarial", status: "Open" }
];

export function CaseReviewScreen() {
  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 md:grid-cols-3">
        <DecisionMetric label="Evidence status" value="Complete" detail="3 of 4 cleared" />
        <DecisionMetric label="Risk tier" value="Standard" detail="No referral block" />
        <DecisionMetric label="Next action" value="Pricing" detail="Rate exception review" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Decision Readiness</CardTitle>
            <CardDescription>
              Current package health for the active case review.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Alert>
              <CheckCircle2Icon />
              <AlertTitle>Standard risk path</AlertTitle>
              <AlertDescription>
                Evidence is materially complete. Pricing review is the only
                remaining checkpoint before bind recommendation.
              </AlertDescription>
            </Alert>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Decision package</span>
                <span className="text-xs text-muted-foreground">86%</span>
              </div>
              <Progress value={86} />
            </div>
            <Button>
              <SendIcon data-icon="inline-start" />
              Send to pricing
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evidence Checklist</CardTitle>
            <CardDescription>
              Required artifacts and operational ownership.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artifact</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evidenceItems.map((item) => (
                  <TableRow key={item.item}>
                    <TableCell>
                      <strong>{item.item}</strong>
                    </TableCell>
                    <TableCell>{item.owner}</TableCell>
                    <TableCell>
                      <EvidenceBadge status={item.status} />
                    </TableCell>
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

function DecisionMetric({
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
            Review
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

function EvidenceBadge({ status }: { status: string }) {
  if (status === "Complete") {
    return <Badge>{status}</Badge>;
  }

  if (status === "Review") {
    return <Badge variant="secondary">{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}
