import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  useListRelocations,
  useUpdateRelocation,
  getListRelocationsQueryKey,
} from "@workspace/api-client-react";
import type { Relocation } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Plane, User, Calendar, Briefcase, Star, MoreHorizontal,
  ExternalLink, Building2, Plus, Kanban,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";

/* ─── column config ───────────────────────────────────────────── */

interface Column {
  id: string;
  label: string;
  accent: string;          // tailwind bg color for column header strip
  cardBorder: string;      // left border accent on cards
  badge: string;           // badge variant classes
  emptyMsg: string;
}

const COLUMNS: Column[] = [
  {
    id: "intake",
    label: "Intake",
    accent: "bg-slate-500",
    cardBorder: "border-l-slate-400",
    badge: "bg-slate-100 text-slate-700",
    emptyMsg: "No cases in intake",
  },
  {
    id: "planning",
    label: "Planning",
    accent: "bg-blue-500",
    cardBorder: "border-l-blue-400",
    badge: "bg-blue-100 text-blue-700",
    emptyMsg: "No cases being planned",
  },
  {
    id: "active",
    label: "Active",
    accent: "bg-emerald-500",
    cardBorder: "border-l-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
    emptyMsg: "No active cases",
  },
  {
    id: "on_hold",
    label: "On Hold",
    accent: "bg-amber-500",
    cardBorder: "border-l-amber-400",
    badge: "bg-amber-100 text-amber-700",
    emptyMsg: "No cases on hold",
  },
  {
    id: "completed",
    label: "Completed",
    accent: "bg-primary",
    cardBorder: "border-l-primary",
    badge: "bg-primary/10 text-primary",
    emptyMsg: "No completed cases yet",
  },
];

const PACKAGE_LABELS: Record<string, string> = {
  individual: "Individual",
  premium: "Premium",
  corporate_standard: "Corp. Standard",
  corporate_premium: "Corp. Premium",
};

const STAGE_LABELS: Record<string, string> = {
  profile_complete: "Profile",
  housing_shortlisted: "Housing",
  school_applied: "Schools",
  services_arranged: "Services",
  settled: "Settled",
};

/* ─── main component ─────────────────────────────────────────── */

