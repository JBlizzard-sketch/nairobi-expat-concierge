import {
  useGetDashboardSummary,
  useGetRecentRelocations,
  useGetRelocationsByStatus,
  useGetHousingByNeighbourhood,
  useGetTaskCompletionStats,
  useGetDocumentStatusBreakdown,
  useGetVendorEngagement,
  useGetRelocationsByStage,
  useGetOverdueDocuments,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";
import {
  Plane, Users, Home, Briefcase, Clock, CheckCircle2,
  FolderOpen, AlertTriangle, TrendingUp, ShieldCheck,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  RadialBarChart, RadialBar, LineChart, Line,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

const STATUS_COLORS: Record<string, string> = {
  intake: "#94a3b8",
  planning: "#d97706",
  active: "#1e4d3a",
  completed: "#16a34a",
  on_hold: "#dc2626",
};

const STATUS_LABELS: Record<string, string> = {
  intake: "Intake",
  planning: "Planning",
  active: "Active",
  completed: "Completed",
  on_hold: "On Hold",
};

const STAGE_LABELS: Record<string, string> = {
  profile_complete: "Profile",
  housing_search: "Housing",
  school_search: "Schools",
  visa_processing: "Visa",
  pre_arrival: "Pre-Arrival",
  settling_in: "Settling In",
  post_arrival: "Post-Arrival",
  case_closed: "Closed",
};

const STAGE_COLORS = ["#1e4d3a", "#2d6a4f", "#40916c", "#52b788", "#74c69d", "#95d5b2", "#b7e4c7", "#d8f3dc"];

const DOC_STATUS_COLORS: Record<string, string> = {
  pending: "#94a3b8",
  in_progress: "#f59e0b",
  submitted: "#3b82f6",
  received: "#8b5cf6",
  approved: "#16a34a",
  expired: "#f97316",
  rejected: "#dc2626",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  submitted: "Submitted",
  received: "Received",
  approved: "Approved",
  expired: "Expired",
  rejected: "Rejected",
};

const VENDOR_STATUS_COLORS: Record<string, string> = {
  recommended: "#3b82f6",
  engaged: "#f59e0b",
  completed: "#16a34a",
  declined: "#dc2626",
};

const VENDOR_STATUS_LABELS: Record<string, string> = {
  recommended: "Recommended",
  engaged: "Engaged",
  completed: "Completed",
  declined: "Declined",
};

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: recentRelocations, isLoading: loadingRecent } = useGetRecentRelocations();
  const { data: statusData, isLoading: loadingStatus } = useGetRelocationsByStatus();
  const { data: housingData, isLoading: loadingHousing } = useGetHousingByNeighbourhood();
  const { data: taskStats, isLoading: loadingTasks } = useGetTaskCompletionStats();
  const { data: docStatus, isLoading: loadingDocs } = useGetDocumentStatusBreakdown();
  const { data: vendorEngagement, isLoading: loadingVendors } = useGetVendorEngagement();
  const { data: stageData, isLoading: loadingStage } = useGetRelocationsByStage();
  const { data: overdueDocuments, isLoading: loadingOverdue } = useGetOverdueDocuments();

  const pieData = (statusData || []).map(row => ({
    ...row,
    count: Number(row.count),
    label: STATUS_LABELS[row.status] || row.status,
  }));

  const barData = (housingData || []).map(row => ({
    ...row,
    count: Number(row.count),
  }));

  const docPieData = (docStatus || []).map(row => ({
    ...row,
    count: Number(row.count),
    label: DOC_STATUS_LABELS[row.status] || row.status,
  }));

  const vendorPieData = (vendorEngagement || []).map(row => ({
    ...row,
    count: Number(row.count),
    label: VENDOR_STATUS_LABELS[row.status] || row.status,
  }));

  const stageBarData = (stageData || [])
    .map(row => ({
      stage: STAGE_LABELS[row.stage] || row.stage,
      count: Number(row.count),
    }))
    .sort((a, b) => {
      const order = Object.values(STAGE_LABELS);
      return order.indexOf(a.stage) - order.indexOf(b.stage);
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and analytics.</p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate transition-all border-l-4 border-l-chart-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Relocations</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-bold">{summary?.activeRelocations ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {summary?.totalRelocations ?? 0} total cases
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="hover-elevate transition-all border-l-4 border-l-chart-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expat Profiles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-bold">{summary?.totalProfiles ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">registered this year</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="hover-elevate transition-all border-l-4 border-l-chart-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Housing</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-bold">{summary?.availableHousing ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">vetted properties</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="hover-elevate transition-all border-l-4 border-l-chart-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vetted Vendors</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-bold">{summary?.vettedVendors ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {summary?.totalVendors ?? 0} total network
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task completion + overdue docs alert row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Task Completion
            </CardTitle>
            <CardDescription>Platform-wide across all cases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingTasks ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-bold text-primary">{taskStats?.completionRate ?? 0}%</span>
                  <span className="text-sm text-muted-foreground mb-1">complete</span>
                </div>
                <Progress value={taskStats?.completionRate ?? 0} className="h-2" />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border p-2.5 text-center">
                    <div className="text-xl font-semibold text-emerald-600">{taskStats?.completedTasks ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Done</div>
                  </div>
                  <div className="rounded-md border p-2.5 text-center">
                    <div className="text-xl font-semibold text-amber-600">{taskStats?.pendingTasks ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Overdue Documents
            </CardTitle>
            <CardDescription>Past due date and not yet received or approved</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingOverdue ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !overdueDocuments || overdueDocuments.length === 0 ? (
              <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm">No overdue documents — all on track.</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {overdueDocuments.map(doc => (
                  <Link key={doc.id} href={`/relocations/${doc.relocationId}`}>
                    <div className="flex items-center justify-between px-3 py-2 rounded-md border bg-destructive/5 hover:bg-destructive/10 cursor-pointer transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.clientName}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                          {doc.category}
                        </Badge>
                        <span className="text-xs text-destructive font-medium whitespace-nowrap">{doc.dueDate}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent relocations + status pie row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Relocations</CardTitle>
            <CardDescription>Latest cases updated in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loadingRecent ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              ) : (recentRelocations?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No recent relocations found.</div>
              ) : (
                recentRelocations?.map(relocation => (
                  <Link key={relocation.id} href={`/relocations/${relocation.id}`}>
                    <div
                      data-testid={`relocation-row-${relocation.id}`}
                      className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium group-hover:text-primary transition-colors">{relocation.profile.fullName}</span>
                        <span className="text-xs text-muted-foreground">{relocation.profile.employer} · {relocation.packageTier.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={relocation.status} />
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDate(relocation.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Cases by Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[220px] flex items-center">
              {loadingStatus ? (
                <Skeleton className="h-full w-full rounded-full" />
              ) : pieData.length === 0 ? (
                <div className="w-full text-center text-muted-foreground text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="40%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="label"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [value, name]}
                      contentStyle={{ borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span style={{ fontSize: "11px" }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Housing by Neighbourhood</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
              {loadingHousing ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="neighbourhood"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val: string) => val.substring(0, 3).toUpperCase()}
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number) => [value, "Properties"]}
                      labelFormatter={(label: string) => label.charAt(0).toUpperCase() + label.slice(1)}
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                      contentStyle={{ borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                    />
                    <Bar dataKey="count" fill="#1e4d3a" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document status + Vendor engagement + Stage pipeline row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <FolderOpen className="h-4 w-4 text-primary" /> Document Status
            </CardTitle>
            <CardDescription>All tracked documents across active cases</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px] flex items-center">
            {loadingDocs ? (
              <Skeleton className="h-full w-full rounded-full" />
            ) : docPieData.length === 0 ? (
              <div className="w-full text-center text-muted-foreground text-sm">No documents tracked yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={docPieData}
                    cx="40%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="label"
                  >
                    {docPieData.map((entry, index) => (
                      <Cell key={`doc-${index}`} fill={DOC_STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{ borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    iconSize={7}
                    formatter={(value) => <span style={{ fontSize: "10px" }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Briefcase className="h-4 w-4 text-primary" /> Vendor Engagement
            </CardTitle>
            <CardDescription>Case-vendor assignment statuses</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px] flex items-center">
            {loadingVendors ? (
              <Skeleton className="h-full w-full rounded-full" />
            ) : vendorPieData.length === 0 ? (
              <div className="w-full text-center text-muted-foreground text-sm">No vendors assigned yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vendorPieData}
                    cx="40%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="label"
                  >
                    {vendorPieData.map((entry, index) => (
                      <Cell key={`vendor-${index}`} fill={VENDOR_STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{ borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    iconSize={7}
                    formatter={(value) => <span style={{ fontSize: "10px" }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" /> Cases by Stage
            </CardTitle>
            <CardDescription>Current pipeline stage distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            {loadingStage ? (
              <Skeleton className="h-full w-full" />
            ) : stageBarData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageBarData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    tick={{ fontSize: 10 }}
                    width={62}
                  />
                  <Tooltip
                    formatter={(value: number) => [value, "Cases"]}
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    contentStyle={{ borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                    {stageBarData.map((_, index) => (
                      <Cell key={`stage-${index}`} fill={STAGE_COLORS[index % STAGE_COLORS.length] ?? "#1e4d3a"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    intake: "bg-slate-100 text-slate-700",
    planning: "bg-amber-100 text-amber-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-emerald-100 text-emerald-900 font-semibold",
    on_hold: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded ${colorMap[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
