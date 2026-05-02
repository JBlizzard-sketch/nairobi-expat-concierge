import { useState } from "react";
import { useListRelocations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Plane } from "lucide-react";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Relocations() {
  const { data: relocations, isLoading } = useListRelocations();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRelocations = relocations?.filter(relocation => {
    const matchesSearch = relocation.profile.fullName.toLowerCase().includes(search.toLowerCase()) || 
                          relocation.profile.employer.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || relocation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary/10 text-primary border-primary/20';
      case 'completed': return 'bg-primary text-primary-foreground';
      case 'planning': return 'bg-chart-4/10 text-chart-4 border-chart-4/20';
      case 'on_hold': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Relocations</h1>
          <p className="text-muted-foreground mt-1">Manage active and historical relocation cases.</p>
        </div>
        <Link href="/profiles/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Case
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <CardTitle>All Cases</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expat or employer..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="intake">Intake</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Expat</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Package</th>
                  <th className="px-4 py-3 font-medium">Account Manager</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-6 w-20" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                    </tr>
                  ))
                ) : filteredRelocations?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      <Plane className="mx-auto h-8 w-8 mb-2 opacity-20" />
                      No relocations found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredRelocations?.map((relocation) => (
                    <tr key={relocation.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/relocations/${relocation.id}`} className="font-medium text-foreground hover:text-primary transition-colors block">
                          {relocation.profile.fullName}
                          <div className="text-xs text-muted-foreground mt-0.5">{relocation.profile.employer}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`font-semibold uppercase tracking-wider text-[10px] ${getStatusColor(relocation.status)}`}>
                          {relocation.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs uppercase tracking-wider">
                        {relocation.stage.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {relocation.packageTier.replace('_', ' ')}
                        {relocation.corporateAccount && (
                          <div className="text-xs opacity-70">{relocation.corporateAccount}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {relocation.assignedTo || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(relocation.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
