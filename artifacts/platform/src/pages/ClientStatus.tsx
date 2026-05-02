import { useGetClientStatus, getGetClientStatusQueryKey } from "@workspace/api-client-react";
import type { ClientStatusView, ClientStatusTask } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, Clock, Home, GraduationCap, MapPin, Calendar, User, Briefcase } from "lucide-react";

const STAGE_ICONS = [MapPin, Home, GraduationCap, Briefcase, CheckCircle2];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  intake:     { label: "Intake",     color: "bg-slate-100 text-slate-600" },
  planning:   { label: "Planning",   color: "bg-blue-100 text-blue-700" },
  active:     { label: "Active",     color: "bg-amber-100 text-amber-700" },
  completed:  { label: "Completed",  color: "bg-emerald-100 text-emerald-700" },
  on_hold:    { label: "On Hold",    color: "bg-red-100 text-red-600" },
};

const TASK_STATUS: Record<string, { color: string; ring: string }> = {
  completed:  { color: "text-emerald-600", ring: "border-emerald-300 bg-emerald-50" },
  in_progress:{ color: "text-amber-600",   ring: "border-amber-300 bg-amber-50" },
  pending:    { color: "text-slate-400",   ring: "border-slate-200 bg-white" },
  blocked:    { color: "text-red-500",     ring: "border-red-200 bg-red-50" },
};

const TIER_LABELS: Record<string, string> = {
  individual:         "Individual",
  premium:            "Premium",
  corporate_standard: "Corporate Standard",
  corporate_premium:  "Corporate Premium",
};

function groupByCategory(tasks: ClientStatusTask[]): Record<string, ClientStatusTask[]> {
  return tasks.reduce<Record<string, ClientStatusTask[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});
}

interface Props { token: string }

export default function ClientStatus({ token }: Props) {
  const { data, isLoading, isError } = useGetClientStatus(token, {
    query: { queryKey: getGetClientStatusQueryKey(token) },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-6">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-60 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Link Not Found</h2>
          <p className="text-slate-500 mt-2 text-sm">
            This status link may have expired or been revoked. Please contact your relocation coordinator for an updated link.
          </p>
        </div>
      </div>
    );
  }

  const view = data as ClientStatusView;
  const statusCfg = STATUS_CONFIG[view.status] ?? STATUS_CONFIG["intake"]!;
  const grouped = groupByCategory(view.tasks);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 pb-12">
      {/* Header banner */}
      <div className="bg-[#1a2e1a] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-400 uppercase tracking-widest">Nairobi Expat Concierge</p>
            <p className="text-xs text-slate-400 mt-0.5">Your Relocation Status Portal</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">

        {/* Hero Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{view.clientName}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> {view.nationality}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Arriving {view.arrivalDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> {TIER_LABELS[view.packageTier] ?? view.packageTier}
                </span>
              </div>
            </div>
            {view.assignedTo && (
              <div className="text-right text-xs text-slate-400 mt-1">
                <p className="font-medium text-slate-600">{view.assignedTo}</p>
                <p>Your Coordinator</p>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-1.5 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Overall Progress</span>
              <span className="font-bold text-emerald-600">{view.progressPct}%</span>
            </div>
            <Progress value={view.progressPct} className="h-2.5" />
            <p className="text-xs text-slate-400">{view.tasksCompleted} of {view.tasksTotal} tasks complete</p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl bg-slate-50 border px-4 py-3 flex items-center gap-3">
              <Home className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-xs text-slate-500">Housing Options</p>
                <p className="font-semibold text-slate-800">{view.housingCount} shortlisted</p>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border px-4 py-3 flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xs text-slate-500">School Applications</p>
                <p className="font-semibold text-slate-800">{view.schoolCount} submitted</p>
              </div>
            </div>
          </div>
        </div>

        {/* Journey Milestones */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold text-slate-800 mb-5">Your Nairobi Journey</h2>
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gradient-to-b from-emerald-400 to-slate-200" />
            <div className="space-y-5">
              {view.milestones.map((m, i) => {
                const Icon = STAGE_ICONS[i] ?? CheckCircle2;
                return (
                  <div key={i} className="flex items-center gap-4 relative z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                      m.completed
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200"
                        : "bg-white border-slate-200 text-slate-300"
                    }`}>
                      {m.completed ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${m.completed ? "text-slate-800" : "text-slate-400"}`}>
                        {m.label}
                      </p>
                      {m.completed && (
                        <p className="text-xs text-emerald-600 mt-0.5">Completed</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Task Checklist */}
        {view.tasks.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Task Checklist</h2>
            <div className="space-y-5">
              {Object.entries(grouped).map(([category, tasks]) => (
                <div key={category}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                    {category.replace(/_/g, " ")}
                  </p>
                  <div className="space-y-1.5">
                    {tasks.map(task => {
                      const cfg = TASK_STATUS[task.status] ?? TASK_STATUS["pending"]!;
                      return (
                        <div key={task.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${cfg.ring}`}>
                          {task.status === "completed"
                            ? <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${cfg.color}`} />
                            : task.status === "in_progress"
                              ? <Clock className={`h-4 w-4 flex-shrink-0 ${cfg.color}`} />
                              : <Circle className={`h-4 w-4 flex-shrink-0 ${cfg.color}`} />
                          }
                          <span className={`text-sm flex-1 ${task.status === "completed" ? "line-through text-slate-400" : "text-slate-700"}`}>
                            {task.title}
                          </span>
                          {task.dueDate && task.status !== "completed" && (
                            <span className="text-xs text-slate-400 flex-shrink-0">Due {task.dueDate}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pb-4">
          <p>Last updated {new Date(view.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p className="mt-1">Powered by <span className="font-semibold text-emerald-600">Nairobi Expat Concierge</span></p>
        </div>
      </div>
    </div>
  );
}
