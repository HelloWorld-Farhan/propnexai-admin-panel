"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";

type SystemEvent = {
  id: string;
  type: string;
  title: string;
  message: string;
  payload?: any;
  createdAt: string;
  company: { name: string } | null;
};

// Color mapping per event type
const EVENT_COLORS: Record<string, string> = {
  CREDIT_ADDED:           "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CREDIT_DEDUCTED:        "bg-red-500/10 text-red-400 border-red-500/20",
  NUMBER_ASSIGNED:        "bg-blue-500/10 text-blue-400 border-blue-500/20",
  NUMBER_RELEASED:        "bg-orange-500/10 text-orange-400 border-orange-500/20",
  NUMBER_EDITED:          "bg-teal-500/10 text-teal-400 border-teal-500/20",
  AGENT_CREATED:          "bg-violet-500/10 text-violet-400 border-violet-500/20",
  AGENT_EDITED:           "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  AGENT_DELETED:          "bg-rose-500/10 text-rose-400 border-rose-500/20",
  NOTIFICATION_CREATED:  "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  NOTIFICATION_EDITED:   "bg-sky-500/10 text-sky-400 border-sky-500/20",
  NOTIFICATION_DELETED:  "bg-pink-500/10 text-pink-400 border-pink-500/20",
  USER_SIGNUP:           "bg-purple-500/10 text-purple-400 border-purple-500/20",
  USER_LOGIN:            "bg-amber-500/20 text-amber-400 border-amber-500/40",
  ADMIN_LOGIN:           "bg-rose-500/20 text-rose-400 border-rose-500/40",
  COMPANY_CREATED:       "bg-lime-500/10 text-lime-400 border-lime-500/20",
  COMPANY_EDITED:        "bg-lime-500/10 text-lime-400 border-lime-500/20",
  COMPANY_DELETED:       "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
  INFRA_COST_EDITED:     "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  INFRA_COST_TRANSFERRED:"bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  FORM_SUBMITTED:        "bg-green-500/10 text-green-400 border-green-500/20",
  VERIFICATION_UPDATED:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  JOB_POSTED:            "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  JOB_EDITED:            "bg-blue-500/10 text-blue-400 border-blue-500/20",
  JOB_DELETED:           "bg-rose-500/10 text-rose-400 border-rose-500/20",
  FORM_INFO:             "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  DOMAIN_ADDED:          "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  DOMAIN_EDITED:         "bg-blue-500/10 text-blue-400 border-blue-500/20",
  DOMAIN_DELETED:        "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const getEventColor = (type: string) =>
  EVENT_COLORS[type] ?? "bg-muted/60 text-muted-foreground border-border";

export function SystemEventsTable() {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const prevEventIdsRef = useRef<Set<string>>(new Set());

  const fetchEvents = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (date) params.set("date", date);
      params.set("page", page.toString());

      const res = await fetch(`/api/system-events?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const incoming: SystemEvent[] = data.events ?? [];

        // Detect new events (highlight them briefly)
        const incomingIds = new Set(incoming.map((e) => e.id));
        const fresh = incoming
          .filter((e) => !prevEventIdsRef.current.has(e.id))
          .map((e) => e.id);
        if (fresh.length > 0) {
          setNewEventIds(new Set(fresh));
          setTimeout(() => setNewEventIds(new Set()), 2500);
        }
        prevEventIdsRef.current = incomingIds;

        setEvents(incoming);
        setTotal(data.pagination?.total ?? 0);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch events", error);
    } finally {
      setInitialLoad(false);
      setRefreshing(false);
    }
  }, [search, date, page]);

  // First load
  useEffect(() => {
    setInitialLoad(true);
    fetchEvents(false);
  }, [fetchEvents]);

  // Silent background polling every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Recent system activity</CardTitle>
          {/* Live indicator */}
          <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            LIVE
          </span>
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search company, event..."
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Input
            type="date"
            className="h-9 text-sm w-full sm:w-auto"
            value={date}
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-2"
            onClick={() => fetchEvents(false)}
            disabled={refreshing}
            title="Refresh now"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative">
          {/* Initial loading skeleton */}
          {initialLoad ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Company</TableHead>
                  <TableHead className="w-[180px]">Event</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-[150px] text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                      No system events found.
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => {
                    const isNew = newEventIds.has(event.id);
                    return (
                      <TableRow
                        key={event.id}
                        className={`transition-colors duration-700 ${
                          isNew ? "bg-emerald-500/5 border-l-2 border-l-emerald-500" : ""
                        }`}
                      >
                        <TableCell className="font-medium text-sm">
                          {event.company?.name ?? <span className="text-muted-foreground italic">System</span>}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${getEventColor(event.type)}`}>
                            {event.type.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm max-w-[360px]">
                          <div className="font-medium text-xs leading-tight">{event.title}</div>
                          {event.message && (
                            <div className="text-muted-foreground mt-0.5 truncate" title={event.message}>
                              {event.message}
                            </div>
                          )}
                          {(event.type === "USER_LOGIN" || event.type === "USER_SIGNUP" || event.type === "ADMIN_LOGIN") && event.payload && (
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/80">
                              {event.payload.ip && <span className="bg-muted px-1.5 py-0.5 rounded">IP: {event.payload.ip}</span>}
                              {event.payload.browser && <span className="bg-muted px-1.5 py-0.5 rounded truncate max-w-[150px]" title={event.payload.browser}>{event.payload.browser}</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap text-right">
                          {formatDate(new Date(event.createdAt))}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-2 py-3 border-t mt-2">
          <div className="text-sm text-muted-foreground">
            {total > 0 ? (
              <>Page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span> &nbsp;·&nbsp; <span className="font-medium text-foreground">{total}</span> events</>
            ) : "No events"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || initialLoad}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || initialLoad}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
