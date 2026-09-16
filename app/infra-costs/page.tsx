import { prisma } from "@/lib/prisma";
import { Server } from "lucide-react";
import { InfraCostClient } from "./components/InfraCostClient";

export default async function InfraCostsPage() {
  const notifications = await prisma.infraCostNotification.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { name: true } },
      subCompany: { select: { name: true } },
    }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Server className="h-6 w-6 text-primary" />
            Infrastructure Costs
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage cost notifications and billing cycles for tenants.
          </p>
        </div>
      </div>
      
      <InfraCostClient initialData={JSON.parse(JSON.stringify(notifications))} />
    </div>
  );
}
