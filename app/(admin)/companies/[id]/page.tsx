import { notFound } from "next/navigation";

import { CompanyDetail } from "@/components/admin/company-detail";

export const dynamic = "force-dynamic";
import { getCompanyById } from "@/src/server/repositories/company.repository";
import { listAgentLibraryEntries } from "@/src/server/repositories/agent-library.repository";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [company, libraryEntries] = await Promise.all([
    getCompanyById(id),
    listAgentLibraryEntries(),
  ]);

  if (!company) notFound();

  return (
    <CompanyDetail
      company={JSON.parse(JSON.stringify(company))}
      libraryEntries={JSON.parse(JSON.stringify(libraryEntries))}
    />
  );
}
