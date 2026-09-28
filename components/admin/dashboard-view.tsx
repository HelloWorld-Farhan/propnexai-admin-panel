"use client";

import { useEffect, useState, useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { SystemEventsTable } from "./system-events-table";
import { DatabaseVaultWidget } from "./database-vault-widget";

type DashboardStats = {
  totalUsers: number;
  totalInboundNumbers: number;
  totalOutboundNumbers: number;
  totalAiAgents: number;
  totalJobPostings: number;
  totalPartnerForms: number;
  totalDemoCalls: number;
  totalInfraCosts: number;
  activeCompanies: number;
  activeSubCompanies: number;
  lowCreditCount: number;
  lowCreditCompanies: Array<{ id: string; name: string; creditsRemaining: number; isSubCompany: boolean }>;
  todayCalls: number;
  todayInboundCalls: number;
  todayOutboundCalls: number;
  avgCallDuration: number;
  successRate: number;
  activePhoneNumbers: number;
  totalChannels: number;
  connectedIntegrations: number;
  errorIntegrations: number;
  recentCalls: Array<{
    id: string;
    direction: string;
    status: string;
    startedAt: string;
    durationSeconds: number;
    company: { name: string };
    aiAgent: { name: string } | null;
  }>;
};

export function DashboardView({
  initialStats,
}: {
  initialStats: DashboardStats;
}) {
  const [stats, setStats] = useState(initialStats);
  const [callsPage, setCallsPage] = useState(0);

  const refreshStats = useCallback(() => {
    fetch("/api/dashboard", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => undefined);
  }, []);

  // Silent background poll every 10 seconds — no loading state, no flicker
  useEffect(() => {
    const interval = setInterval(refreshStats, 10000);
    return () => clearInterval(interval);
  }, [refreshStats]);


  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Parent</span>
                <span className="font-semibold">{stats.activeCompanies}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sub-companies</span>
                <span className="font-semibold">{stats.activeSubCompanies ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low credit alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold mb-2">{stats.lowCreditCount}</p>
            {stats.lowCreditCount > 0 && (
              <div className="flex flex-col gap-3 border-t pt-3">
                {stats.lowCreditCompanies.some(c => !c.isSubCompany) && (
                  <div>
                    <div className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1.5">Main Companies</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      {stats.lowCreditCompanies.filter(c => !c.isSubCompany).map(c => (
                        <div key={c.id} className="flex items-center gap-1.5">
                          <span className="truncate max-w-[100px]" title={c.name}>{c.name}</span>
                          <span className="text-amber-500 font-medium whitespace-nowrap">{c.creditsRemaining.toFixed(2)} cr</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {stats.lowCreditCompanies.some(c => c.isSubCompany) && (
                  <div>
                    <div className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider mb-1.5">Sub-companies</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      {stats.lowCreditCompanies.filter(c => c.isSubCompany).map(c => (
                        <div key={c.id} className="flex items-center gap-1.5 pl-2 border-l border-amber-500/20">
                          <span className="truncate max-w-[100px] text-muted-foreground" title={c.name}>{c.name}</span>
                          <span className="text-amber-500/80 font-medium whitespace-nowrap">{c.creditsRemaining.toFixed(2)} cr</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Today's calls
              <span className="text-[11px] font-normal opacity-70">
                ({new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date())})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-semibold">{stats.todayCalls}</p>
              <div className="flex gap-2 text-xs">
                <span className="text-muted-foreground"><strong className="text-foreground">{stats.todayInboundCalls}</strong> In</span>
                <span className="text-muted-foreground"><strong className="text-foreground">{stats.todayOutboundCalls}</strong> Out</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <DatabaseVaultWidget />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Total sub-companies" value={stats.activeSubCompanies ?? 0} />
            <Row label="Phone numbers (Inbound)" value={stats.totalInboundNumbers} />
            <Row label="Phone numbers (Outbound)" value={stats.totalOutboundNumbers} />
            <Row label="Agent library" value={stats.totalAiAgents} />
            <Row label="Job postings" value={stats.totalJobPostings} />
            <Row label="Receive user (Total Users)" value={stats.totalUsers} />
            <Row label="Partner form" value={stats.totalPartnerForms} />
            <Row label="Demo calls" value={stats.totalDemoCalls} />
            <Row label="Infra cost notifications" value={stats.totalInfraCosts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Recent calls</span>
              <span className="text-xs font-normal text-muted-foreground">
                {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date())}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentCalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground text-center py-4">
                      No recent calls
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentCalls.slice(callsPage * 10, (callsPage + 1) * 10).map((call) => (
                    <TableRow key={call.id}>
                      <TableCell>
                        <Badge variant="outline" className={call.direction === "INBOUND" ? "border-blue-500/30 text-blue-500" : "border-emerald-500/30 text-emerald-500"}>
                          {call.direction}
                        </Badge>
                      </TableCell>
                      <TableCell>{call.company.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            call.status === "COMPLETED" ? "success" : "secondary"
                          }
                        >
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(new Date(call.startedAt))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {stats.recentCalls.length > 10 && (
              <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCallsPage(p => Math.max(0, p - 1))}
                  disabled={callsPage === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCallsPage(p => p + 1)}
                  disabled={(callsPage + 1) * 10 >= stats.recentCalls.length}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SystemEventsTable />
    </div>
  );
}

function StatCard({
  title,
  value,
  variant = "default",
}: {
  title: string;
  value: number | string;
  variant?: "default" | "warning";
}) {
  return (
    <Card className={variant === "warning" ? "border-amber-500/30" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
