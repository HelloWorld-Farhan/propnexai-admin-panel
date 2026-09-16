"use client";

import { useState } from "react";
import { format, addMonths } from "date-fns";
import { Plus, Trash2, Edit2, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NotificationModal } from "./NotificationModal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Compute next start/end dates based on recurrence type */
function getNextDates(item: any): { nextStart: Date; nextEnd: Date } | null {
  if (item.recurrenceType === "ONCE") return null;
  const parts = item.recurrenceType.split("_");
  const interval = parseInt(parts[1]) || 1;
  const nextStart = addMonths(new Date(item.startDate), interval);
  const nextEnd = addMonths(new Date(item.endDate), interval);
  return { nextStart, nextEnd };
}

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

      {/* No overflow-x-auto — table stays within bounds, tooltip goes above */}
      <Card className="border border-border/40">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/40">
            <tr>
              <th className="px-4 py-3 font-medium w-[22%]">Target</th>
              <th className="px-4 py-3 font-medium w-[26%]">Date Range</th>
              <th className="px-4 py-3 font-medium">Message</th>
              <th className="px-4 py-3 font-medium text-right w-[220px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.map((item) => {
              const isBlocked = item.recurrenceType === "ONCE";
              const nextDates = getNextDates(item);

              // Tooltip text — for blocked: why it can't shift; for active: exact next dates
              const tooltipLines: string[] = isBlocked
                ? ["One-time notification", "Cannot shift to next schedule"]
                : nextDates
                ? [
                    "Shift to next cycle:",
                    `From: ${format(nextDates.nextStart, "MMM d, yyyy")}`,
                    `To:     ${format(nextDates.nextEnd, "MMM d, yyyy")}`,
                  ]
                : ["Move to next occurrence"];

              return (
                <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                  {/* Target */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground truncate">{item.companyName || "N/A"}</div>
                    {item.subCompanyName && (
                      <div className="text-xs text-muted-foreground truncate">{item.subCompanyName}</div>
                    )}
                    <div className="text-xs text-primary/70 truncate">{item.email}</div>
                  </td>

                  {/* Date Range */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs">{format(new Date(item.startDate), "MMM d, yyyy h:mm a")}</span>
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

                  {/* Message */}
                  <td className="px-4 py-3">
                    <div className="truncate text-sm cursor-help max-w-[200px]" title={item.message}>
                      {item.message || "No message provided."}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Shift button with tooltip ABOVE — no right overflow */}
                      <div className="relative group inline-flex">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => !isBlocked && handleSkip(item.id)}
                          className={`text-xs transition-all duration-200 select-none ${
                            isBlocked
                              ? "opacity-40 cursor-not-allowed border-dashed border-muted-foreground/40 text-muted-foreground/60 bg-transparent hover:bg-transparent hover:border-muted-foreground/40 hover:text-muted-foreground/60 line-through"
                              : ""
                          }`}
                          disabled={skippingId === item.id}
                        >
                          {skippingId === item.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                          Shift to next schedule
                        </Button>

                        {/* Tooltip — appears ABOVE the button, centered, no horizontal overflow */}
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[9999] opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          {/* Down arrow */}
                          <div className={`absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent ${
                            isBlocked ? "border-t-red-500" : "border-t-zinc-700"
                          }`} />
                          <div className={`rounded-md px-2.5 py-2 text-[11px] font-medium leading-snug shadow-xl whitespace-nowrap ${
                            isBlocked
                              ? "bg-red-500 text-white"
                              : "bg-zinc-800 text-zinc-100 border border-zinc-600"
                          }`}>
                            {tooltipLines.map((line, i) => (
                              <div key={i} className={i === 0 ? "font-semibold" : "opacity-80 mt-0.5"}>
                                {line}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

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
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No infrastructure cost notifications found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
