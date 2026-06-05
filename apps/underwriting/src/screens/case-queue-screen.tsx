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
import { ArrowUpRightIcon, TimerIcon } from "lucide-react";

const queueItems = [
  {
    applicant: "Northstar Foods",
    age: "2h",
    assignee: "Dana Underwriter",
    completeness: 92,
    premium: "$184K",
    priority: "High"
  },
  {
    applicant: "Harbor Clinics",
    age: "6h",
    assignee: "Unassigned",
    completeness: 76,
    premium: "$96K",
    priority: "Medium"
  },
  {
    applicant: "Summit Home Care",
    age: "1d",
    assignee: "Risk desk",
    completeness: 64,
    premium: "$128K",
    priority: "Low"
  },
  {
    applicant: "Atlas Logistics",
    age: "1d",
    assignee: "Dana Underwriter",
    completeness: 81,
    premium: "$242K",
    priority: "High"
  }
];

export function CaseQueueScreen() {
  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 md:grid-cols-4">
        <QueueMetric label="New submissions" value="12" detail="Last 24 hours" />
        <QueueMetric label="High priority" value="2" detail="Needs triage" />
        <QueueMetric label="Median age" value="6h" detail="Queue velocity" />
        <QueueMetric label="Evidence ready" value="74%" detail="Average file" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Case Queue</CardTitle>
          <CardDescription>
            Intake worklist sorted by priority, file age, and evidence coverage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queueItems.map((item) => (
                <TableRow key={item.applicant}>
                  <TableCell>
                    <strong>{item.applicant}</strong>
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={item.priority} />
                  </TableCell>
                  <TableCell>{item.age}</TableCell>
                  <TableCell>{item.premium}</TableCell>
                  <TableCell>{item.assignee}</TableCell>
                  <TableCell>
                    <div className="grid min-w-28 gap-1">
                      <Progress value={item.completeness} />
                      <span className="text-xs text-muted-foreground">
                        {item.completeness}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      Review
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

function QueueMetric({
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
            <TimerIcon data-icon="inline-start" />
            Queue
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

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "High") {
    return <Badge variant="destructive">{priority}</Badge>;
  }

  if (priority === "Medium") {
    return <Badge variant="secondary">{priority}</Badge>;
  }

  return <Badge variant="outline">{priority}</Badge>;
}
