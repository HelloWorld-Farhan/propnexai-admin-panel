import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const forms = await prisma.formSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Form Info</h1>
          <p className="text-muted-foreground mt-2">
            View all website form submissions across Demo Calls and Partner Applications.
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Additional Info</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No form submissions yet.
                </TableCell>
              </TableRow>
            ) : (
              forms.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell>
                    {f.formType === "DEMO_CALL" ? (
                      <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20">Demo Call</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-violet-500/10 text-violet-500 hover:bg-violet-500/20">Partner App</Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(f.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </TableCell>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell>{f.email}</TableCell>
                  <TableCell>{f.phone}</TableCell>
                  <TableCell>{f.company || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {f.formType === "DEMO_CALL" ? (
                      <span>Industry: {f.industry || "—"}</span>
                    ) : (
                      <div className="flex flex-col">
                        <span>Clients: {f.clients || "—"}</span>
                        <span>Volume: {f.volume || "—"}</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
