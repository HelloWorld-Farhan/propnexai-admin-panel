import { notFound } from "next/navigation";

import { ChannelDetail } from "@/components/admin/channel-detail";
import { getMockChannelById } from "@/lib/mock/channels";

export default async function ChannelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const channel = getMockChannelById(id);

  if (!channel) notFound();

  return <ChannelDetail channel={channel} />;
}
