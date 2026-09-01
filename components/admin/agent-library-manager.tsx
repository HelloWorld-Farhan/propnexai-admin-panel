"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/admin/data-table";
import { Loader2, Info } from "lucide-react";
import { AdminVoiceAudioPlayer } from "./voice-audio-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import type { ColumnDef } from "@tanstack/react-table";

type AgentEntry = {
  id: string;
  slug: string;
  name: string;
  profile: string;
  category: string;
  tone: string;
  language: string;
  voice: string;
  bestFor: string;
  demoAudioUrl: string;
  isPublished: boolean;
  assignedByName?: string | null;
  assignedByEmail?: string | null;
  assignedByPhone?: string | null;
};

const emptyForm = {
  slug: "",
  name: "",
  profile: "",
  category: "",
  tone: "",
  language: "",
  voice: "",
  bestFor: "",
  demoAudioUrl: "",
  isPublished: true,
};

const getPlayableAudioUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    return `/api/audio-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
};

export function AgentLibraryManager({ entries }: { entries: AgentEntry[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const columns: ColumnDef<AgentEntry>[] = [
    { accessorKey: "name", header: "Name" },
    { 
      accessorKey: "category", 
      header: "Work",
      cell: ({ row }) => (
        <span>{row.original.category}</span>
      )
    },
    {
      accessorKey: "isPublished",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant={row.original.isPublished ? "success" : "secondary"}>
            {row.original.isPublished ? "Yes" : "No"}
          </Badge>
          {row.original.isPublished && row.original.assignedByEmail && (
            <div 
              title={`Assigned by: ${row.original.assignedByName || "User"}\nEmail: ${row.original.assignedByEmail}\nPhone: ${row.original.assignedByPhone || "N/A"}`}
              className="text-zinc-400 hover:text-white transition-colors cursor-help"
            >
              <Info className="h-4 w-4" />
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "demoAudioUrl",
      header: "Voice Link",
      cell: ({ row }) => {
        const url = row.original.demoAudioUrl;
        const voiceChar = row.original.voice?.toLowerCase().startsWith('m') ? '(M)' : row.original.voice?.toLowerCase().startsWith('f') ? '(F)' : '';
        if (!url) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-2">
            {voiceChar && <span className="text-sm text-zinc-400">{voiceChar}</span>}
            <AdminVoiceAudioPlayer src={url} />
          </div>
        );
      },
    },
    {
      accessorKey: "bestFor",
      header: "Best For",
      cell: ({ row }) => <span>{row.original.bestFor || "Inbound"}</span>
    },
    {
      accessorKey: "language",
      header: "Language",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.language || "English"}</span>
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row.original);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(row.original.id);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setOpen(true);
  }

  function openEdit(entry: AgentEntry) {
    setEditingId(entry.id);
    setForm({
      slug: entry.slug,
      name: entry.name,
      profile: entry.profile ?? "",
      category: entry.category,
      tone: entry.tone ?? "",
      language: entry.language ?? "",
      voice: entry.voice ?? "",
      bestFor: entry.bestFor ?? "",
      demoAudioUrl: entry.demoAudioUrl ?? "",
      isPublished: entry.isPublished,
    });
    setErrors({});
    setOpen(true);
  }

  function validateForm() {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name cannot be empty";
    if (!form.category.trim()) newErrors.category = "Company Occupation cannot be empty";
    if (!form.profile.trim()) newErrors.profile = "Company Info cannot be empty";
    if (!form.tone.trim()) newErrors.tone = "Tone cannot be empty";
    if (!form.language.trim()) newErrors.language = "Language cannot be empty";
    if (!form.voice.trim()) newErrors.voice = "Voice cannot be empty";
    if (!form.bestFor.trim()) newErrors.bestFor = "Best for cannot be empty";
    if (!form.demoAudioUrl.trim()) newErrors.demoAudioUrl = "You must provide a link or upload an audio recording";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;

    setSaving(true);
    const dataToSend = {
      ...form,
      slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    };
    const res = await fetch("/api/agents", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...dataToSend } : dataToSend),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return toast.error(data.error ?? "Failed to save");
    }

    toast.success(editingId ? "Agent updated" : "Agent created");
    setOpen(false);
    router.refresh();
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    const targetId = deleteId;
    setDeleteId(null);

    const res = await fetch(`/api/agents?id=${targetId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to delete");
    } else {
      toast.success("Agent deleted");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>Add agent</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit library agent" : "Add library agent"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Name of Company</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      if (!editingId) {
                        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                        setForm({ ...form, name, slug });
                      } else {
                        setForm({ ...form, name });
                      }
                      if (errors.name) setErrors({ ...errors, name: "" });
                    }}
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label>Company Occupation</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => {
                      setForm({ ...form, category: e.target.value });
                      if (errors.category) setErrors({ ...errors, category: "" });
                    }}
                  />
                  {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Input
                    value={form.tone}
                    onChange={(e) => {
                      setForm({ ...form, tone: e.target.value });
                      if (errors.tone) setErrors({ ...errors, tone: "" });
                    }}
                  />
                  {errors.tone && <p className="text-sm text-red-500">{errors.tone}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Input
                    value={form.language}
                    onChange={(e) => {
                      setForm({ ...form, language: e.target.value });
                      if (errors.language) setErrors({ ...errors, language: "" });
                    }}
                  />
                  {errors.language && <p className="text-sm text-red-500">{errors.language}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Voice</Label>
                  <Select
                    value={form.voice || ""}
                    onValueChange={(value) => {
                      setForm({ ...form, voice: value });
                      if (errors.voice) setErrors({ ...errors, voice: "" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.voice && <p className="text-sm text-red-500">{errors.voice}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.isPublished ? "yes" : "no"}
                    onValueChange={(value) =>
                      setForm({ ...form, isPublished: value === "yes" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Company Info</Label>
                  <Textarea
                    className="h-32 min-h-[128px]"
                    value={form.profile}
                    onChange={(e) => {
                      setForm({ ...form, profile: e.target.value });
                      if (errors.profile) setErrors({ ...errors, profile: "" });
                    }}
                  />
                  {errors.profile && <p className="text-sm text-red-500">{errors.profile}</p>}
                </div>

                <div className="space-y-1">
                  <Label>Best For</Label>
                  <Textarea
                    className="h-24 min-h-[96px]"
                    value={form.bestFor}
                    onChange={(e) => {
                      setForm({ ...form, bestFor: e.target.value });
                      if (errors.bestFor) setErrors({ ...errors, bestFor: "" });
                    }}
                  />
                  {errors.bestFor && <p className="text-sm text-red-500">{errors.bestFor}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Demo audio URL (Link or Upload)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.demoAudioUrl}
                      placeholder="https://..."
                      onChange={(e) => {
                        setForm({ ...form, demoAudioUrl: e.target.value });
                        if (errors.demoAudioUrl) setErrors({ ...errors, demoAudioUrl: "" });
                      }}
                    />
                    <div className="relative">
                      <Button type="button" variant="secondary" className="w-[100px]" disabled={isUploading}>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
                      </Button>
                      <input 
                        type="file" 
                        accept="audio/*,video/mp4" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={isUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          if (file.size > 50 * 1024 * 1024) {
                            toast.error("File is too large. Please upload a file smaller than 50MB.");
                            return;
                          }
                          
                          setIsUploading(true);
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const base64Data = (ev.target?.result as string).split(",")[1];
                            try {
                              const urlRes = await fetch("/api/upload-audio");
                              const { url: webhookUrl } = await urlRes.json();
                              if (!webhookUrl) throw new Error("Webhook URL not found");

                              const res = await fetch(webhookUrl, {
                                method: "POST",
                                headers: { "Content-Type": "text/plain" },
                                body: JSON.stringify({ 
                                  type: "upload_agent_audio",
                                  fileData: base64Data, 
                                  fileName: file.name,
                                  mimeType: file.type 
                                })
                              });
                              if (!res.ok) throw new Error("Upload failed");
                              const data = await res.json();
                              if (data.status === "error") throw new Error(data.message);
                              
                              const finalUrl = data.message?.url || data.url;
                              setForm({ ...form, demoAudioUrl: finalUrl });
                              if (errors.demoAudioUrl) setErrors({ ...errors, demoAudioUrl: "" });
                              toast.success("Uploaded successfully!");
                            } catch (err) {
                              toast.error("Upload failed");
                            } finally {
                              setIsUploading(false);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Uploads must be smaller than 50MB.</p>
                  {errors.demoAudioUrl && <p className="text-sm text-red-500">{errors.demoAudioUrl}</p>}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white min-w-[80px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={entries} searchKeys={["name", "category", "profile"]} searchPlaceholder="Search by name or work..." />

      <Dialog open={!!deleteId} onOpenChange={(val) => !val && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-zinc-400">Are you sure you want to delete this agent? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
