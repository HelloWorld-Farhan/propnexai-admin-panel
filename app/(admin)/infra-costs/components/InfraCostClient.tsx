"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Edit2, Calendar, FastForward, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NotificationModal } from "./NotificationModal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function InfraCostClient({ initialData }: { initialData: any[] }) {
  const [data, setData] = useState(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [skippingId, setSkippingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/infra-costs/${itemToDelete}`, { method: "DELETE" });
      if (res.ok) {
        setData(data.filter((d) => d.id !== itemToDelete));
        setItemToDelete(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSkip = async (id: string) => {
    setSkippingId(id);
    try {
      const res = await fetch(`/api/infra-costs/${id}/skip`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setData(data.map((d) => (d.id === id ? updated : d)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSkippingId(null);
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
                <th className="px-4 py-3 font-medium">Message</th>
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
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {format(new Date(item.startDate), "MMM d, yyyy h:mm a")}
                      </div>
                      <div className="flex items-center ml-5">
                        <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500 uppercase tracking-wide">
                          {item.recurrenceType.replace(/_/g, " ")}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground ml-5">
                        to {format(new Date(item.endDate), "MMM d, yyyy h:mm a")}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[250px]">
                    <div 
                      className="truncate cursor-help" 
                      title={item.message}
                    >
                      {item.message || "No message provided."}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(() => {
                        const isBlocked = item.recurrenceType === "ONCE";
                        const tooltipText = isBlocked
                          ? "Not available for one-time notifications. Only recurring schedules (Daily, Weekly, Monthly) can be shifted to the next occurrence."
                          : "Skip the current schedule window and move this notification to the next occurrence date.";
                        return (
                          <div
                            className="relative group"
                            title={tooltipText}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => !isBlocked && handleSkip(item.id)}
                              className={`text-xs mr-2 transition-all duration-200 ${
                                isBlocked
                                  ? "opacity-35 cursor-not-allowed border-dashed border-muted-foreground/30 text-muted-foreground bg-transparent hover:bg-transparent hover:border-muted-foreground/30 hover:text-muted-foreground line-through decoration-muted-foreground/50"
                                  : ""
                              }`}
                              disabled={skippingId === item.id}
                            >
                              {skippingId === item.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                              Shift to next schedule
                            </Button>
                            {/* Tooltip */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:flex">
                              <div className={`max-w-[220px] rounded-md px-2.5 py-1.5 text-[11px] leading-snug shadow-lg text-center whitespace-normal ${
                                isBlocked
                                  ? "bg-destructive/90 text-destructive-foreground"
                                  : "bg-popover text-popover-foreground border border-border"
                              }`}>
                                {tooltipText}
                                {/* Arrow */}
                                <div className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${
                                  isBlocked ? "border-t-destructive/90" : "border-t-popover"
                                }`} />
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEdit(item)} 
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Edit Notification"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setItemToDelete(item.id)} 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Delete Notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
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

      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Notification</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this notification? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setItemToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
