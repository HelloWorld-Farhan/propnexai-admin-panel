import { ChannelsTable } from "@/components/admin/channels-table";
import { listMockChannels } from "@/lib/mock/channels";

export default function ChannelsPage() {
  const channels = listMockChannels();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Channels</h1>
        <p className="text-sm text-muted-foreground">
          View all telephony channels, assignments, and activity across companies
        </p>
      </div>
      <ChannelsTable channels={channels} />
    </div>
  );
}
