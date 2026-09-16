"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
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

type DashboardStats = {
  activeCompanies: number;
  activeSubCompanies: number;
  lowCreditCount: number;
  lowCreditCompanies: Array<{ id: string; name: string; creditsRemaining: number }>;
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
  recentEvents: Array<{
    id: string;
    type: string;
    title: string;
    createdAt: string;
    company: { name: string };
  }>;
};

export function DashboardView({
  initialStats,
}: {
  initialStats: DashboardStats;
}) {
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/dashboard")
        .then((res) => res.json())
        .then((data) => setStats(data))
        .catch(() => undefined);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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
        <Card className={stats.lowCreditCount > 0 ? "border-amber-500/30 bg-amber-500/5" : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low credit alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.lowCreditCount}</p>
            {stats.lowCreditCount > 0 && (
              <div className="mt-2 text-xs flex flex-col gap-1 border-t pt-2 border-amber-500/20">
                {stats.lowCreditCompanies.map(c => (
                  <div key={c.id} className="flex justify-between items-center">
                    <span className="truncate pr-2">{c.name}</span>
                    <span className="text-amber-500 font-medium whitespace-nowrap">{c.creditsRemaining.toFixed(2)} cr</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's calls
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
        <StatCard title="Call success rate" value={`${stats.successRate}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connection & traffic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Active phone numbers" value={stats.activePhoneNumbers} />
            <Row label="Total configured channels" value={stats.totalChannels} />
            <Row label="Connected integrations" value={stats.connectedIntegrations} />
            <Row label="Integration errors" value={stats.errorIntegrations} />
            <Row label="Avg call duration today" value={`${stats.avgCallDuration}s`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent calls</CardTitle>
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
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No recent calls
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentCalls.map((call) => (
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
                      <TableCell className="text-muted-foreground">
                        {new Date(call.startedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent system events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No recent events
                  </TableCell>
                </TableRow>
              ) : (
                stats.recentEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{event.company.name}</TableCell>
                    <TableCell>{event.type}</TableCell>
                    <TableCell>{event.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(event.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
