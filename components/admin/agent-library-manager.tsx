"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/admin/data-table";
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

function getPlayableAudioUrl(url: string) {
  if (!url) return "";
  const driveRegex = /drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/;
  const match = url.match(driveRegex);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return url;
}

export function AgentLibraryManager({ entries }: { entries: AgentEntry[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const columns: ColumnDef<AgentEntry>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "category", header: "Work" },
    {
      accessorKey: "isPublished",
      header: "Active",
      cell: ({ row }) => (
        <Badge variant={row.original.isPublished ? "success" : "secondary"}>
          {row.original.isPublished ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      accessorKey: "demoAudioUrl",
      header: "Voice Link",
      cell: ({ row }) => {
        const url = row.original.demoAudioUrl;
        if (!url) return <span className="text-muted-foreground">—</span>;
        return (
          <audio 
            controls 
            src={getPlayableAudioUrl(url)} 
            className="h-9 w-[200px]"
            preload="metadata"
          />
        );
      },
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
    const res = await fetch("/api/agents", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
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
    const res = await fetch(`/api/agents?id=${deleteId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to delete");
    } else {
      toast.success("Agent deleted");
      router.refresh();
    }
    setDeleteId(null);
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
                  <Input
                    value={form.voice}
                    onChange={(e) => {
                      setForm({ ...form, voice: e.target.value });
                      if (errors.voice) setErrors({ ...errors, voice: "" });
                    }}
                  />
                  {errors.voice && <p className="text-sm text-red-500">{errors.voice}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Active Status</Label>
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
                      <Button type="button" variant="secondary" className="w-[100px]">Upload</Button>
                      <input 
                        type="file" 
                        accept="audio/*,video/mp4" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error("File is too large. Please upload a file smaller than 5MB.");
                            return;
                          }
                          
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const base64Data = (ev.target?.result as string).split(",")[1];
                            const toastId = toast.loading("Uploading to Google Drive...");
                            try {
                              const res = await fetch("/api/upload-audio", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ 
                                  fileData: base64Data, 
                                  fileName: file.name,
                                  mimeType: file.type 
                                })
                              });
                              if (!res.ok) throw new Error("Upload failed");
                              const data = await res.json();
                              setForm({ ...form, demoAudioUrl: data.url });
                              if (errors.demoAudioUrl) setErrors({ ...errors, demoAudioUrl: "" });
                              toast.success("Uploaded successfully!", { id: toastId });
                            } catch (err) {
                              toast.error("Upload failed", { id: toastId });
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Uploads must be smaller than 5MB.</p>
                  {errors.demoAudioUrl && <p className="text-sm text-red-500">{errors.demoAudioUrl}</p>}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={entries} searchKey="name" searchPlaceholder="Search agents..." />

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
