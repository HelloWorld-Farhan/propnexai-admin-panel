import { CompaniesTable } from "@/components/admin/companies-table";
import { listCompaniesForAdmin } from "@/src/server/repositories/company.repository";

export default async function CompaniesPage() {
  const companies = await listCompaniesForAdmin();
  const lowCreditCount = companies.filter((c) => c.lowCredit).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Companies</h1>
        <p className="text-sm text-muted-foreground">
          Manage tenant companies, credits, and setup
        </p>
      </div>
      <CompaniesTable companies={companies} lowCreditCount={lowCreditCount} />
    </div>
  );
}
