import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useGetRelocation, useUpdateRelocation, useGetRelocationTasks, useUpdateRelocationTask, getGetRelocationTasksQueryKey, getGetRelocationQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, User, Briefcase, Calendar, MapPin, DollarSign, Home, Phone, Mail, FileText } from "lucide-react";
import { Link } from "wouter";

export default function RelocationDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const relocationId = parseInt(id);
  
  const { data: relocation, isLoading: loadingRelocation } = useGetRelocation(relocationId, {
    query: { enabled: !!relocationId, queryKey: getGetRelocationQueryKey(relocationId) }
  });
  
  const { data: tasks, isLoading: loadingTasks } = useGetRelocationTasks(relocationId, {
    query: { enabled: !!relocationId, queryKey: getGetRelocationTasksQueryKey(relocationId) }
  });

  const updateRelocation = useUpdateRelocation();
  const updateTask = useUpdateRelocationTask();

  const handleStatusChange = (status: string) => {
    updateRelocation.mutate({ id: relocationId, data: { status } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetRelocationQueryKey(relocationId), data);
      }
    });
  };

  const handleStageChange = (stage: string) => {
    updateRelocation.mutate({ id: relocationId, data: { stage } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetRelocationQueryKey(relocationId), data);
      }
    });
  };

  const handleTaskToggle = (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    updateTask.mutate({ id: taskId, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRelocationTasksQueryKey(relocationId) });
      }
    });
  };

  const groupedTasks = useMemo(() => {
    if (!tasks) return {};
    return tasks.reduce((acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    }, {} as Record<string, typeof tasks>);
  }, [tasks]);

  if (loadingRelocation || loadingTasks) {
    return <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>;
  }

  if (!relocation) return <div>Case not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/relocations">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            {relocation.profile.fullName}
            <Badge variant="outline" className="uppercase">{relocation.status.replace('_', ' ')}</Badge>
          </h1>
          <p className="text-muted-foreground mt-1">Relocation Case #{relocation.id}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Profile Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Contact</span>
                <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> {relocation.profile.email}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Employer</span>
                <div className="flex items-center gap-2 text-sm"><Briefcase className="h-4 w-4 text-muted-foreground" /> {relocation.profile.employer} ({relocation.profile.employerType})</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Nationality</span>
                <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" /> {relocation.profile.nationality}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Arrival</span>
                <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /> {formatDate(relocation.profile.arrivalDate)}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Family</span>
                <div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-muted-foreground" /> Size: {relocation.profile.familySize}, School Age: {relocation.profile.schoolAgeChildren}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Budget</span>
                <div className="flex items-center gap-2 text-sm"><DollarSign className="h-4 w-4 text-muted-foreground" /> {formatCurrency(relocation.profile.budgetUsd)} / month</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Case Management</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
                <Select value={relocation.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intake">Intake</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stage</label>
                <Select value={relocation.stage} onValueChange={handleStageChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profile_complete">Profile Complete</SelectItem>
                    <SelectItem value="housing_shortlisted">Housing Shortlisted</SelectItem>
                    <SelectItem value="school_applied">School Applied</SelectItem>
                    <SelectItem value="services_arranged">Services Arranged</SelectItem>
                    <SelectItem value="settled">Settled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Package</span>
                <div className="text-sm font-medium">{relocation.packageTier.replace('_', ' ')}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Account Manager</span>
                <div className="text-sm font-medium">{relocation.assignedTo || 'Unassigned'}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Checklist</CardTitle>
              <CardDescription>Track progress across all relocation categories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.keys(groupedTasks).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No tasks assigned to this case.</div>
              ) : (
                Object.entries(groupedTasks).map(([category, catTasks]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b pb-1">{category.replace('_', ' ')}</h3>
                    <div className="space-y-2">
                      {catTasks.map(task => (
                        <div key={task.id} className="flex items-start space-x-3 py-2 hover:bg-muted/50 px-2 rounded-md transition-colors">
                          <Checkbox 
                            id={`task-${task.id}`} 
                            checked={task.status === 'completed'} 
                            onCheckedChange={() => handleTaskToggle(task.id, task.status)}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label 
                              htmlFor={`task-${task.id}`} 
                              className={`text-sm font-medium leading-none cursor-pointer ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}
                            >
                              {task.title}
                            </label>
                            {task.notes && <p className="text-xs text-muted-foreground">{task.notes}</p>}
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-[10px] uppercase ${task.status === 'blocked' ? 'border-destructive text-destructive' : ''}`}>{task.status.replace('_', ' ')}</Badge>
                              {task.dueDate && <span className="text-[10px] text-muted-foreground">Due: {formatDate(task.dueDate)}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Case Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {relocation.notes || "No notes added to this case yet."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// User icon wasn't imported from lucide-react in Dashboard, just adding it here locally for this component
function Users(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
