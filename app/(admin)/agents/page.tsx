import { AgentLibraryManager } from "@/components/admin/agent-library-manager";
import { listAgentLibraryEntries } from "@/src/server/repositories/agent-library.repository";

export default async function AgentsPage() {
  const entries = await listAgentLibraryEntries();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agent Library</h1>
        <p className="text-sm text-muted-foreground">
          Global agent templates available to all companies
        </p>
      </div>
      <AgentLibraryManager entries={JSON.parse(JSON.stringify(entries))} />
    </div>
  );
}
