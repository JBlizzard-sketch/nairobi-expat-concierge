import { useGetDashboardSummary, useGetRecentRelocations, useGetRelocationsByStatus, useGetHousingByNeighbourhood } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { Plane, Users, Home, Briefcase, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: recentRelocations, isLoading: loadingRecent } = useGetRecentRelocations();
  const { data: statusData, isLoading: loadingStatus } = useGetRelocationsByStatus();
  const { data: housingData, isLoading: loadingHousing } = useGetHousingByNeighbourhood();

  const pieData = (statusData || []).map(row => ({
    ...row,
    count: Number(row.count),
    label: STATUS_LABELS[row.status] || row.status,
  }));

  const barData = (housingData || []).map(row => ({
    ...row,
    count: Number(row.count),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and recent activity.</p>
      </div>

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
            <Briefcase className="h-4 w-4 text-muted-foreground" />
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
              <CardTitle className="text-base font-semibold">Relocations by Status</CardTitle>
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
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.status] ?? "#94a3b8"}
                        />
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
