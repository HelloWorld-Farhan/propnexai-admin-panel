"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { creditsForDuration } from "@/lib/credits";
import { formatDate, formatInr } from "@/lib/utils";

type CompanyData = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  creditBalance: {
    creditsRemaining: number;
    creditsUsed: number;
  } | null;
  contact: {
    name: string;
    email: string;
    phone: string | null;
    title: string | null;
  } | null;
  setupConfig: {
    totalChannels: number;
    pulseTimeSeconds: number;
    deltaSeconds: number;
    agentsAllocated: number;
  } | null;
  billingRates: {
    costPerChannel: number;
    costPerMinute: number;
    costPerCredit: number;
    setupOneTimeCost: number;
    currency: string;
  } | null;
  channels: Array<{
    id: string;
    channelIndex: number;
    label: string | null;
    phoneNumberId: string | null;
    phoneNumber: { id: string; number: string; label: string | null } | null;
  }>;
  phoneNumbers: Array<{
    id: string;
    number: string;
    label: string | null;
    status: string;
  }>;
  aiAgents: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    libraryEntry: { name: string; slug: string } | null;
  }>;
  billingSubscription: {
    planName: string;
    status: string;
    currentPeriodEnd: string;
  } | null;
  billingInvoices: Array<{
    id: string;
    status: string;
    amountCents: number;
    currency: string;
    issuedAt: string;
  }>;
  members: Array<{
    user: { email: string; firstName: string | null; lastName: string | null };
  }>;
};

type LibraryEntry = {
  id: string;
  name: string;
  slug: string;
  category: string;
  isPublished: boolean;
};

