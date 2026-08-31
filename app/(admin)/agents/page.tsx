import { AgentLibraryManager } from "@/components/admin/agent-library-manager";
import { listAgentLibraryEntries } from "@/src/server/repositories/agent-library.repository";

export const dynamic = "force-dynamic";

export default async function AgentLibraryPage() {
  const entries = await listAgentLibraryEntries();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agent Library</h1>
        <p className="text-sm text-muted-foreground">
          Manage the global catalog of pre-built AI agents
        </p>
      </div>
      <AgentLibraryManager entries={entries} />
    </div>
  );
}
