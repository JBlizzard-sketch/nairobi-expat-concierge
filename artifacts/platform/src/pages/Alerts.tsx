import { useGetAlerts, useGetAlertCount } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Bell, AlertTriangle, FileText, PhoneCall, DollarSign, Clock,
  ArrowRight, RefreshCw, CheckCircle2, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/utils";

const ALERT_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  overdue_task: { label: "Overdue Task", icon: CheckCircle2, color: "text-red-600" },
  overdue_document: { label: "Overdue Document", icon: FileText, color: "text-amber-600" },
  overdue_followup: { label: "Overdue Follow-up", icon: PhoneCall, color: "text-orange-600" },
  over_budget: { label: "Over Budget", icon: DollarSign, color: "text-red-700" },
  stale_case: { label: "Stale Case", icon: Clock, color: "text-slate-600" },
};

const SEVERITY_CONFIG: Record<string, { label: string; badge: string; border: string; bg: string }> = {
  high: {
    label: "High",
    badge: "bg-red-100 text-red-700 border-red-200",
    border: "border-l-red-500",
    bg: "hover:bg-red-50/50",
  },
  medium: {
    label: "Medium",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    border: "border-l-amber-400",
    bg: "hover:bg-amber-50/50",
  },
  low: {
    label: "Low",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    border: "border-l-slate-300",
    bg: "hover:bg-slate-50/30",
  },
};

type Alert = {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  relocationId: number;
  clientName: string;
  dueDate?: string | null;
};

function AlertCard({ alert }: { alert: Alert }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low!;
  const type = ALERT_TYPE_CONFIG[alert.alertType];
  const Icon = type?.icon ?? AlertTriangle;

  return (
    <div
      className={`rounded-lg border border-l-4 ${sev.border} ${sev.bg} transition-colors bg-white`}
    >
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${type?.color ?? "text-slate-500"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sev.badge}`}>
              {sev.label}
            </Badge>
            {type && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white text-slate-500 border-slate-200">
                {type.label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
            <span className="font-medium text-slate-700">{alert.clientName}</span>
            {alert.dueDate && (
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" /> Due {formatDate(alert.dueDate)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t pt-3 space-y-3">
          <p className="text-sm text-slate-700">{alert.description}</p>
          <Link href={`/relocations/${alert.relocationId}`}>
            <Button variant="outline" size="sm" className="text-xs h-7">
              View Case <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function Alerts() {
  const { data: alerts, isLoading, refetch, isFetching } = useGetAlerts({
    query: { queryKey: ["alerts"] }
  });

  const { data: countData } = useGetAlertCount({
    query: { queryKey: ["alerts-count"] }
  });

  const high = alerts?.filter(a => a.severity === "high") ?? [];
  const medium = alerts?.filter(a => a.severity === "medium") ?? [];
  const low = alerts?.filter(a => a.severity === "low") ?? [];

  const byType = countData?.byType ?? {};

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Alerts & Reminders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Live cross-case alert feed — {countData?.count ?? 0} active alert{countData?.count !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Type breakdown pills */}
      {countData && countData.count > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byType).filter(([, v]) => v > 0).map(([type, cnt]) => {
            const cfg = ALERT_TYPE_CONFIG[type];
            const Icon = cfg?.icon ?? AlertTriangle;
            return (
              <div key={type} className="flex items-center gap-1.5 bg-white border rounded-full px-3 py-1 text-xs font-medium text-slate-600">
                <Icon className={`h-3 w-3 ${cfg?.color ?? "text-slate-500"}`} />
                {cfg?.label ?? type}: <span className="font-bold">{cnt}</span>
              </div>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : alerts && alerts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">All clear!</h3>
            <p className="text-sm text-slate-500 mt-1">No alerts at this time. All cases are on track.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {high.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wide">
                  High Priority — {high.length}
                </h2>
              </div>
              {high.map(a => <AlertCard key={a.id} alert={a} />)}
            </div>
          )}
          {medium.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
                  Medium Priority — {medium.length}
                </h2>
              </div>
              {medium.map(a => <AlertCard key={a.id} alert={a} />)}
            </div>
          )}
          {low.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  Low Priority — {low.length}
                </h2>
              </div>
              {low.map(a => <AlertCard key={a.id} alert={a} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
