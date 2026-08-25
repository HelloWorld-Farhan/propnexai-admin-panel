"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

import { AddCreditDialog } from "@/components/admin/add-credit-dialog";
import { EditCreditDialog } from "@/components/admin/edit-credit-dialog";
import { DeleteCompanyDialog } from "@/components/admin/delete-company-dialog";
import { VerifySubCompanyDialog } from "@/components/admin/verify-sub-company-dialog";
import { AddNumberDialog } from "@/components/admin/add-number-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DirectionalNumberCell } from "@/components/admin/companies-table";
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
import { deriveCostPerMinute } from "@/lib/billing";
import { formatDate, formatInr, formatNumber } from "@/lib/utils";

type CompanyData = {
  id: string;
  name: string;
  slug: string;
  status: string;
  contractId: string;
  cli: string;
  companyCode: string;
  claimedAt: string | null;
  ownerUserId: string | null;
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
    serviceNumber: string | null;
    ivrTemplateId: string | null;
    pulseTimeSeconds: number;
    deltaSeconds: number;
    agentsAllocated: number;
  } | null;
  billingRates: {
    costPerChannel: number;
    costPerCredit: number;
    pulseTimeSeconds: number;
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
  childCompanies?: any[];
  aiAgents: Array<{
    id: string;
    name: string;
    description: string | null;
    type: string;
    status: string;
    enabled: boolean;
    systemPrompt: string | null;
    firstMessage: string | null;
    modelConfig: Record<string, unknown>;
    libraryEntry: { name: string; slug: string } | null;
    communicationChannels: Array<{
      id: string;
      type: string;
      enabled: boolean;
      settings: Record<string, unknown>;
    }>;
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
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    resourceKey: string;
    aiEnabled: boolean;
    createdAt: string;
    execution: { status: string } | null;
  }>;
  members: Array<{
    user: { email: string; firstName: string | null; lastName: string | null; phone: string | null };
  }>;
};

