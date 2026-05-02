import { useGetDashboardSummary, useGetRecentRelocations, useGetRelocationsByStatus, useGetHousingByNeighbourhood } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { Plane, Users, Home, GraduationCap, Briefcase, CheckCircle2, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: recentRelocations, isLoading: loadingRecent } = useGetRecentRelocations();
  const { data: statusData, isLoading: loadingStatus } = useGetRelocationsByStatus();
  const { data: housingData, isLoading: loadingHousing } = useGetHousingByNeighbourhood();

  const STATUS_COLORS: Record<string, string> = {
    intake: 'hsl(var(--muted-foreground))',
    planning: 'hsl(var(--chart-4))',
    active: 'hsl(var(--chart-1))',
    completed: 'hsl(var(--primary))',
    on_hold: 'hsl(var(--destructive))'
  };

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
                <div className="text-3xl font-bold">{summary?.activeRelocations || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {summary?.totalRelocations || 0} total cases
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
              <div className="text-3xl font-bold">{summary?.totalProfiles || 0}</div>
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
              <div className="text-3xl font-bold">{summary?.availableHousing || 0}</div>
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
                <div className="text-3xl font-bold">{summary?.vettedVendors || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {summary?.totalVendors || 0} total network
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
            <CardDescription>Latest cases created in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadingRecent ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              ) : recentRelocations?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No recent relocations found.</div>
              ) : (
                recentRelocations?.map(relocation => (
                  <Link key={relocation.id} href={`/relocations/${relocation.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors group">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium group-hover:text-primary transition-colors">{relocation.profile.fullName}</span>
                        <span className="text-xs text-muted-foreground">{relocation.profile.employer} • {relocation.packageTier.replace('_', ' ')}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-medium uppercase tracking-wider px-2 py-1 bg-secondary/20 text-secondary-foreground rounded">
                          {relocation.status}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDate(relocation.createdAt)}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Relocations by Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] flex items-center justify-center">
              {loadingStatus ? <Skeleton className="h-full w-full rounded-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="status"
                    >
                      {(statusData || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || 'hsl(var(--primary))'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [value, name.replace('_', ' ').toUpperCase()]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Housing by Neighbourhood</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
              {loadingHousing ? <Skeleton className="h-full w-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={housingData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="neighbourhood" tick={{ fontSize: 10 }} tickFormatter={(val) => val.substring(0,3).toUpperCase()} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip 
                      formatter={(value: number) => [value, 'Properties']}
                      labelFormatter={(label: string) => label.charAt(0).toUpperCase() + label.slice(1)}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
