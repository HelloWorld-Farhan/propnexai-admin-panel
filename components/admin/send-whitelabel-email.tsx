"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SendWhiteLabelEmailButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setError("");
    if (!email || !username || !password) {
      setError("Please fill all fields");
      return;
    }
    if (password !== "Propnexai@123") {
      setError("Incorrect administrator password");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/white-label/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password })
      });

      if (res.ok) {
        setSent(true);
        toast.success("Email sent successfully!");
        setTimeout(() => {
          setIsOpen(false);
          setSent(false);
          setEmail("");
          setUsername("");
          setPassword("");
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send email");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9 px-4 py-2">
          <Mail className="h-4 w-4" /> Send Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle>Send White Label Guide</DialogTitle>
          <DialogDescription>
            Send the DNS configuration PDF and the setup form link directly to the domain owner.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Client Name</Label>
            <Input placeholder="e.g. John Doe" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Client Email</Label>
            <Input type="email" placeholder="client@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Admin Password</Label>
            <Input type="password" placeholder="Enter admin password" value={password} onChange={e => setPassword(e.target.value)} />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={sending || sent}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || sent} className="min-w-[120px] transition-all bg-blue-600 hover:bg-blue-700">
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
            ) : sent ? (
              <><CheckCircle2 className="h-4 w-4 mr-2 text-green-400" /> Sent!</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Send Email</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
