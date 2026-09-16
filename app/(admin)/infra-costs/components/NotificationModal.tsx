"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function getNextDateFromDay(day: number, isEndDate: boolean, startMonthOffset = 0): Date {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + startMonthOffset;
  
  // If the day has already passed this month, bump to next month
  // Exception: if it's the end date, we evaluate if it needs to wrap to next month
  if (!isEndDate && day < now.getDate()) {
    month += 1;
  }
  
  if (month > 11) {
    year += Math.floor(month / 12);
    month = month % 12;
  }
  
  // Handle end of month wrapping (e.g. Feb 30 -> Mar 2)
  const targetDay = Math.min(day, new Date(year, month + 1, 0).getDate());
  const date = new Date(year, month, targetDay);

  if (isEndDate) {
    // End date always exactly at 12:00 AM (midnight) of that day
    date.setHours(0, 0, 0, 0);
  } else {
    // Start date logic
    if (year === now.getFullYear() && month === now.getMonth() && targetDay === now.getDate()) {
      // If it's scheduled for TODAY, use the exact current time (real-time)
      date.setHours(now.getHours(), now.getMinutes(), 0, 0);
    } else {
      // If it's scheduled for a FUTURE date, always start at 10:00 AM
      date.setHours(10, 0, 0, 0);
    }
  }

  return date;
}

