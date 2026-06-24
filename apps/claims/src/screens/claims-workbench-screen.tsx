import {
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
import { ArrowUpRightIcon, FileCheck2Icon } from "lucide-react";

const claims = [
  {
    claim: "CLM-10482",
    claimant: "Northstar Foods",
    lane: "High severity",
    owner: "Maya Claims",
    readiness: 82,
    reserve: "$420K",
    status: "Review"
  },
  {
    claim: "CLM-10467",
    claimant: "Harbor Clinics",
    lane: "Fast-track",
    owner: "Jules Carter",
    readiness: 96,
    reserve: "$38K",
    status: "Ready"
  },
  {
    claim: "CLM-10441",
    claimant: "Atlas Logistics",
    lane: "Standard",
    owner: "Coverage desk",
    readiness: 68,
    reserve: "$165K",
    status: "Open"
  },
  {
    claim: "CLM-10398",
    claimant: "Summit Home Care",
    lane: "Settlement",
    owner: "Maya Claims",
    readiness: 89,
    reserve: "$74K",
    status: "Offer"
  }
];

export function ClaimsWorkbenchScreen() {
  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Assigned files" value="18" detail="7 due this week" />
        <SummaryCard label="Settlement ready" value="3" detail="Offer packet staged" />
        <SummaryCard label="Coverage holds" value="2" detail="Need policy review" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Claims Workbench</CardTitle>
          <CardDescription>
            Active files with handling lane, reserve exposure, and review
            readiness.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim</TableHead>
                <TableHead>Claimant</TableHead>
                <TableHead>Lane</TableHead>
                <TableHead>Reserve</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim.claim}>
                  <TableCell>
                    <strong>{claim.claim}</strong>
                  </TableCell>
                  <TableCell>{claim.claimant}</TableCell>
                  <TableCell>{claim.lane}</TableCell>
                  <TableCell>{claim.reserve}</TableCell>
                  <TableCell>{claim.owner}</TableCell>
                  <TableCell>
                    <ClaimStatusBadge status={claim.status} />
                  </TableCell>
                  <TableCell>
                    <div className="grid min-w-28 gap-1">
                      <Progress value={claim.readiness} />
                      <span className="text-xs text-muted-foreground">
                        {claim.readiness}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      Open
                      <ArrowUpRightIcon data-icon="inline-end" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
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
            <FileCheck2Icon data-icon="inline-start" />
            Claims
          </Badge>
        </CardAction>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
      <CardContent>
        <strong className="text-2xl font-semibold tracking-tight">{value}</strong>
      </CardContent>
    </Card>
  );
}

function ClaimStatusBadge({ status }: { status: string }) {
  if (status === "Ready" || status === "Offer") {
    return <Badge>{status}</Badge>;
  }

  if (status === "Review") {
    return <Badge variant="secondary">{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}
