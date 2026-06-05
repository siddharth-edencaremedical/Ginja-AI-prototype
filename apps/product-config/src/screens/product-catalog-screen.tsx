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

const products = [
  {
    name: "Care Advantage HMO",
    state: "Active",
    market: "Texas",
    owner: "Priya Product",
    readiness: 94,
    version: "2026.4"
  },
  {
    name: "Eden Select PPO",
    state: "Draft",
    market: "Florida",
    owner: "Rate desk",
    readiness: 72,
    version: "2026.2"
  },
  {
    name: "Ginja AI Value Plan",
    state: "Review",
    market: "California",
    owner: "Compliance",
    readiness: 58,
    version: "2026.1"
  },
  {
    name: "Eden Complete EPO",
    state: "Active",
    market: "Texas",
    owner: "Network",
    readiness: 88,
    version: "2026.3"
  }
];

export function ProductCatalogScreen() {
  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Products" value="4" detail="2 active lines" />
        <SummaryCard label="Filed markets" value="3" detail="1 in review" />
        <SummaryCard label="Average readiness" value="78%" detail="Across catalog" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
          <CardDescription>
            Operational product list with market ownership and release readiness.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.name}>
                  <TableCell>
                    <strong>{product.name}</strong>
                  </TableCell>
                  <TableCell>{product.market}</TableCell>
                  <TableCell>{product.version}</TableCell>
                  <TableCell>{product.owner}</TableCell>
                  <TableCell>
                    <ProductStatusBadge status={product.state} />
                  </TableCell>
                  <TableCell>
                    <div className="grid min-w-28 gap-1">
                      <Progress value={product.readiness} />
                      <span className="text-xs text-muted-foreground">
                        {product.readiness}%
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
            Catalog
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

function ProductStatusBadge({ status }: { status: string }) {
  if (status === "Active") {
    return <Badge>{status}</Badge>;
  }

  if (status === "Review") {
    return <Badge variant="secondary">{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}