export function NotificationModal({ isOpen, onClose, editingItem, onSaved }: any) {
  const [loading, setLoading] = useState(false);
  const [autofillLoading, setAutofillLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    companyName: "",
    subCompanyName: "",
    companyId: "",
    subCompanyId: "",
    startDay: "",
    endDay: "",
    recurrenceType: "ONCE",
    customMonth: "",
    message: "",
  });

  const [targetError, setTargetError] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        email: editingItem.email || "",
        companyName: editingItem.companyName || "",
        subCompanyName: editingItem.subCompanyName || "",
        companyId: editingItem.companyId || "",
        subCompanyId: editingItem.subCompanyId || "",
        startDay: editingItem.startDate ? new Date(editingItem.startDate).getDate().toString() : "",
        endDay: editingItem.endDate ? new Date(editingItem.endDate).getDate().toString() : "",
        recurrenceType: editingItem.recurrenceType?.startsWith("EVERY_") && !["EVERY_1_MONTH", "EVERY_2_MONTHS", "EVERY_6_MONTHS"].includes(editingItem.recurrenceType) ? "OTHER" : (editingItem.recurrenceType || "ONCE"),
        customMonth: editingItem.recurrenceType?.startsWith("EVERY_") && !["EVERY_1_MONTH", "EVERY_2_MONTHS", "EVERY_6_MONTHS"].includes(editingItem.recurrenceType) ? editingItem.recurrenceType.split("_")[1] : "",
        message: editingItem.message || "",
      });
      setTargetError(null);
    } else {
      setFormData({
        email: "",
        companyName: "",
        subCompanyName: "",
        companyId: "",
        subCompanyId: "",
        startDay: "",
        endDay: "",
        recurrenceType: "ONCE",
        customMonth: "",
        message: "",
      });
      setTargetError(null);
    }
  }, [editingItem, isOpen]);

  const handleAutofill = async (queryParam: string, value: string) => {
    if (!value || value.length < 3) return;
    setAutofillLoading(true);
    setTargetError(null);
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
      } else {
        setFormData(prev => ({ ...prev, companyId: "", subCompanyId: "" }));
        setTargetError("No matching active company found for this email/name.");
      }
    } catch (err) {
      console.error("Autofill failed", err);
      setFormData(prev => ({ ...prev, companyId: "", subCompanyId: "" }));
      setTargetError("Failed to verify target. Please try again.");
    } finally {
      setAutofillLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyId) {
      setTargetError("Valid company target is required.");
      return;
    }
    
    setLoading(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const url = editingItem ? `/api/infra-costs/${editingItem.id}` : "/api/infra-costs";
      
      const sDay = parseInt(formData.startDay);
      const eDay = parseInt(formData.endDay);
      
      const startDate = getNextDateFromDay(sDay, false);
      // If end day is smaller than start day, it naturally falls into the next month
      const monthOffset = eDay < sDay ? 1 : 0;
      const endDate = getNextDateFromDay(eDay, true, monthOffset);

      const finalRecurrence = formData.recurrenceType === "OTHER" 
        ? `EVERY_${formData.customMonth}_MONTHS` 
        : formData.recurrenceType;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          recurrenceType: finalRecurrence,
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

  const isFormValid = formData.companyId && formData.startDay && formData.endDay && formData.message.trim().length > 0 && (formData.recurrenceType !== "OTHER" || formData.customMonth);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-3xl rounded-xl border shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{editingItem ? "Edit Notification" : "New Notification"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} type="button"><X className="h-4 w-4" /></Button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
          
          {/* Left Column */}
          <div className="space-y-4">
          
          <div className="space-y-4 bg-muted/20 p-4 rounded-lg border">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" /> Target Selection (Auto-fill)
              {autofillLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Email <span className="text-destructive">*</span></Label>
                <Input 
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setTargetError(null);
                  }}
                  onBlur={(e) => handleAutofill("email", e.target.value)}
                  placeholder="Enter email..." 
                  required={!formData.companyName}
                />
              </div>
              <div className="space-y-2">
                <Label>Company Name <span className="text-destructive">*</span></Label>
                <Input 
                  value={formData.companyName}
                  onChange={(e) => {
                    setFormData({ ...formData, companyName: e.target.value });
                    setTargetError(null);
                  }}
                  onBlur={(e) => handleAutofill("companyName", e.target.value)}
                  placeholder="Search name..." 
                  required={!formData.email}
                />
              </div>
            </div>
            
            {formData.subCompanyName && (
              <div className="space-y-2">
                <Label>Matched Sub-Company</Label>
                <Input value={formData.subCompanyName} disabled className="bg-muted" />
              </div>
            )}
            
            {targetError && (
              <p className="text-sm text-destructive font-medium mt-2">{targetError}</p>
            )}
            {formData.companyId && !targetError && (
              <p className="text-sm text-emerald-500 font-medium mt-2">Target successfully validated.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Day (1-27) <span className="text-destructive">*</span></Label>
              <Input 
                type="number"
                min="1"
                max="27"
                value={formData.startDay}
                onChange={(e) => setFormData({ ...formData, startDay: e.target.value })}
                placeholder="e.g. 27"
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>End Day (1-27) <span className="text-destructive">*</span></Label>
              <Input 
                type="number"
                min="1"
                max="27"
                value={formData.endDay}
                onChange={(e) => setFormData({ ...formData, endDay: e.target.value })}
                placeholder="e.g. 2"
                required 
              />
            </div>
          </div>
          {(!formData.startDay || !formData.endDay) && (
            <p className="text-xs text-destructive">Both Start Day and End Day are required.</p>
          )}
          </div>

          {/* Right Column */}
          <div className="space-y-4 flex flex-col">
            <div className="space-y-2 flex-grow">
            <Label>Notification Message <span className="text-destructive">*</span></Label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter a short message to display on the main website..."
              maxLength={150}
              required
              className="flex min-h-[160px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {formData.message.trim().length === 0 && (
              <p className="text-xs text-destructive">Message is required and cannot be empty.</p>
            )}
            <p className="text-xs text-muted-foreground text-right">{formData.message.length}/150 characters</p>
          </div>

          <div className="space-y-2">
            <Label>Recurrence Cycle <span className="text-destructive">*</span></Label>
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
                <SelectItem value="OTHER">Other (Custom)</SelectItem>
              </SelectContent>
            </Select>
            
            {formData.recurrenceType === "OTHER" && (
              <div className="pt-2">
                <Label>Number of Months <span className="text-destructive">*</span></Label>
                <Input 
                  type="number"
                  min="1"
                  value={formData.customMonth}
                  onChange={(e) => setFormData({ ...formData, customMonth: e.target.value })}
                  placeholder="e.g. 3 for Every 3 Months"
                  required 
                />
                {!formData.customMonth && (
                  <p className="text-xs text-destructive mt-1">Please specify the custom month cycle.</p>
                )}
              </div>
            )}
          </div>
        </div>
        </form>
        
        <div className="p-4 border-t flex justify-end gap-2 bg-muted/10">
          <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !isFormValid || !!targetError}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Notification
          </Button>
        </div>
      </div>
    </div>
  );
}
