"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export function NotificationModal({ isOpen, onClose, editingItem, onSaved }: any) {
  const [loading, setLoading] = useState(false);
  const [autofillLoading, setAutofillLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    companyName: "",
    subCompanyName: "",
    companyId: "",
    subCompanyId: "",
    startDate: "",
    endDate: "",
    recurrenceType: "ONCE",
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        email: editingItem.email || "",
        companyName: editingItem.companyName || "",
        subCompanyName: editingItem.subCompanyName || "",
        companyId: editingItem.companyId || "",
        subCompanyId: editingItem.subCompanyId || "",
        startDate: editingItem.startDate ? format(new Date(editingItem.startDate), "yyyy-MM-dd'T'HH:mm") : "",
        endDate: editingItem.endDate ? format(new Date(editingItem.endDate), "yyyy-MM-dd'T'HH:mm") : "",
        recurrenceType: editingItem.recurrenceType || "ONCE",
      });
    } else {
      setFormData({
        email: "",
        companyName: "",
        subCompanyName: "",
        companyId: "",
        subCompanyId: "",
        startDate: "",
        endDate: "",
        recurrenceType: "ONCE",
      });
    }
  }, [editingItem, isOpen]);

  const handleAutofill = async (queryParam: string, value: string) => {
    if (!value || value.length < 3) return;
    setAutofillLoading(true);
    try {
      const res = await fetch(`/api/infra-costs/autofill?${queryParam}=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (data && data.companyId) {
        setFormData((prev) => ({
          ...prev,
          companyId: data.companyId,
          subCompanyId: data.subCompanyId || "",
          companyName: data.companyName || "",
          subCompanyName: data.subCompanyName || "",
          email: data.email || prev.email,
        }));
      }
    } catch (err) {
      console.error("Autofill failed", err);
    } finally {
      setAutofillLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const url = editingItem ? `/api/infra-costs/${editingItem.id}` : "/api/infra-costs";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
        }),
      });
      
      if (res.ok) {
        const saved = await res.json();
        onSaved(saved);
      } else {
        alert("Failed to save notification");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg rounded-xl border shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{editingItem ? "Edit Notification" : "New Notification"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          
          <div className="space-y-4 bg-muted/20 p-4 rounded-lg border">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" /> Target Selection (Auto-fill)
              {autofillLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Email</Label>
                <Input 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={(e) => handleAutofill("email", e.target.value)}
                  placeholder="Enter email to autofill..." 
                />
              </div>
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input 
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  onBlur={(e) => handleAutofill("companyName", e.target.value)}
                  placeholder="Search by company name..." 
                />
              </div>
            </div>
            
            {formData.subCompanyName && (
              <div className="space-y-2">
                <Label>Matched Sub-Company</Label>
                <Input value={formData.subCompanyName} disabled className="bg-muted" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date & Time</Label>
              <Input 
                type="datetime-local" 
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>End Date & Time</Label>
              <Input 
                type="datetime-local" 
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Recurrence Cycle</Label>
            <Select 
              value={formData.recurrenceType} 
              onValueChange={(val) => setFormData({ ...formData, recurrenceType: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Recurrence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ONCE">Once</SelectItem>
                <SelectItem value="EVERY_1_MONTH">Every 1 Month</SelectItem>
                <SelectItem value="EVERY_2_MONTHS">Every 2 Months</SelectItem>
                <SelectItem value="EVERY_6_MONTHS">Every 6 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </form>
        
        <div className="p-4 border-t flex justify-end gap-2 bg-muted/10">
          <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.companyId || !formData.startDate || !formData.endDate}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Notification
          </Button>
        </div>
      </div>
    </div>
  );
}
