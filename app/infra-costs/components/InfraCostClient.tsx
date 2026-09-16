"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Edit2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NotificationModal } from "./NotificationModal";

export function InfraCostClient({ initialData }: { initialData: any[] }) {
  const [data, setData] = useState(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;
    try {
      const res = await fetch(`/api/infra-costs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setData(data.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleOpenNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Notification
        </Button>
      </div>

      <Card className="overflow-hidden border border-border/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/40">
              <tr>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Date Range</th>
                <th className="px-4 py-3 font-medium">Recurrence</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{item.companyName || "N/A"}</div>
                    {item.subCompanyName && (
                      <div className="text-xs text-muted-foreground">{item.subCompanyName}</div>
                    )}
                    <div className="text-xs text-primary/70">{item.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(item.startDate), "MMM d, yyyy HH:mm")}
                    </div>
                    <div className="text-xs text-muted-foreground ml-5">
                      to {format(new Date(item.endDate), "MMM d, yyyy HH:mm")}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-500">
                      {item.recurrenceType.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.pausedUntil && new Date(item.pausedUntil) > new Date() ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500">
                        Paused until {format(new Date(item.pausedUntil), "MMM d")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-500">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No infrastructure cost notifications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <NotificationModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        editingItem={editingItem}
        onSaved={(newItem: any) => {
          if (editingItem) {
            setData(data.map((d) => (d.id === newItem.id ? newItem : d)));
          } else {
            setData([newItem, ...data]);
          }
          setModalOpen(false);
        }}
      />
    </div>
  );
}
