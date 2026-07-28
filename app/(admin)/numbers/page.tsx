import { NumbersManager } from "@/components/admin/numbers-manager";
import { getOutgoingServiceNumbers } from "@/lib/service-number-policy";
import {
  listNumberFormOptions,
  listPhoneNumbersForAdmin,
} from "@/src/server/repositories/number.repository";

export const dynamic = "force-dynamic";

export default async function NumbersPage() {
  const serviceNumbers = getOutgoingServiceNumbers();
  const [numbers, companies] = await Promise.all([
    listPhoneNumbersForAdmin(),
    listNumberFormOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Numbers</h1>
        <p className="text-sm text-muted-foreground">
          Manage outgoing service number assignment by company and campaign
        </p>
      </div>
      <NumbersManager
        numbers={JSON.parse(JSON.stringify(numbers))}
        companies={JSON.parse(JSON.stringify(companies))}
        serviceNumbers={serviceNumbers}
      />
    </div>
  );
}
