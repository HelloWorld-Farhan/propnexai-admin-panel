import { Bot } from "lucide-react";

export default function AgentLibraryPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
      <div className="rounded-full bg-muted p-4">
        <Bot className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Agent Library coming soon</h1>
      <p className="text-muted-foreground max-w-[500px]">
        We are working on bringing a global catalog of pre-built AI agents for you to manage and assign to companies.
      </p>
    </div>
  );
}
