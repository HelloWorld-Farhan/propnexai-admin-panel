import { DashboardView } from "@/components/admin/dashboard-view";
import { getDashboardStats } from "@/src/server/repositories/dashboard.repository";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Connection health and traffic across all companies
        </p>
      </div>
      <DashboardView initialStats={JSON.parse(JSON.stringify(stats))} />
    </div>
  );
}
