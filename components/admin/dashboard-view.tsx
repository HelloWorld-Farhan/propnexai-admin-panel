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
  lowCreditCount: number;
  todayCalls: number;
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
        <StatCard title="Active companies" value={stats.activeCompanies} />
        <StatCard
          title="Low credit alerts"
          value={stats.lowCreditCount}
          variant={stats.lowCreditCount > 0 ? "warning" : "default"}
        />
        <StatCard title="Today's calls" value={stats.todayCalls} />
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
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentCalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No recent calls
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentCalls.map((call) => (
                    <TableRow key={call.id}>
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
                        {formatDate(call.startedAt)}
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
