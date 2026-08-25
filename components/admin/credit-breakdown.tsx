"use client";

import { useState, useRef } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatNumber } from "@/lib/utils";

export function CreditBreakdown({ companyId, customTrigger }: { companyId: string; customTrigger?: React.ReactNode }) {
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchBreakdown = async () => {
    if (breakdown.length > 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/credits-breakdown`);
      const data = await res.json();
      if (res.ok) {
        setBreakdown(data.breakdown);
        setTotal(data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
    fetchBreakdown();
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200); // 200ms delay before closing
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {customTrigger ? (
          <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {customTrigger}
          </div>
        ) : (
          <button 
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors ml-1"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-4" 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <h4 className="font-semibold mb-2">Credit Breakdown</h4>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : breakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data</p>
        ) : (
          <div className="space-y-2">
            <ul className="space-y-1 text-sm">
              {breakdown.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span className="truncate pr-2">{item.name}</span>
                  <span className="font-mono">{formatNumber(item.creditsRemaining)}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2 border-t flex justify-between font-semibold text-sm">
              <span>Total</span>
              <span className="font-mono">{formatNumber(total)}</span>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
