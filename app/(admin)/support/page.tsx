import { SupportRequestsTable } from "@/components/admin/support-requests-table";
import { listSupportRequests } from "@/src/server/repositories/support-request.repository";

export default async function SupportPage() {
  const requests = await listSupportRequests();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Support</h1>
        <p className="text-sm text-muted-foreground">
          Contact form submissions from the public website
        </p>
      </div>
      <SupportRequestsTable initialRequests={requests} />
    </div>
  );
}
