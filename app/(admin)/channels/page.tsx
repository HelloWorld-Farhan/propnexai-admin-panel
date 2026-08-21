import { Clock } from "lucide-react";

export default function ChannelsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
      <div className="rounded-full bg-muted p-4">
        <Clock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Channels coming soon</h1>
      <p className="text-muted-foreground max-w-[500px]">
        We are working on bringing advanced telephony channels and multi-provider configurations to the admin panel.
      </p>
    </div>
  );
}
