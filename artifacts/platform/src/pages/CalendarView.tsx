import { useState, useMemo } from "react";
import { useListRelocations, useListAllInvoices } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  ChevronLeft, ChevronRight, CalendarDays, List,
  Plane, CreditCard, AlertCircle, ExternalLink, MapPin,
} from "lucide-react";

/* ─── event types ──────────────────────────────────────────── */

type EventKind = "arrival" | "invoice_due" | "invoice_overdue";

interface CalEvent {
  date: string;           // YYYY-MM-DD
  kind: EventKind;
  label: string;
  sub: string;
  relocationId: number;
  id: string;
}

const KIND_META: Record<EventKind, { icon: React.ElementType; dot: string; pill: string; pillText: string }> = {
  arrival:         { icon: Plane,       dot: "bg-emerald-500", pill: "bg-emerald-50 border-emerald-200", pillText: "text-emerald-800" },
  invoice_due:     { icon: CreditCard,  dot: "bg-amber-400",   pill: "bg-amber-50 border-amber-200",    pillText: "text-amber-800"   },
  invoice_overdue: { icon: AlertCircle, dot: "bg-red-500",     pill: "bg-red-50 border-red-200",        pillText: "text-red-800"     },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseYMD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* ─── component ─────────────────────────────────────────────── */

export default function CalendarView() {
  const today = useMemo(() => toYMD(new Date()), []);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(today);
  const [mode, setMode] = useState<"calendar" | "agenda">("calendar");

  const { data: relocations = [] } = useListRelocations();
  const { data: allInvoices = [] } = useListAllInvoices();

  /* build event list */
  const events = useMemo<CalEvent[]>(() => {
    const out: CalEvent[] = [];

    // Arrival dates
    for (const r of relocations) {
      if (!r.profile.arrivalDate) continue;
      const ymd = toYMD(new Date(r.profile.arrivalDate));
      out.push({
        date: ymd,
        kind: "arrival",
        label: r.profile.fullName,
        sub: r.profile.employer,
        relocationId: r.id,
        id: `arr-${r.id}`,
      });
    }

    // Invoice due dates
    for (const inv of allInvoices) {
      if (!inv.dueDate) continue;
      const ymd = toYMD(new Date(inv.dueDate));
      const overdue = ymd < today && inv.status !== "paid";
      out.push({
        date: ymd,
        kind: overdue ? "invoice_overdue" : "invoice_due",
        label: `${inv.invoiceNumber} — $${inv.amountUsd.toLocaleString()}`,
        sub: (inv as any).clientName ?? "Client",
        relocationId: inv.relocationId,
        id: `inv-${inv.id}`,
      });
    }

    return out;
  }, [relocations, allInvoices, today]);

  /* events grouped by date */
  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const ev of events) {
      if (!m.has(ev.date)) m.set(ev.date, []);
      m.get(ev.date)!.push(ev);
    }
    return m;
  }, [events]);

  /* calendar grid */
  const { year, month, cells } = useMemo(() => {
    const y = viewDate.getFullYear();
    const mo = viewDate.getMonth();
    const firstDay = new Date(y, mo, 1).getDay();
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const cells: Array<{ ymd: string | null }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ ymd: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(y, mo, d);
      cells.push({ ymd: toYMD(dt) });
    }
    return { year: y, month: mo, cells };
  }, [viewDate]);

  function prevMonth() {
    setViewDate(v => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  }
  function nextMonth() {
    setViewDate(v => new Date(v.getFullYear(), v.getMonth() + 1, 1));
  }
  function goToday() {
    setViewDate(new Date());
    setSelectedDay(today);
  }

  const selectedEvents = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  /* upcoming events for agenda mode (next 60 days) */
  const agendaEvents = useMemo(() => {
    const todayD = parseYMD(today);
    const limit = new Date(todayD.getTime() + 60 * 86_400_000);
    return events
      .filter(e => {
        const d = parseYMD(e.date);
        return d >= new Date(todayD.getTime() - 30 * 86_400_000) && d <= limit;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, today]);

  /* group agenda by date */
  const agendaGrouped = useMemo(() => {
    const groups: Array<{ date: string; events: CalEvent[] }> = [];
    for (const ev of agendaEvents) {
      const last = groups[groups.length - 1];
      if (last && last.date === ev.date) last.events.push(ev);
      else groups.push({ date: ev.date, events: [ev] });
    }
    return groups;
  }, [agendaEvents]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold leading-tight">Calendar</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{events.length} events — arrivals, invoice due dates</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 mr-2">
            {(Object.entries(KIND_META) as Array<[EventKind, typeof KIND_META[EventKind]]>).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                <span className="text-xs text-muted-foreground capitalize">{k.replace("_", " ")}</span>
              </div>
            ))}
          </div>
          <Button
            variant={mode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("calendar")}
            className="gap-1.5"
          >
            <CalendarDays className="h-3.5 w-3.5" /> Month
          </Button>
          <Button
            variant={mode === "agenda" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("agenda")}
            className="gap-1.5"
          >
            <List className="h-3.5 w-3.5" /> Agenda
          </Button>
        </div>
      </div>

      {/* ── Calendar mode ─────────────────────────────────── */}
      {mode === "calendar" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Grid */}
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-bold min-w-44 text-center">
                  {MONTHS[month]} {year}
                </h2>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 flex-1 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
              {cells.map((cell, i) => {
                if (!cell.ymd) {
                  return <div key={`empty-${i}`} className="bg-slate-50" />;
                }
                const cellEvents = byDay.get(cell.ymd) ?? [];
                const isToday = cell.ymd === today;
                const isSelected = cell.ymd === selectedDay;
                const dayNum = parseYMD(cell.ymd).getDate();
                const maxDots = 3;

                return (
                  <button
                    key={cell.ymd}
                    onClick={() => setSelectedDay(cell.ymd)}
                    className={`relative flex flex-col p-1.5 min-h-[72px] text-left transition-all group
                      ${isSelected ? "bg-primary/5 ring-2 ring-inset ring-primary/30" : "bg-white hover:bg-slate-50"}
                    `}
                  >
                    {/* Day number */}
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 flex-shrink-0 ${
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : isSelected
                        ? "bg-primary/10 text-primary"
                        : "text-slate-700 group-hover:bg-slate-100"
                    }`}>
                      {dayNum}
                    </div>

                    {/* Event dots / pills */}
                    <div className="flex flex-col gap-0.5 w-full">
                      {cellEvents.slice(0, maxDots).map(ev => {
                        const meta = KIND_META[ev.kind];
                        return (
                          <div
                            key={ev.id}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium leading-tight truncate ${meta.pill} ${meta.pillText} border`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
                            <span className="truncate">{ev.label}</span>
                          </div>
                        );
                      })}
                      {cellEvents.length > maxDots && (
                        <div className="text-[9px] text-muted-foreground pl-1">
                          +{cellEvents.length - maxDots} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day panel */}
          <div className="w-72 border-l bg-white flex flex-col flex-shrink-0 overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-semibold">
                {selectedDay
                  ? parseYMD(selectedDay).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
                  : "Select a day"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {selectedEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <CalendarDays className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No events</p>
                  <p className="text-xs mt-0.5 opacity-70">Nothing scheduled for this day</p>
                </div>
              ) : (
                selectedEvents.map(ev => <EventCard key={ev.id} ev={ev} />)
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Agenda mode ───────────────────────────────────── */}
      {mode === "agenda" && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {agendaGrouped.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No upcoming events in the next 60 days</p>
                <p className="text-sm mt-1 opacity-70">Add arrival dates or invoice due dates to see them here</p>
              </div>
            ) : (
              agendaGrouped.map(group => {
                const d = parseYMD(group.date);
                const isToday = group.date === today;
                const isPast = group.date < today;
                return (
                  <div key={group.date} className="flex gap-4">
                    {/* Date column */}
                    <div className="w-20 flex-shrink-0 pt-1 text-right">
                      <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-primary" : isPast ? "text-muted-foreground" : "text-slate-500"}`}>
                        {d.toLocaleDateString("en-GB", { weekday: "short" })}
                      </p>
                      <p className={`text-2xl font-bold leading-none ${isToday ? "text-primary" : isPast ? "text-slate-300" : "text-slate-800"}`}>
                        {d.getDate()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {d.toLocaleDateString("en-GB", { month: "short" })}
                      </p>
                      {isToday && (
                        <span className="inline-block mt-1 text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">Today</span>
                      )}
                    </div>

                    {/* Events */}
                    <div className="flex-1 space-y-2">
                      {group.events.map(ev => <EventCard key={ev.id} ev={ev} large />)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── event card ─────────────────────────────────────────────── */

function EventCard({ ev, large = false }: { ev: CalEvent; large?: boolean }) {
  const meta = KIND_META[ev.kind];
  const Icon = meta.icon;

  return (
    <div className={`rounded-xl border p-3 ${meta.pill} flex items-start gap-2.5 group transition-all hover:shadow-sm`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.dot} bg-opacity-20`} style={{ backgroundColor: undefined }}>
        <Icon className={`h-3.5 w-3.5 ${meta.pillText}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold leading-tight ${large ? "text-sm" : "text-xs"} ${meta.pillText}`}>{ev.label}</p>
        <p className={`${large ? "text-xs" : "text-[10px]"} opacity-70 mt-0.5 ${meta.pillText}`}>{ev.sub}</p>
        {large && (
          <p className={`text-[10px] mt-1 font-medium capitalize opacity-60 ${meta.pillText}`}>
            {ev.kind.replace(/_/g, " ")}
          </p>
        )}
      </div>
      <Link href={`/relocations/${ev.relocationId}`}>
        <button
          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/50`}
          title="Open case"
        >
          <ExternalLink className={`h-3.5 w-3.5 ${meta.pillText}`} />
        </button>
      </Link>
    </div>
  );
}
