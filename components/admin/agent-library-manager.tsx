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
  useCases: string[];
  defaultType: string;
  estimatedSetupMinutes: number;
  samplePrompt: string;
  defaultFirstMessage: string;
  demoAudioUrl: string;
  isPublished: boolean;
  sortOrder: number;
  totalVoices: number;
  _count: { deployedAgents: number };
};

const emptyForm = {
  slug: "",
  name: "",
  profile: "",
  category: "",
  useCases: "",
  defaultType: "INBOUND",
  estimatedSetupMinutes: 5,
  samplePrompt: "",
  defaultFirstMessage: "",
  demoAudioUrl: "",
  isPublished: true,
  sortOrder: 0,
  totalVoices: 10,
};

export function AgentLibraryManager({ entries }: { entries: AgentEntry[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const columns: ColumnDef<AgentEntry>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "slug", header: "Slug" },
    { accessorKey: "category", header: "Category" },
  {
      accessorKey: "defaultType",
      header: "Type",
    },
    {
      accessorKey: "isPublished",
      header: "Published",
      cell: ({ row }) => (
        <Badge variant={row.original.isPublished ? "success" : "secondary"}>
          {row.original.isPublished ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      id: "totalVoices",
      header: "Total Voices",
      cell: ({ row }) => row.original.totalVoices,
    },
    {
      id: "assigned",
      header: "Assigned",
      cell: ({ row }) => row.original._count.deployedAgents,
    },
    {
      id: "available",
      header: "Available",
      cell: ({ row }) => row.original.totalVoices - row.original._count.deployedAgents,
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
              void handleDelete(row.original.id);
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
    setOpen(true);
  }

  function openEdit(entry: AgentEntry & {
    profile?: string;
    useCases?: string[];
    samplePrompt?: string;
    defaultFirstMessage?: string;
    demoAudioUrl?: string;
    estimatedSetupMinutes?: number;
  }) {
    setEditingId(entry.id);
    setForm({
      slug: entry.slug,
      name: entry.name,
      profile: entry.profile ?? "",
      category: entry.category,
      useCases: (entry.useCases ?? []).join(", "),
      defaultType: entry.defaultType,
      estimatedSetupMinutes: entry.estimatedSetupMinutes ?? 5,
      samplePrompt: entry.samplePrompt ?? "",
      defaultFirstMessage: entry.defaultFirstMessage ?? "",
      demoAudioUrl: entry.demoAudioUrl ?? "",
      isPublished: entry.isPublished,
      sortOrder: entry.sortOrder,
      totalVoices: entry.totalVoices ?? 10,
    });
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      ...form,
      useCases: form.useCases
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      estimatedSetupMinutes: Number(form.estimatedSetupMinutes),
      sortOrder: Number(form.sortOrder),
    };

    const res = await fetch("/api/agents", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
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

  async function handleDelete(id: string) {
    if (!confirm("Delete this library entry?")) return;
    const res = await fetch(`/api/agents?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return toast.error(data.error ?? "Failed to delete");
    }
    toast.success("Agent deleted");
    router.refresh();
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
                  <Label>Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    disabled={!!editingId}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name (Card Heading)</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category (Bottom Left Box)</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Use cases (Card Subheading, comma-separated)</Label>
                  <Input
                    value={form.useCases}
                    onChange={(e) => setForm({ ...form, useCases: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default type (Bottom Right Box)</Label>
                  <Select
                    value={form.defaultType}
                    onValueChange={(value) => setForm({ ...form, defaultType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INBOUND">INBOUND</SelectItem>
                      <SelectItem value="OUTBOUND">OUTBOUND</SelectItem>
                      <SelectItem value="HYBRID">HYBRID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Total Voices</Label>
                    <Input
                      type="number"
                      value={form.totalVoices}
                      onChange={(e) =>
                        setForm({ ...form, totalVoices: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sort order</Label>
                    <Input
                      type="number"
                      value={form.sortOrder}
                      onChange={(e) =>
                        setForm({ ...form, sortOrder: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Published</Label>
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
                  <Label>Profile / Info (Card Description)</Label>
                  <Textarea
                    className="h-16 min-h-[64px]"
                    value={form.profile}
                    onChange={(e) => setForm({ ...form, profile: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Sample prompt</Label>
                  <Textarea
                    className="h-16 min-h-[64px]"
                    value={form.samplePrompt}
                    onChange={(e) => setForm({ ...form, samplePrompt: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Default first message</Label>
                  <Textarea
                    className="h-16 min-h-[64px]"
                    value={form.defaultFirstMessage}
                    onChange={(e) =>
                      setForm({ ...form, defaultFirstMessage: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Demo audio URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.demoAudioUrl}
                      onChange={(e) => setForm({ ...form, demoAudioUrl: e.target.value })}
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
    </div>
  );
}