export function CompanyDetail({
  company,
  libraryEntries,
}: {
  company: CompanyData;
  libraryEntries: LibraryEntry[];
}) {
  const router = useRouter();
  const [contact, setContact] = useState({
    name: company.contact?.name ?? "",
    email: company.contact?.email ?? company.members[0]?.user.email ?? "",
    phone: company.contact?.phone ?? "",
    title: company.contact?.title ?? "",
  });
  const [setup, setSetup] = useState({
    totalChannels: company.setupConfig?.totalChannels ?? 0,
    pulseTimeSeconds: company.setupConfig?.pulseTimeSeconds ?? 60,
    deltaSeconds: company.setupConfig?.deltaSeconds ?? 2,
    agentsAllocated: company.setupConfig?.agentsAllocated ?? 0,
  });
  const [billing, setBilling] = useState({
    costPerChannel: company.billingRates?.costPerChannel ?? 650,
    costPerMinute: company.billingRates?.costPerMinute ?? 0,
    costPerCredit: company.billingRates?.costPerCredit ?? 0.31,
    setupOneTimeCost: company.billingRates?.setupOneTimeCost ?? 0,
  });
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("Admin credit top-up");
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [saving, setSaving] = useState(false);

  const previewCredits = creditsForDuration(
    61,
    setup.pulseTimeSeconds,
    setup.deltaSeconds,
  );

  async function saveContact() {
    setSaving(true);
    const res = await fetch(`/api/companies/${company.id}/contact`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    });
    setSaving(false);
    if (!res.ok) return toast.error("Failed to save contact");
    toast.success("Contact saved");
    router.refresh();
  }

  async function saveSetup() {
    setSaving(true);
    const res = await fetch(`/api/companies/${company.id}/setup`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(setup),
    });
    setSaving(false);
    if (!res.ok) return toast.error("Failed to save setup");
    toast.success("Setup saved");
    router.refresh();
  }

  async function saveBilling() {
    setSaving(true);
    const res = await fetch(`/api/companies/${company.id}/billing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(billing),
    });
    setSaving(false);
    if (!res.ok) return toast.error("Failed to save billing");
    toast.success("Billing rates saved");
    router.refresh();
  }

  async function addCredits() {
    const amount = Number.parseInt(creditAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      return toast.error("Enter a valid credit amount");
    }
    setSaving(true);
    const res = await fetch(`/api/companies/${company.id}/credits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, description: creditDescription }),
    });
    setSaving(false);
    if (!res.ok) return toast.error("Failed to add credits");
    toast.success(`Added ${amount} credits`);
    setCreditAmount("");
    router.refresh();
  }

  async function assignPhone(channelId: string, phoneNumberId: string) {
    const res = await fetch(`/api/companies/${company.id}/channels`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId,
        phoneNumberId: phoneNumberId === "none" ? null : phoneNumberId,
      }),
    });
    if (!res.ok) return toast.error("Failed to assign phone number");
    toast.success("Phone number assigned");
    router.refresh();
  }

  async function deployAgent() {
    if (!selectedLibraryId) return toast.error("Select a library agent");
    setSaving(true);
    const res = await fetch(`/api/companies/${company.id}/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libraryEntryId: selectedLibraryId }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return toast.error(data.error ?? "Failed to deploy agent");
    }
    toast.success("Agent deployed");
    setSelectedLibraryId("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{company.name}</h1>
          <p className="text-sm text-muted-foreground">{company.slug}</p>
        </div>
        <Badge variant={company.status === "ACTIVE" ? "success" : "secondary"}>
          {company.status}
        </Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Point of contact</CardTitle>
              <CardDescription>Primary contact for this company</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={contact.title ?? ""}
                  onChange={(e) => setContact({ ...contact, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={contact.phone ?? ""}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={saveContact} disabled={saving}>
                  Save contact
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Company documentation and images</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                Coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Channel & credit settings</CardTitle>
              <CardDescription>
                Pulse {setup.pulseTimeSeconds}s, delta {setup.deltaSeconds}s → 61s call uses {previewCredits} credit(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Total channels</Label>
                <Input
                  type="number"
                  min={0}
                  value={setup.totalChannels}
                  onChange={(e) =>
                    setSetup({ ...setup, totalChannels: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Agents allocated</Label>
                <Input
                  type="number"
                  min={0}
                  value={setup.agentsAllocated}
                  onChange={(e) =>
                    setSetup({ ...setup, agentsAllocated: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Pulse time (seconds)</Label>
                <Input
                  type="number"
                  min={1}
                  value={setup.pulseTimeSeconds}
                  onChange={(e) =>
                    setSetup({ ...setup, pulseTimeSeconds: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Delta seconds</Label>
                <Input
                  type="number"
                  min={0}
                  value={setup.deltaSeconds}
                  onChange={(e) =>
                    setSetup({ ...setup, deltaSeconds: Number(e.target.value) })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={saveSetup} disabled={saving}>
                  Save setup
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Credits</CardTitle>
                <CardDescription>
                  {company.creditBalance?.creditsRemaining.toLocaleString() ?? 0} remaining ·{" "}
                  {company.creditBalance?.creditsUsed.toLocaleString() ?? 0} used
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">Add credits</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add credits</DialogTitle>
                    <DialogDescription>
                      Credits are added to this company&apos;s balance
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        min={1}
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={creditDescription}
                        onChange={(e) => setCreditDescription(e.target.value)}
                      />
                    </div>
                    <Button onClick={addCredits} disabled={saving}>
                      Add credits
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Channel phone mapping</CardTitle>
              <CardDescription>Which channel uses which phone number</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>Phone number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.channels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        Set total channels and save setup to create channel slots
                      </TableCell>
                    </TableRow>
                  ) : (
                    company.channels.map((channel) => (
                      <TableRow key={channel.id}>
                        <TableCell>
                          {channel.label ?? `Channel ${channel.channelIndex}`}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={channel.phoneNumberId ?? "none"}
                            onValueChange={(value) => assignPhone(channel.id, value)}
                          >
                            <SelectTrigger className="max-w-xs">
                              <SelectValue placeholder="Select number" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Unassigned</SelectItem>
                              {company.phoneNumbers.map((phone) => (
                                <SelectItem key={phone.id} value={phone.id}>
                                  {phone.number}
                                  {phone.label ? ` (${phone.label})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Agents</CardTitle>
                <CardDescription>
                  {company.aiAgents.length}
                  {setup.agentsAllocated > 0 ? ` / ${setup.agentsAllocated}` : ""} deployed
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedLibraryId} onValueChange={setSelectedLibraryId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="From library" />
                  </SelectTrigger>
                  <SelectContent>
                    {libraryEntries
                      .filter((e) => e.isPublished)
                      .map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {entry.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={deployAgent} disabled={saving}>
                  Deploy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Library</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.aiAgents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        No agents deployed yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    company.aiAgents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell>{agent.name}</TableCell>
                        <TableCell>{agent.type}</TableCell>
                        <TableCell>
                          <Badge variant={agent.status === "ACTIVE" ? "success" : "secondary"}>
                            {agent.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{agent.libraryEntry?.name ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing rates</CardTitle>
              <CardDescription>Per-company pricing configuration</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cost per channel (INR)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={billing.costPerChannel}
                  onChange={(e) =>
                    setBilling({ ...billing, costPerChannel: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cost per minute (INR)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={billing.costPerMinute}
                  onChange={(e) =>
                    setBilling({ ...billing, costPerMinute: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cost per credit (INR)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={billing.costPerCredit}
                  onChange={(e) =>
                    setBilling({ ...billing, costPerCredit: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>One-time setup cost (INR)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={billing.setupOneTimeCost}
                  onChange={(e) =>
                    setBilling({ ...billing, setupOneTimeCost: Number(e.target.value) })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={saveBilling} disabled={saving}>
                  Save billing rates
                </Button>
              </div>
            </CardContent>
          </Card>

          {company.billingSubscription ? (
            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>Plan: {company.billingSubscription.planName}</p>
                <p>Status: {company.billingSubscription.status}</p>
                <p>
                  Period ends: {formatDate(company.billingSubscription.currentPeriodEnd)}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Recent invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {company.billingInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issued</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {company.billingInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{formatDate(invoice.issuedAt)}</TableCell>
                        <TableCell>{invoice.status}</TableCell>
                        <TableCell>
                          {formatInr(invoice.amountCents / 100)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
