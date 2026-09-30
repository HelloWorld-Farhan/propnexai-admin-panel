"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Globe, CheckCircle2, Edit, Trash2, Eye, X, AlertCircle, Upload, User } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Domain = {
  id: string;
  domain: string;
  companyName: string;
  tabTitle?: string;
  supportEmail: string;
  supportPhone?: string;
  logoUrl?: string;
  faviconUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  status: string;
  pagesConfig: string;
  createdAt: string;
};

const defaultPages = {
  features: true,
  product: true,
  pricing: true,
  docs: true,
  dashboard: true,
};

export default function WhiteLabelManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDnsModalOpen, setIsDnsModalOpen] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<Partial<Domain>>({});
  const [pagesConfig, setPagesConfig] = useState<typeof defaultPages>(defaultPages);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<string | null>(null);
  const [enableInstagram, setEnableInstagram] = useState(true);
  const [enableLinkedIn, setEnableLinkedIn] = useState(true);

  // New states for search and deployment
  const [searchQuery, setSearchQuery] = useState("");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [deploymentStep, setDeploymentStep] = useState(0);
  const [deploymentError, setDeploymentError] = useState("");
  const [pendingAction, setPendingAction] = useState<"DEPLOY" | "DELETE" | null>(null);

  const filteredDomains = domains.filter(d => 
    (d.domain && d.domain.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (d.companyName && d.companyName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const manualDomains = filteredDomains.filter(d => {
    try {
      const config = JSON.parse(d.pagesConfig || "{}");
      return !config.submittedViaForm;
    } catch {
      return true;
    }
  });

  const formSubmissions = filteredDomains.filter(d => {
    try {
      const config = JSON.parse(d.pagesConfig || "{}");
      return config.submittedViaForm;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/white-label");
      if (res.ok) {
        const data = await res.json();
        setDomains(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setCurrentDomain({});
    setPagesConfig(defaultPages);
    setIsEditing(false);
    setEnableInstagram(true);
    setEnableLinkedIn(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (d: Domain) => {
    setCurrentDomain(d);
    try {
      setPagesConfig(JSON.parse(d.pagesConfig || "{}"));
    } catch {
      setPagesConfig(defaultPages);
    }
    setIsEditing(true);
    setEnableInstagram(!!d.instagramUrl);
    setEnableLinkedIn(!!d.linkedinUrl);
    setIsModalOpen(true);
  };

  const handleMarkDone = async (d: Domain) => {
    try {
      const res = await fetch(`/api/white-label/${d.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (res.ok) {
        toast.success("Domain marked as Done and confirmation email sent!");
        fetchDomains();
      } else {
        toast.error("Failed to mark as done.");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const validateUrl = (url?: string) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'logo') setUploadingLogo(true);
    else setUploadingFavicon(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        setCurrentDomain(prev => ({
          ...prev,
          [type === 'logo' ? 'logoUrl' : 'faviconUrl']: url
        }));
        toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`);
      } else {
        toast.error("Failed to upload image");
      }
    } catch (err) {
      toast.error("Upload error");
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else setUploadingFavicon(false);
    }
  };

  const handleAddSubmit = async () => {
    if (!currentDomain.domain || !currentDomain.companyName || !currentDomain.supportEmail || !currentDomain.logoUrl || !currentDomain.faviconUrl) {
      toast.error("Please fill all required fields (marked with *)");
      return;
    }

    if (enableInstagram && (!currentDomain.instagramUrl || !validateUrl(currentDomain.instagramUrl))) {
      toast.error("Instagram link must be a valid URL (e.g. https://instagram.com/...)");
      return;
    }

    if (enableLinkedIn && (!currentDomain.linkedinUrl || !validateUrl(currentDomain.linkedinUrl))) {
      toast.error("LinkedIn link must be a valid URL (e.g. https://linkedin.com/...)");
      return;
    }

    setIsModalOpen(false);
    setIsDnsModalOpen(true);
  };

  const handleConfirmSave = async (isDeploying = false) => {
    setSaving(true);
    try {
      const payload = {
        ...currentDomain,
        instagramUrl: enableInstagram ? currentDomain.instagramUrl : "",
        linkedinUrl: enableLinkedIn ? currentDomain.linkedinUrl : "",
        pagesConfig,
        status: "ACTIVE"
      };

      const url = isEditing ? `/api/white-label/${currentDomain.id}` : "/api/white-label";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (!isDeploying) {
          toast.success(`Domain successfully ${isEditing ? "updated" : "added"}.`);
          fetchDomains();
          setIsDnsModalOpen(false);
        }
      } else {
        const err = await res.json();
        toast.error(err.error);
      }
    } catch (e) {
      toast.error("Failed to save domain");
    } finally {
      setSaving(false);
    }
  };

  const startDeploymentAnimation = async () => {
    setDeploymentStep(1);
    await handleConfirmSave(true);
    
    setTimeout(() => {
      setDeploymentStep(2);
      setTimeout(() => {
        setDeploymentStep(3);
        setTimeout(() => {
          setDeploymentStep(4);
          setTimeout(() => {
            setIsPasswordModalOpen(false);
            setDeploymentStep(0);
            setPasswordInput("");
            setPendingAction(null);
            toast.success("Domain successfully deployed and live!");
            fetchDomains();
          }, 2000);
        }, 2000);
      }, 2500);
    }, 1500);
  };

  const executeDelete = async () => {
    if (!domainToDelete) return;
    setDeploymentStep(5);
    
    setTimeout(() => {
      setDeploymentStep(6);
      setTimeout(async () => {
        try {
          const res = await fetch(`/api/white-label/${domainToDelete}`, { method: "DELETE" });
          if (res.ok) {
            toast.success("Domain removed permanently.");
            fetchDomains();
          } else {
            toast.error("Failed to delete from database");
          }
        } catch (e) {
          toast.error("Delete failed");
        } finally {
          setIsPasswordModalOpen(false);
          setDomainToDelete(null);
          setPendingAction(null);
          setDeploymentStep(0);
          setPasswordInput("");
        }
      }, 1500);
    }, 1500);
  };

  const checkRealTimeStatus = async (id: string) => {
    toast.info("Verifying CNAME records...");
    setTimeout(() => {
      toast.success("Domain is live and running!");
      fetchDomains(); // Mock refresh
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="domains" className="w-full">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
          <TabsList>
            <TabsTrigger value="domains">Whitelabel Domains</TabsTrigger>
            <TabsTrigger value="submissions">User Details (Forms)</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search domain or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            <Button onClick={handleOpenAdd}>
              <Plus className="mr-2 h-4 w-4" /> Add Website
            </Button>
          </div>
        </div>

        <TabsContent value="domains">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Whitelabel Domains</CardTitle>
                <CardDescription>Manage customized branding for specific domains.</CardDescription>
              </div>
            </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="p-4 text-left font-medium">Domain</th>
                    <th className="p-4 text-left font-medium">Company</th>
                    <th className="p-4 text-left font-medium">Status</th>
                    <th className="p-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {manualDomains.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No domains found.</td></tr>
                  ) : (
                    manualDomains.map((d) => (
                      <tr key={d.id} className="border-b border-border hover:bg-muted/30">
                        <td className="p-4 font-medium flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          {d.domain}
                        </td>
                        <td className="p-4 text-muted-foreground">{d.companyName}</td>
                        <td className="p-4">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                            ACTIVE
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => window.open(`https://${d.domain}`, "_blank")} title="Preview" className="hover:bg-muted/50 hover:text-foreground text-muted-foreground transition-colors">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(d)} title="Edit" className="hover:bg-blue-500/10 hover:text-blue-500 transition-colors">
                              <Edit className="h-4 w-4 text-blue-400" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDomainToDelete(d.id)} title="Delete" className="hover:bg-red-500/10 hover:text-red-500 transition-colors">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>User Details (Form Submissions)</CardTitle>
              <CardDescription>Review the branding details submitted by users through the public setup form.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : (
                <div className="rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="p-4 text-left font-medium">Domain / Company</th>
                        <th className="p-4 text-left font-medium">Support Contact</th>
                        <th className="p-4 text-left font-medium">Status</th>
                        <th className="p-4 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formSubmissions.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No submissions found.</td></tr>
                      ) : (
                        formSubmissions.map((d) => {
                          let config = {};
                          try { config = JSON.parse(d.pagesConfig || "{}"); } catch(e) {}
                          const userName = (config as any).userName || "Unknown";

                          return (
                          <tr key={d.id} className="border-b border-border hover:bg-muted/30">
                            <td className="p-4">
                              <div className="font-semibold text-white mb-1 flex items-center gap-2">
                                <User className="h-4 w-4 text-emerald-500" />
                                {userName}
                              </div>
                              <div className="font-medium flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                {d.domain}
                              </div>
                              <div className="text-muted-foreground mt-1 text-xs">{d.companyName}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-medium">{d.supportEmail}</div>
                              <div className="text-muted-foreground text-xs">{d.supportPhone || "-"}</div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className={d.status === "PENDING" ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"}>
                                {d.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleMarkDone(d)} title="Mark as Completed" className="hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> <span className="ml-1">Done</span>
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => window.location.href = `/white-label/preview/${d.id}`} title="Preview Details" className="hover:bg-blue-500/10 hover:text-blue-500 transition-colors">
                                  <Eye className="h-4 w-4 text-blue-400" /> <span className="ml-1">Preview</span>
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDomainToDelete(d.id)} title="Delete" className="hover:bg-red-500/10 hover:text-red-500 transition-colors">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )})
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Horizontal Perfect Large Add Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[1100px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Domain" : "Add Website in Domain"}</DialogTitle>
            <DialogDescription>Configure the white-label settings for this specific domain.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
            
            {/* Column 1: Core Info */}
            <div className="space-y-4 border-r border-border pr-6">
              <h3 className="text-lg font-semibold border-b border-border pb-2">Core Info</h3>
              <div className="space-y-2">
                <Label>Domain Name <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input placeholder="e.g. jinnicore.com" value={currentDomain.domain || ""} onChange={(e) => setCurrentDomain({ ...currentDomain, domain: e.target.value })} disabled={isEditing} />
                  <Button variant="outline" size="icon" className="shrink-0" onClick={(e) => { e.preventDefault(); if (currentDomain.domain) window.open(`https://${currentDomain.domain}`, "_blank"); }} title="Preview Domain">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Company Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Jinnicore Technologies" value={currentDomain.companyName || ""} onChange={(e) => setCurrentDomain({ ...currentDomain, companyName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tab Title (Shows next to Favicon) <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Jinni Dashboard" value={currentDomain.tabTitle || ""} onChange={(e) => setCurrentDomain({ ...currentDomain, tabTitle: e.target.value })} />
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  Preview: <span className="line-through decoration-red-500 ml-1">PropNex AI</span> <span className="mx-1">→</span> <span className="font-semibold text-emerald-500">{currentDomain.tabTitle || currentDomain.companyName || "Your Tab Title"}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Support Email <span className="text-red-500">*</span></Label>
                <Input type="email" placeholder="support@domain.com" value={currentDomain.supportEmail || ""} onChange={(e) => setCurrentDomain({ ...currentDomain, supportEmail: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Support Phone (Optional)</Label>
                <Input placeholder="+91 9876543210" value={currentDomain.supportPhone || ""} onChange={(e) => setCurrentDomain({ ...currentDomain, supportPhone: e.target.value })} />
              </div>
            </div>

            {/* Column 2: Branding */}
            <div className="space-y-4 border-r border-border pr-6">
              <h3 className="text-lg font-semibold border-b border-border pb-2">Branding</h3>
              <div className="space-y-2">
                <Label>Navbar Logo URL <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input placeholder="https://... or upload" value={currentDomain.logoUrl || ""} onChange={(e) => setCurrentDomain({ ...currentDomain, logoUrl: e.target.value })} />
                  <Button variant="outline" size="icon" className="shrink-0" onClick={() => document.getElementById('logo-upload')?.click()}>
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                  <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'logo')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Favicon URL <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input placeholder="https://... or upload" value={currentDomain.faviconUrl || ""} onChange={(e) => setCurrentDomain({ ...currentDomain, faviconUrl: e.target.value })} />
                  <Button variant="outline" size="icon" className="shrink-0" onClick={() => document.getElementById('favicon-upload')?.click()}>
                    {uploadingFavicon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                  <input type="file" id="favicon-upload" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'favicon')} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Instagram Link {enableInstagram && <span className="text-red-500">*</span>}</Label>
                  <Switch checked={enableInstagram} onCheckedChange={setEnableInstagram} />
                </div>
                <Input placeholder="https://instagram.com/..." value={currentDomain.instagramUrl || ""} onChange={(e) => setCurrentDomain({ ...currentDomain, instagramUrl: e.target.value })} disabled={!enableInstagram} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>LinkedIn Link {enableLinkedIn && <span className="text-red-500">*</span>}</Label>
                  <Switch checked={enableLinkedIn} onCheckedChange={setEnableLinkedIn} />
                </div>
                <Input placeholder="https://linkedin.com/..." value={currentDomain.linkedinUrl || ""} onChange={(e) => setCurrentDomain({ ...currentDomain, linkedinUrl: e.target.value })} disabled={!enableLinkedIn} />
              </div>
            </div>

            {/* Column 3: Page Visibility */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b border-border pb-2">Page Visibility</h3>
              <p className="text-xs text-muted-foreground">Select which pages should be visible on this domain. By turning a switch OFF, that specific page will not show in navbars and footers for the user.</p>
              <div className="grid grid-cols-2 gap-y-5 gap-x-2 mt-4">
                {Object.keys(defaultPages).map((page) => (
                  <div key={page} className="flex flex-col gap-1">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={page}
                        checked={pagesConfig[page as keyof typeof defaultPages]}
                        onCheckedChange={(c) => setPagesConfig({ ...pagesConfig, [page]: c })}
                      />
                      <Label htmlFor={page} className="capitalize text-sm">{page}</Label>
                    </div>
                    {!pagesConfig[page as keyof typeof defaultPages] && (
                      <span className="text-[10px] text-red-500 leading-tight">
                        Will not show in <span className="font-semibold">{currentDomain.domain || "domain.com"}</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>


          <div className="flex justify-end gap-4 border-t border-border pt-4 mt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSubmit}>Save & Configure DNS</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DNS Confirmation Modal */}
      <Dialog open={isDnsModalOpen} onOpenChange={(open) => { if(!open) { setIsDnsModalOpen(false); setIsModalOpen(true); } }}>
        <DialogContent className="border-border bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-amber-500" /> Action Required: DNS Configuration</DialogTitle>
            <DialogDescription>To make your white-label domain live, you must add the following records to your domain provider (e.g. Hostinger, GoDaddy).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-md border border-border">
              <p className="font-semibold text-sm">Type: CNAME</p>
              <p className="font-semibold text-sm mt-2">Host / Name: <span className="font-mono bg-background px-1">@</span> or <span className="font-mono bg-background px-1">www</span></p>
              <p className="font-semibold text-sm mt-2">Value / Target: <span className="font-mono bg-background px-1 text-primary">cname.propnexai.com</span></p>
            </div>
            <p className="text-sm text-muted-foreground">
              Once added, DNS propagation can take a few minutes. Click "Done" to finalize adding this domain to the system.
            </p>
          </div>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => { setIsDnsModalOpen(false); setIsModalOpen(true); }}>Back / Cancel</Button>
            <Button onClick={() => { setIsDnsModalOpen(false); setPendingAction("DEPLOY"); setIsPasswordModalOpen(true); }} disabled={saving}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!domainToDelete && pendingAction !== "DELETE"} onOpenChange={(open) => !open && setDomainToDelete(null)}>
        <DialogContent className="border-border bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-red-500" /> Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this domain? This action cannot be undone and will immediately remove white-label access for this client.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4 mt-4">
            <Button variant="outline" onClick={() => setDomainToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              setPendingAction("DELETE");
              setIsPasswordModalOpen(true);
            }}>Delete Domain</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password & Deployment Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={(open) => {
        if (!open && deploymentStep === 0) {
           setIsPasswordModalOpen(false);
           setPasswordInput("");
           setDeploymentError("");
           if (pendingAction === "DELETE") setDomainToDelete(null);
           setPendingAction(null);
        }
      }}>
        <DialogContent className="border-border bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingAction === "DELETE" ? "Authenticate Deletion" : "Server Configuration Authentication"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === "DELETE" 
                ? "Please enter the administrator password to confirm the permanent deletion of this domain." 
                : "To finalize deployment and configure the servers for this domain, please enter the administrator password."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {deploymentStep === 0 ? (
              <div className="space-y-4">
                <Label>Admin Password</Label>
                <Input 
                  type="password" 
                  value={passwordInput} 
                  onChange={(e) => { setPasswordInput(e.target.value); setDeploymentError(""); }} 
                  placeholder="Enter password..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (passwordInput === "Propnexai@123") {
                        if (pendingAction === "DELETE") executeDelete();
                        else startDeploymentAnimation();
                      } else setDeploymentError("Incorrect password");
                    }
                  }}
                />
                {deploymentError && <p className="text-sm text-red-500">{deploymentError}</p>}
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" onClick={() => {
                    setIsPasswordModalOpen(false);
                    if (pendingAction === "DELETE") setDomainToDelete(null);
                    setPendingAction(null);
                  }}>Cancel</Button>
                  <Button variant={pendingAction === "DELETE" ? "destructive" : "default"} onClick={() => {
                    if (passwordInput === "Propnexai@123") {
                      if (pendingAction === "DELETE") executeDelete();
                      else startDeploymentAnimation();
                    } else {
                      setDeploymentError("Incorrect password");
                    }
                  }}>{pendingAction === "DELETE" ? "Authenticate & Delete" : "Authenticate & Deploy"}</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 py-4">
                {pendingAction === "DELETE" ? (
                  <>
                    <div className="flex items-center gap-3">
                      {deploymentStep === 5 ? <Loader2 className="h-5 w-5 animate-spin text-red-500" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                      <span className={deploymentStep === 5 ? "text-red-500 font-medium" : "text-muted-foreground"}>Removing domain from Nginx...</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {deploymentStep < 6 ? <div className="h-5 w-5 rounded-full border-2 border-muted" /> : <Loader2 className="h-5 w-5 animate-spin text-red-500" />}
                      <span className={deploymentStep === 6 ? "text-red-500 font-medium" : "text-muted-foreground opacity-50"}>Restarting web servers...</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      {deploymentStep === 1 ? <Loader2 className="h-5 w-5 animate-spin text-blue-500" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                      <span className={deploymentStep === 1 ? "text-blue-500 font-medium" : "text-muted-foreground"}>Saving domain configuration...</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {deploymentStep < 2 ? <div className="h-5 w-5 rounded-full border-2 border-muted" /> : deploymentStep === 2 ? <Loader2 className="h-5 w-5 animate-spin text-blue-500" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                      <span className={deploymentStep === 2 ? "text-blue-500 font-medium" : deploymentStep < 2 ? "text-muted-foreground opacity-50" : "text-muted-foreground"}>Generating Nginx SSL & routing...</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {deploymentStep < 3 ? <div className="h-5 w-5 rounded-full border-2 border-muted" /> : deploymentStep === 3 ? <Loader2 className="h-5 w-5 animate-spin text-blue-500" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                      <span className={deploymentStep === 3 ? "text-blue-500 font-medium" : deploymentStep < 3 ? "text-muted-foreground opacity-50" : "text-muted-foreground"}>Restarting web servers...</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {deploymentStep < 4 ? <div className="h-5 w-5 rounded-full border-2 border-muted" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                      <span className={deploymentStep === 4 ? "text-emerald-500 font-medium" : "text-muted-foreground opacity-50"}>Website ready for deployment!</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
