import { useRoute, Link } from "wouter";
import {
  useListRelocationActivity,
  getListRelocationActivityQueryKey,
  useGetRelocation,
} from "@workspace/api-client-react";
import type { ActivityLog } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Plane, CheckCircle2, RotateCcw, FileText,
  Layers, CreditCard, StickyNote, GitBranch, AlertCircle,
  Clock, RefreshCw, Loader2, Activity,
} from "lucide-react";

/* ─── event config ─────────────────────────────────────────── */

interface EventMeta {
  icon: React.ElementType;
  dot: string;
  label: string;
  bg: string;
  border: string;
  text: string;
}

const EVENT_META: Record<string, EventMeta> = {
  case_created:      { icon: Plane,          dot: "bg-primary",      label: "Case Opened",       bg: "bg-primary/10",     border: "border-primary/20",    text: "text-primary" },
  status_changed:    { icon: GitBranch,       dot: "bg-blue-500",     label: "Status Changed",    bg: "bg-blue-50",        border: "border-blue-200",      text: "text-blue-700" },
  stage_changed:     { icon: Layers,          dot: "bg-indigo-500",   label: "Stage Advanced",    bg: "bg-indigo-50",      border: "border-indigo-200",    text: "text-indigo-700" },
  task_completed:    { icon: CheckCircle2,    dot: "bg-emerald-500",  label: "Task Completed",    bg: "bg-emerald-50",     border: "border-emerald-200",   text: "text-emerald-700" },
  task_reopened:     { icon: RotateCcw,       dot: "bg-amber-500",    label: "Task Reopened",     bg: "bg-amber-50",       border: "border-amber-200",     text: "text-amber-700" },
  task_created:      { icon: FileText,        dot: "bg-slate-400",    label: "Task Added",        bg: "bg-slate-50",       border: "border-slate-200",     text: "text-slate-600" },
  template_applied:  { icon: Layers,          dot: "bg-violet-500",   label: "Template Applied",  bg: "bg-violet-50",      border: "border-violet-200",    text: "text-violet-700" },
  invoice_created:   { icon: CreditCard,      dot: "bg-rose-500",     label: "Invoice Created",   bg: "bg-rose-50",        border: "border-rose-200",      text: "text-rose-700" },
  notes_updated:     { icon: StickyNote,      dot: "bg-yellow-500",   label: "Notes Updated",     bg: "bg-yellow-50",      border: "border-yellow-200",    text: "text-yellow-700" },
  note_added:        { icon: StickyNote,      dot: "bg-yellow-500",   label: "Note Added",        bg: "bg-yellow-50",      border: "border-yellow-200",    text: "text-yellow-700" },
};

const DEFAULT_META: EventMeta = {
  icon: AlertCircle, dot: "bg-slate-300", label: "Event",
  bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600",
};

function getMeta(eventType: string): EventMeta {
  return EVENT_META[eventType] ?? DEFAULT_META;
}

function formatRelativeTime(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function groupByDate(logs: ActivityLog[]): Array<{ dateLabel: string; items: ActivityLog[] }> {
  const groups: Array<{ dateLabel: string; items: ActivityLog[] }> = [];
  for (const log of logs) {
    const d = new Date(log.createdAt);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const last = groups[groups.length - 1];
    if (last && last.dateLabel === label) last.items.push(log);
    else groups.push({ dateLabel: label, items: [log] });
  }
  return groups;
}

/* ─── component ─────────────────────────────────────────────── */

export default function ActivityTimeline() {
  const [, params] = useRoute("/relocations/:id/activity");
  const id = parseInt(params?.id ?? "0");

  const { data: logs = [], isLoading, refetch, isFetching } = useListRelocationActivity(id, {
    query: { queryKey: getListRelocationActivityQueryKey(id), refetchInterval: 30_000 }
  });

  const { data: relocation } = useGetRelocation(id);
  const clientName = relocation?.profile.fullName ?? `Case #${id}`;

  const groups = groupByDate(logs);

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/relocations/${id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Activity Log
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{clientName} — full audit trail</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatChip label="Total Events" value={logs.length} />
        <StatChip label="Completed Tasks" value={logs.filter(l => l.eventType === "task_completed").length} />
        <StatChip label="Status Changes" value={logs.filter(l => l.eventType === "status_changed" || l.eventType === "stage_changed").length} />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading activity…</span>
        </div>
      )}

      {/* Empty */}
      {!isLoading && logs.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No activity recorded yet</p>
          <p className="text-sm mt-1 opacity-70">Events will appear here as the case progresses — status changes, task completions, invoices, and more</p>
        </div>
      )}

      {/* Timeline */}
      {groups.map(group => (
        <div key={group.dateLabel} className="mb-8">
          {/* Date divider */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{group.dateLabel}</span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{group.items.length} event{group.items.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Events */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            <div className="space-y-3">
              {group.items.map((log, idx) => {
                const meta = getMeta(log.eventType);
                const Icon = meta.icon;
                const isFirst = idx === 0 && group.dateLabel === groups[0]?.dateLabel;

                return (
                  <div key={log.id} className="flex gap-4 relative">
                    {/* Dot */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${meta.dot} shadow-sm`}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>

                    {/* Card */}
                    <div className={`flex-1 rounded-xl border p-3.5 ${meta.bg} ${meta.border} mb-1`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`text-xs font-bold uppercase tracking-wide ${meta.text}`}>{meta.label}</span>
                          <p className="text-sm text-slate-700 mt-0.5 leading-snug">{log.description}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-[11px] whitespace-nowrap">{formatRelativeTime(log.createdAt)}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {new Date(log.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Bottom CTA */}
      {logs.length > 0 && (
        <div className="text-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Showing all {logs.length} event{logs.length !== 1 ? "s" : ""} · Auto-refreshes every 30s
          </p>
          <Link href={`/relocations/${id}`}>
            <Button variant="outline" size="sm" className="mt-3">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Case
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
