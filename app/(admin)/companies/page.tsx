import { CompaniesTable } from "@/components/admin/companies-table";
import { CreateCompanyDialog } from "@/components/admin/create-company-dialog";
import { ClearCompaniesDialog } from "@/components/admin/clear-companies-dialog";
import { listCompaniesForAdmin } from "@/src/server/repositories/company.repository";

import { AlertTriangle, Bell } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await listCompaniesForAdmin();
  const lowCreditCount = companies.filter((c) => c.lowCredit).length;
  const unverifiedSubCompaniesCount = companies.reduce((acc, c) => acc + (c.unverifiedChildCompanyCount || 0), 0);

  return (
    <div className="space-y-6">
      {unverifiedSubCompaniesCount > 0 && (
        <Alert variant="default" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          <Bell className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            You have {unverifiedSubCompaniesCount} sub-compan{unverifiedSubCompaniesCount === 1 ? 'y' : 'ies'} waiting for verification and number assignment.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Companies</h1>
          <p className="text-sm text-muted-foreground">
            Manage tenant companies, credits, and setup
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ClearCompaniesDialog />
          <CreateCompanyDialog />
        </div>
      </div>
      <CompaniesTable companies={companies} lowCreditCount={lowCreditCount} />
    </div>
  );
}