export default function Pipeline() {
  const { data: relocations = [], isLoading } = useListRelocations();
  const updateRelocation = useUpdateRelocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // drag state
  const draggingId = useRef<number | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<Record<number, string>>({});

  function effectiveStatus(r: Relocation) {
    return optimisticStatus[r.id] ?? r.status;
  }

  function onDragStart(e: React.DragEvent, id: number) {
    draggingId.current = id;
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverColumn(colId);
  }

  function onDragLeave() {
    setOverColumn(null);
  }

  function onDrop(e: React.DragEvent, colId: string) {
    e.preventDefault();
    setOverColumn(null);
    const id = draggingId.current;
    draggingId.current = null;
    if (!id) return;

    const relocation = relocations.find(r => r.id === id);
    if (!relocation || effectiveStatus(relocation) === colId) return;

    // optimistic update
    setOptimisticStatus(prev => ({ ...prev, [id]: colId }));

    updateRelocation.mutate(
      { id, data: { status: colId } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListRelocationsQueryKey() });
          setOptimisticStatus(prev => { const n = { ...prev }; delete n[id]; return n; });
          toast({ title: "Status updated", description: `Case moved to ${COLUMNS.find(c => c.id === colId)?.label}` });
        },
        onError: () => {
          setOptimisticStatus(prev => { const n = { ...prev }; delete n[id]; return n; });
          toast({ title: "Update failed", variant: "destructive" });
        },
      }
    );
  }

  function onDragEnd() {
    draggingId.current = null;
    setOverColumn(null);
  }

  const totalCases = relocations.length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <Kanban className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold leading-tight">Pipeline Board</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{totalCases} cases · drag to update status</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/relocations">
            <Button variant="outline" size="sm">List View</Button>
          </Link>
          <Link href="/cases/new">
            <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" /> New Case</Button>
          </Link>
        </div>
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Plane className="h-5 w-5 animate-pulse" />
            <span className="text-sm">Loading cases…</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full gap-3 p-4" style={{ minWidth: `${COLUMNS.length * 280}px` }}>
            {COLUMNS.map(col => {
              const cards = relocations.filter(r => effectiveStatus(r) === col.id);
              const isOver = overColumn === col.id;

              return (
                <div
                  key={col.id}
                  className="flex flex-col w-64 flex-shrink-0 h-full"
                  onDragOver={e => onDragOver(e, col.id)}
                  onDragLeave={onDragLeave}
                  onDrop={e => onDrop(e, col.id)}
                >
                  {/* Column header */}
                  <div className={`rounded-t-xl overflow-hidden flex-shrink-0`}>
                    <div className={`${col.accent} h-1.5 w-full`} />
                    <div className="bg-white border border-t-0 border-b-0 px-3 py-2.5 flex items-center justify-between">
                      <span className="font-semibold text-sm">{col.label}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                        {cards.length}
                      </span>
                    </div>
                  </div>

                  {/* Card list */}
                  <div
                    className={`flex-1 overflow-y-auto rounded-b-xl border border-t-0 transition-all ${
                      isOver
                        ? "bg-primary/5 border-primary/30 ring-2 ring-primary/20"
                        : "bg-slate-50/70 border-slate-200"
                    }`}
                  >
                    <div className="p-2 space-y-2 min-h-full">
                      {cards.length === 0 && (
                        <div className={`flex flex-col items-center justify-center py-10 text-center transition-all ${isOver ? "opacity-0" : "opacity-100"}`}>
                          <Plane className="h-6 w-6 text-slate-300 mb-2" />
                          <p className="text-xs text-slate-400">{col.emptyMsg}</p>
                          <p className="text-xs text-slate-300 mt-0.5">Drop cards here</p>
                        </div>
                      )}

                      {isOver && cards.length === 0 && (
                        <div className="border-2 border-dashed border-primary/40 rounded-xl h-24 flex items-center justify-center">
                          <p className="text-xs text-primary/60 font-medium">Drop here</p>
                        </div>
                      )}

                      {cards.map(r => (
                        <CaseCard
                          key={r.id}
                          relocation={r}
                          col={col}
                          onDragStart={onDragStart}
                          onDragEnd={onDragEnd}
                          onOpen={() => navigate(`/relocations/${r.id}`)}
                        />
                      ))}

                      {isOver && cards.length > 0 && (
                        <div className="border-2 border-dashed border-primary/40 rounded-xl h-12 flex items-center justify-center">
                          <p className="text-xs text-primary/60 font-medium">Drop here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── case card ──────────────────────────────────────────────── */

function CaseCard({
  relocation: r,
  col,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  relocation: Relocation;
  col: Column;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragEnd: () => void;
  onOpen: () => void;
}) {
  const [dragging, setDragging] = useState(false);

  const arrivalDate = r.profile.arrivalDate
    ? new Date(r.profile.arrivalDate)
    : null;
  const daysUntil = arrivalDate
    ? Math.ceil((arrivalDate.getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div
      draggable
      onDragStart={e => { setDragging(true); onDragStart(e, r.id); }}
      onDragEnd={() => { setDragging(false); onDragEnd(); }}
      className={`bg-white rounded-xl border border-l-4 ${col.cardBorder} shadow-sm cursor-grab active:cursor-grabbing select-none transition-all group ${
        dragging ? "opacity-40 scale-95 shadow-lg" : "opacity-100 hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      <div className="p-3 space-y-2.5">
        {/* Name row */}
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{r.profile.fullName}</p>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{r.profile.employer}</span>
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onOpen(); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-slate-100 flex-shrink-0"
            title="Open case"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {PACKAGE_LABELS[r.packageTier] ?? r.packageTier}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
            {STAGE_LABELS[r.stage] ?? r.stage}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Meta row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {arrivalDate ? (
            <div className={`flex items-center gap-1 ${daysUntil !== null && daysUntil < 14 && daysUntil > 0 ? "text-amber-600 font-medium" : ""}`}>
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>
                {daysUntil !== null && daysUntil > 0
                  ? `${daysUntil}d`
                  : daysUntil !== null && daysUntil <= 0
                  ? "Arrived"
                  : formatDate(r.profile.arrivalDate!)}
              </span>
            </div>
          ) : (
            <span className="text-slate-300 text-[10px]">No arrival date</span>
          )}

          {r.assignedTo ? (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{r.assignedTo.split(" ")[0]}</span>
            </div>
          ) : (
            <span className="text-slate-300 text-[10px]">Unassigned</span>
          )}
        </div>

        {/* Corporate account tag */}
        {r.corporateAccount && (
          <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1">
            <Briefcase className="h-2.5 w-2.5 text-slate-400 flex-shrink-0" />
            <span className="text-[10px] text-slate-500 truncate">{r.corporateAccount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
