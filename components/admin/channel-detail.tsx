"use client";

import Link from "next/link";
import { ArrowLeft, Building2, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatCallDuration,
  type MockChannel,
} from "@/lib/mock/channels";
import { formatDate } from "@/lib/utils";

function callStatusVariant(
  status: MockChannel["callLogs"][number]["status"],
): "success" | "warning" | "destructive" | "secondary" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "IN_PROGRESS":
      return "warning";
    case "FAILED":
      return "destructive";
    default:
      return "secondary";
  }
}

export function ChannelDetail({ channel }: { channel: MockChannel }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="gap-2 px-0" asChild>
            <Link href="/channels">
              <ArrowLeft className="h-4 w-4" />
              Back to channels
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{channel.label}</h1>
            <p className="text-sm text-muted-foreground">{channel.id}</p>
          </div>
        </div>
        <Badge variant={channel.isActive ? "success" : "secondary"}>
          {channel.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Assigned number</CardDescription>
            <CardTitle className="text-lg">
              {channel.assignedNumber ?? (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total calls</CardDescription>
            <CardTitle className="text-lg">{channel.totalCalls}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Provider</CardDescription>
            <CardTitle className="text-lg">{channel.provider}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last activity</CardDescription>
            <CardTitle className="text-lg">
              {channel.lastActivityAt ? formatDate(channel.lastActivityAt) : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="call-logs">Call logs</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  Assigned company
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{channel.company.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Slug</span>
                  <span>{channel.company.slug}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Company ID</span>
                  <span className="font-mono text-xs">{channel.company.id}</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/companies/${channel.company.id}`}>
                    View company
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4" />
                  Channel details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Channel index</span>
                  <span>{channel.channelIndex}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={channel.isActive ? "success" : "secondary"}>
                    {channel.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(channel.createdAt)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Last updated</span>
                  <span>{formatDate(channel.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="call-logs">
          <Card>
            <CardHeader>
              <CardTitle>Call logs</CardTitle>
              <CardDescription>
                Recent calls handled on this channel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channel.callLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        No call logs yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    channel.callLogs.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell>{formatDate(call.startedAt)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{call.direction}</Badge>
                        </TableCell>
                        <TableCell>{call.customerName ?? "—"}</TableCell>
                        <TableCell>{call.customerPhone}</TableCell>
                        <TableCell>{formatCallDuration(call.durationSeconds)}</TableCell>
                        <TableCell>
                          <Badge variant={callStatusVariant(call.status)}>
                            {call.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Channel history</CardTitle>
              <CardDescription>
                Assignment changes, status updates, and call events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {channel.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history recorded</p>
              ) : (
                channel.history.map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col gap-1 border-b border-border pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{event.action}</p>
                      <p className="text-sm text-muted-foreground">{event.detail}</p>
                    </div>
                    <p className="shrink-0 text-sm text-muted-foreground">
                      {formatDate(event.timestamp)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