export function CompanyDetail({ company }: { company: CompanyData }) {
  const router = useRouter();
  const [liveCompany, setLiveCompany] = useState(company);
  const [serviceNumbers, setServiceNumbers] = useState<string[]>([]);
  const [contact, setContact] = useState({
    name: company.contact?.name ?? "",
    email: company.contact?.email ?? company.members[0]?.user.email ?? "",
    phone: company.contact?.phone ?? "",
    title: company.contact?.title ?? "",
  });
  const [setup, setSetup] = useState({
    totalChannels: company.setupConfig?.totalChannels ?? 0,
    serviceNumber: company.setupConfig?.serviceNumber ?? "",
    ivrTemplateId: company.setupConfig?.ivrTemplateId ?? "",
    deltaSeconds: company.setupConfig?.deltaSeconds ?? 2,
  });
  const [billing, setBilling] = useState({
    costPerChannel: company.billingRates?.costPerChannel ?? 650,
    costPerCredit: company.billingRates?.costPerCredit ?? 0.31,
    pulseTimeSeconds:
      company.billingRates?.pulseTimeSeconds ??
      company.setupConfig?.pulseTimeSeconds ??
      60,
    setupOneTimeCost: company.billingRates?.setupOneTimeCost ?? 0,
  });
  const [billingErrors, setBillingErrors] = useState<{
    costPerCredit?: string;
    pulseTimeSeconds?: string;
  }>({});
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("Admin credit top-up");
  const [saving, setSaving] = useState(false);
  const [editChild, setEditChild] = useState<{ id: string; name: string } | null>(null);
  const [editChildName, setEditChildName] = useState("");
  const [editChildNumber, setEditChildNumber] = useState("");
  const [editChildSaving, setEditChildSaving] = useState(false);
  
  const [editCreditChild, setEditCreditChild] = useState<{ id: string; name: string } | null>(null);
  const [editCreditAmount, setEditCreditAmount] = useState("");
  const [editCreditDescription, setEditCreditDescription] = useState("Admin credit override");
  const [editCreditSaving, setEditCreditSaving] = useState(false);

  const [removeChild, setRemoveChild] = useState<{ id: string; name: string } | null>(null);
  const [removeChildSaving, setRemoveChildSaving] = useState(false);
  const [contractCopied, setContractCopied] = useState(false);

  const availableServiceNumbers = useMemo(() => {
    const numbers = [...serviceNumbers];
    const current = setup.serviceNumber.trim();
    if (current && !numbers.includes(current)) {
      numbers.unshift(current);
    }
    return numbers;
  }, [serviceNumbers, setup.serviceNumber]);

  const isClaimed = liveCompany.ownerUserId != null;
  const linkedOwner = liveCompany.members[0]?.user ?? null;
  const linkedOwnerName = linkedOwner
    ? [linkedOwner.firstName, linkedOwner.lastName].filter(Boolean).join(" ")
    : "";

  async function handleCopyContractId() {
    try {
      await navigator.clipboard.writeText(liveCompany.contractId);
      setContractCopied(true);
      toast.success("Contract ID copied");
      setTimeout(() => setContractCopied(false), 2000);
    } catch {
      toast.error("Failed to copy Contract ID");
    }
  }

  const refreshLiveCompany = useCallback(async () => {
    const res = await fetch(`/api/companies/${company.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as CompanyData;
    setLiveCompany(data);
  }, [company.id]);

  async function handleEditSubCompany() {
    if (!editChild || !editChildName.trim()) return;
    setEditChildSaving(true);
    try {
      const res = await fetch(`/api/companies/${editChild.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editChildName.trim(), assignedNumber: editChildNumber.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Sub-company renamed successfully");
      setEditChild(null);
      await refreshLiveCompany();
    } catch {
      toast.error("Failed to rename sub-company");
    } finally {
      setEditChildSaving(false);
    }
  }

  async function handleRemoveSubCompany() {
    if (!removeChild) return;
    setRemoveChildSaving(true);
    try {
      const res = await fetch(`/api/companies/${removeChild.id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete");
      }
      toast.success(`"${removeChild.name}" removed successfully`);
      setRemoveChild(null);
      await refreshLiveCompany();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove sub-company");
    } finally {
      setRemoveChildSaving(false);
    }
  }

  async function handleEditSubCompanyCredits() {
    if (!editCreditChild) return;
    const amount = Number.parseInt(editCreditAmount, 10);
    if (!Number.isFinite(amount) || amount < 0) {
      return toast.error("Credit amount must be 0 or more");
    }
    setEditCreditSaving(true);
    try {
      const res = await fetch(`/api/companies/${editCreditChild.id}/credits/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description: editCreditDescription }),
      });
      if (!res.ok) throw new Error("Failed to update credits");
      toast.success(`Set credits to ${amount}`);
      setEditCreditChild(null);
      await refreshLiveCompany();
    } catch {
      toast.error("Failed to update sub-company credits");
    } finally {
      setEditCreditSaving(false);
    }
  }

  useEffect(() => {
    setLiveCompany(company);
  }, [company]);

  useEffect(() => {
    let cancelled = false;

    async function loadServiceNumbers() {
      try {
        const res = await fetch("/api/service-numbers", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { numbers?: string[] };
        if (!cancelled && Array.isArray(data.numbers)) {
          setServiceNumbers(data.numbers);
        }
      } catch {
        // Service number dropdown falls back to the company's current value.
      }
    }

    void loadServiceNumbers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshLiveCompany();
    const interval = setInterval(() => void refreshLiveCompany(), 15000);
    const onFocus = () => void refreshLiveCompany();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshLiveCompany]);

  const previewCredits = creditsForDuration(
    61,
    billing.pulseTimeSeconds,
    setup.deltaSeconds,
  );

  const derivedCostPerMinute = deriveCostPerMinute(
    billing.costPerCredit,
    billing.pulseTimeSeconds,
  );

  function validateBillingFields(values = billing) {
    const errors: { costPerCredit?: string; pulseTimeSeconds?: string } = {};
    if (!Number.isFinite(values.costPerCredit) || values.costPerCredit <= 0) {
      errors.costPerCredit = "Cost per credit must be greater than 0";
    }
    if (
      !Number.isFinite(values.pulseTimeSeconds) ||
      values.pulseTimeSeconds <= 0 ||
      !Number.isInteger(values.pulseTimeSeconds)
    ) {
      errors.pulseTimeSeconds = "Pulse time must be a whole number greater than 0";
    }
    setBillingErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function updateBillingField<K extends keyof typeof billing>(
    field: K,
    value: (typeof billing)[K],
  ) {
    const next = { ...billing, [field]: value };
    setBilling(next);
    validateBillingFields(next);
  }

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
    await refreshLiveCompany();
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
    await refreshLiveCompany();
    router.refresh();
  }

  async function saveBilling() {
    if (!validateBillingFields()) {
      return toast.error("Fix billing validation errors before saving");
    }
    setSaving(true);
    const res = await fetch(`/api/companies/${company.id}/billing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(billing),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      return toast.error(data?.error ?? "Failed to save billing");
    }
    toast.success("Billing rates saved");
    await refreshLiveCompany();
    router.refresh();
  }

  async function addCredits() {
    const amount = Number.parseInt(creditAmount, 10);
    if (!Number.isFinite(amount) || amount < 5000) {
      return toast.error("Minimum credit top-up is 5000");
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
    await refreshLiveCompany();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{liveCompany.name}</h1>
          <p className="text-sm text-muted-foreground">{liveCompany.slug}</p>
        </div>
        <Badge variant={liveCompany.status === "ACTIVE" ? "success" : "secondary"}>
          {liveCompany.status}
        </Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sub-companies">Sub-Companies</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Public ID Identity</CardTitle>
              <CardDescription>
                CLI and company code are embedded in all public resource IDs and
                should remain unchanged after creation.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>CLI</Label>
                <Input readOnly value={liveCompany.cli} className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Company Code</Label>
                <Input
                  readOnly
                  value={liveCompany.companyCode}
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contract ID</CardTitle>
              <CardDescription>
                Share this ID with the client for their initial signup. It cannot
                be changed after creation.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Contract ID</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={liveCompany.contractId}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyContractId}
                    aria-label="Copy Contract ID"
                  >
                    {contractCopied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Claimed status</Label>
                <div>
                  <Badge variant={isClaimed ? "success" : "outline"}>
                    {isClaimed ? "Claimed" : "Unclaimed"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Claimed at</Label>
                <p className="text-sm">
                  {liveCompany.claimedAt
                    ? formatDate(new Date(liveCompany.claimedAt))
                    : "—"}
                </p>
              </div>
              {isClaimed && linkedOwner ? (
                <>
                  <div className="space-y-2">
                    <Label>Linked owner</Label>
                    <p className="text-sm font-medium">
                      {linkedOwnerName || "—"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Owner email</Label>
                    <p className="text-sm">{linkedOwner.email}</p>
                  </div>
                </>
              ) : null}
              <div className="space-y-2 sm:col-span-2">
                <Label>Owner Clerk ID</Label>
                <p className="font-mono text-sm">
                  {liveCompany.ownerUserId ?? "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Owner contact</CardTitle>
              <CardDescription>
                {isClaimed
                  ? "Owner who linked the Contract ID. Email is locked after claim."
                  : "Owner contact is set when the Contract ID is linked."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {isClaimed ? (
                <>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={linkedOwnerName || contact.name}
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assigned Phone Numbers</Label>
                    <Input
                      readOnly
                      disabled
                      value={liveCompany.phoneNumbers?.map(pn => pn.number).join(", ") || "None"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner email</Label>
                    <Input
                      type="email"
                      value={contact.email}
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Personal Login Phone Number</Label>
                    <Input
                      value={linkedOwner?.phone ?? contact.phone ?? ""}
                      readOnly
                      disabled
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  Not yet claimed — owner email and contact details will be set
                  when the Contract ID is linked.
                </p>
              )}
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

        <TabsContent value="sub-companies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sub-Companies (Child Tenants)</CardTitle>
              <CardDescription>
                Manage companies created by this tenant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(!liveCompany.childCompanies || liveCompany.childCompanies.length === 0) ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                  No sub-companies found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Inbound Number</TableHead>
                      <TableHead>Outbound Number</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveCompany.childCompanies.map((child: any) => {
                      const isVerified = child.status === "ACTIVE";
                      const inboundNums = (child.phoneNumbers || []).filter((p: any) => p.direction === "INBOUND").map((p: any) => ({ number: p.number, channels: p.channels || null }));
                      const outboundNums = (child.phoneNumbers || []).filter((p: any) => p.direction === "OUTBOUND").map((p: any) => ({ number: p.number, channels: p.channels || null }));
                      const assignedNum = inboundNums[0]?.number || outboundNums[0]?.number || "—";
                      const totalChannels = child.setupConfig?.totalChannels || 0;
                      const credits = child.creditBalance?.creditsRemaining ?? 0;
                      return (
                        <TableRow key={child.id}>
                          <TableCell className="font-medium">{child.name}</TableCell>
                          <TableCell>
                            <DirectionalNumberCell
                              row={{ id: child.id, name: child.name } as any}
                              direction="INBOUND"
                              nums={inboundNums}
                              onRefresh={refreshLiveCompany}
                            />
                          </TableCell>
                          <TableCell>
                            <DirectionalNumberCell
                              row={{ id: child.id, name: child.name } as any}
                              direction="OUTBOUND"
                              nums={outboundNums}
                              onRefresh={refreshLiveCompany}
                            />
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{credits}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                title="Edit Credits"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditCreditChild({ id: child.id, name: child.name });
                                  setEditCreditAmount(credits.toString());
                                }}
                              >
                                <Pencil className="size-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={child.status === "ACTIVE" ? "success" : "secondary"}>
                              {child.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(new Date(child.createdAt))}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {/* Verify button — only for un-verified or no number assigned yet */}
                              {(child.status !== "ACTIVE" || (inboundNums.length + outboundNums.length) === 0) && (
                                <VerifySubCompanyDialog
                                  subCompanyId={child.id}
                                  subCompanyName={child.name}
                                  parentCompanyId={company.id}
                                  onSuccess={refreshLiveCompany}
                                />
                              )}
                              {/* + Add Number — always available once company exists */}
                              <AddNumberDialog
                                companyId={child.id}
                                companyName={child.name}
                                onSuccess={refreshLiveCompany}
                                customTrigger={
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                    + Number
                                  </Button>
                                }
                              />
                              {/* Show 'Verified' label if active and has number */}
                              {isVerified && (inboundNums.length + outboundNums.length) > 0 && child.status === "ACTIVE" && (
                                <span className="text-xs font-medium text-green-600">✓ Verified</span>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Edit sub-company"
                                onClick={() => { 
                                  setEditChild({ id: child.id, name: child.name }); 
                                  setEditChildName(child.name);
                                  setEditChildNumber(assignedNum === "—" ? "" : assignedNum);
                                }}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-500/70 hover:text-red-500"
                                title="Remove sub-company"
                                onClick={() => setRemoveChild({ id: child.id, name: child.name })}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Edit Credit Dialog */}
          <Dialog open={!!editCreditChild} onOpenChange={(open) => !open && setEditCreditChild(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Credits for {editCreditChild?.name}</DialogTitle>
                <DialogDescription>
                  This will override and set the exact credit balance for this sub-company.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>New Credit Balance</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editCreditAmount}
                    onChange={(e) => setEditCreditAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={editCreditDescription}
                    onChange={(e) => setEditCreditDescription(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditCreditChild(null)} disabled={editCreditSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditSubCompanyCredits} disabled={editCreditSaving}>
                    Save Credits
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Channel & credit settings</CardTitle>
              <CardDescription>
                Pulse {billing.pulseTimeSeconds}s, delta {setup.deltaSeconds}s → 61s call uses {previewCredits} credit(s)
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
                <Label>Service number</Label>
                <Select
                  value={setup.serviceNumber || undefined}
                  onValueChange={(value) =>
                    setSetup({ ...setup, serviceNumber: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select OBD service / DID number" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableServiceNumbers.map((number) => (
                      <SelectItem key={number} value={number}>
                        {number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>IVR template ID</Label>
                <Input
                  value={setup.ivrTemplateId}
                  placeholder="e.g. 179"
                  onChange={(e) =>
                    setSetup({ ...setup, ivrTemplateId: e.target.value })
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
                  {formatNumber(liveCompany.creditBalance?.creditsRemaining ?? 0)} remaining ·{" "}
                  {formatNumber(liveCompany.creditBalance?.creditsUsed ?? 0)} used
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <EditCreditDialog companyId={liveCompany.id} companyName={liveCompany.name} currentCredits={liveCompany.creditBalance?.creditsRemaining ?? 0} />
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
                        min={5000}
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
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaigns</CardTitle>
              <CardDescription>
                Campaigns this company is currently running or has configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              {liveCompany.campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No campaigns yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Execution</TableHead>
                      <TableHead>AI</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveCompany.campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {campaign.resourceKey}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              campaign.status === "ACTIVE" ? "success" : "secondary"
                            }
                          >
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {campaign.execution?.status ?? "—"}
                        </TableCell>
                        <TableCell>
                          {campaign.aiEnabled ? "Enabled" : "Disabled"}
                        </TableCell>
                        <TableCell>{formatDate(campaign.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing rates</CardTitle>
              <CardDescription>
                Cost per minute is derived from cost per credit and pulse time
              </CardDescription>
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
                    updateBillingField("costPerChannel", Number(e.target.value))
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
                    updateBillingField("costPerCredit", Number(e.target.value))
                  }
                  aria-invalid={Boolean(billingErrors.costPerCredit)}
                />
                {billingErrors.costPerCredit ? (
                  <p className="text-sm text-destructive">{billingErrors.costPerCredit}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Pulse time (seconds)</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={billing.pulseTimeSeconds}
                  onChange={(e) =>
                    updateBillingField("pulseTimeSeconds", Number(e.target.value))
                  }
                  aria-invalid={Boolean(billingErrors.pulseTimeSeconds)}
                />
                {billingErrors.pulseTimeSeconds ? (
                  <p className="text-sm text-destructive">{billingErrors.pulseTimeSeconds}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Cost per minute (INR)</Label>
                <Input
                  type="text"
                  readOnly
                  value={derivedCostPerMinute.toFixed(2)}
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  (60 ÷ {billing.pulseTimeSeconds}) × {billing.costPerCredit} = ₹
                  {derivedCostPerMinute.toFixed(2)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>One-time setup cost (INR)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={billing.setupOneTimeCost}
                  onChange={(e) =>
                    updateBillingField("setupOneTimeCost", Number(e.target.value))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  onClick={saveBilling}
                  disabled={
                    saving ||
                    Boolean(billingErrors.costPerCredit || billingErrors.pulseTimeSeconds)
                  }
                >
                  Save billing rates
                </Button>
              </div>
            </CardContent>
          </Card>

          {liveCompany.billingSubscription ? (
            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>Plan: {liveCompany.billingSubscription.planName}</p>
                <p>Status: {liveCompany.billingSubscription.status}</p>
                <p>
                  Period ends: {formatDate(liveCompany.billingSubscription.currentPeriodEnd)}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Recent invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {liveCompany.billingInvoices.length === 0 ? (
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
                    {liveCompany.billingInvoices.map((invoice) => (
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

      {/* Edit Sub-Company Dialog */}
      <Dialog open={!!editChild} onOpenChange={(v) => !v && setEditChild(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sub-Company</DialogTitle>
            <DialogDescription>
              Update the settings for &quot;{editChild?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Label htmlFor="edit-child-name">Company Name</Label>
            <Input
              id="edit-child-name"
              value={editChildName}
              onChange={(e) => setEditChildName(e.target.value)}
              placeholder="Enter new name"
              onKeyDown={(e) => e.key === "Enter" && handleEditSubCompany()}
            />
          </div>
          <div className="space-y-3 mt-2">
            <Label htmlFor="edit-child-number">Assigned Phone Number</Label>
            <Input
              id="edit-child-number"
              value={editChildNumber}
              onChange={(e) => setEditChildNumber(e.target.value)}
              placeholder="e.g. 919429390765"
              onKeyDown={(e) => e.key === "Enter" && handleEditSubCompany()}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditChild(null)} disabled={editChildSaving}>
              Cancel
            </Button>
            <Button onClick={handleEditSubCompany} disabled={editChildSaving || !editChildName.trim()}>
              {editChildSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Sub-Company Dialog */}
      <Dialog open={!!removeChild} onOpenChange={(v) => !v && setRemoveChild(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Sub-Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently remove <b>&quot;{removeChild?.name}&quot;</b>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRemoveChild(null)} disabled={removeChildSaving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveSubCompany} disabled={removeChildSaving}>
              {removeChildSaving ? "Removing…" : "Remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
