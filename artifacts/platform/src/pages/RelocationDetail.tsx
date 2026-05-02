import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import {
  useGetRelocation, useUpdateRelocation,
  useGetRelocationTasks, useUpdateRelocationTask,
  useListHousingShortlists, useUpdateHousingShortlist, useDeleteHousingShortlist,
  useListSchoolApplications, useUpdateSchoolApplication, useDeleteSchoolApplication,
  useListRelocationActivity,
  useListCaseVendors, useCreateCaseVendor, useUpdateCaseVendor, useDeleteCaseVendor,
  useListVendors,
  getGetRelocationTasksQueryKey, getGetRelocationQueryKey, getListRelocationsQueryKey,
  getListHousingShortlistsQueryKey, getListSchoolApplicationsQueryKey,
  getListRelocationActivityQueryKey, getListCaseVendorsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, User, Briefcase, Calendar, MapPin, DollarSign, Mail,
  FileText, CheckCircle2, Users, Home as HomeIcon, Star, Trash2, GraduationCap, FilePlus,
  Clock, Activity, RefreshCw, ShieldCheck, Phone,
} from "lucide-react";
import { Link } from "wouter";

const SHORTLIST_STATUS_OPTIONS = [
  { value: "shortlisted", label: "Shortlisted" },
  { value: "viewing", label: "Viewing Arranged" },
  { value: "offer_made", label: "Offer Made" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

const SHORTLIST_STATUS_STYLES: Record<string, string> = {
  shortlisted: "bg-blue-50 text-blue-700 border-blue-200",
  viewing: "bg-amber-50 text-amber-700 border-amber-200",
  offer_made: "bg-violet-50 text-violet-700 border-violet-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const APPLICATION_STATUS_OPTIONS = [
  { value: "enquired", label: "Enquired" },
  { value: "applied", label: "Applied" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

const APPLICATION_STATUS_STYLES: Record<string, string> = {
  enquired: "bg-slate-50 text-slate-700 border-slate-200",
  applied: "bg-blue-50 text-blue-700 border-blue-200",
  waitlisted: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function RelocationDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const relocationId = parseInt(id);

  const { data: relocation, isLoading: loadingRelocation } = useGetRelocation(relocationId, {
    query: { enabled: !!relocationId, queryKey: getGetRelocationQueryKey(relocationId) }
  });

  const { data: tasks, isLoading: loadingTasks } = useGetRelocationTasks(relocationId, {
    query: { enabled: !!relocationId, queryKey: getGetRelocationTasksQueryKey(relocationId) }
  });

  const { data: shortlists, isLoading: loadingShortlists } = useListHousingShortlists(relocationId, {
    query: { enabled: !!relocationId, queryKey: getListHousingShortlistsQueryKey(relocationId) }
  });

  const { data: applications, isLoading: loadingApplications } = useListSchoolApplications(relocationId, {
    query: { enabled: !!relocationId, queryKey: getListSchoolApplicationsQueryKey(relocationId) }
  });

  const { data: activityLog, isLoading: loadingActivity } = useListRelocationActivity(relocationId, {
    query: { enabled: !!relocationId, queryKey: getListRelocationActivityQueryKey(relocationId) }
  });

  const { data: caseVendors, isLoading: loadingVendors } = useListCaseVendors(relocationId, {
    query: { enabled: !!relocationId, queryKey: getListCaseVendorsQueryKey(relocationId) }
  });

  const { data: allVendors } = useListVendors();

  const invalidateActivity = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListRelocationActivityQueryKey(relocationId) });
  }, [queryClient, relocationId]);

  const invalidateVendors = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListCaseVendorsQueryKey(relocationId) });
  }, [queryClient, relocationId]);

  const updateRelocation = useUpdateRelocation();
  const updateTask = useUpdateRelocationTask();
  const updateShortlist = useUpdateHousingShortlist();
  const deleteShortlist = useDeleteHousingShortlist();
  const updateApplication = useUpdateSchoolApplication();
  const deleteApplication = useDeleteSchoolApplication();
  const createCaseVendor = useCreateCaseVendor();
  const updateCaseVendor = useUpdateCaseVendor();
  const deleteCaseVendor = useDeleteCaseVendor();

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");

  const handleStatusChange = (status: string) => {
    updateRelocation.mutate({ id: relocationId, data: { status } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetRelocationQueryKey(relocationId), data);
        queryClient.invalidateQueries({ queryKey: getListRelocationsQueryKey() });
        invalidateActivity();
        toast({ title: "Status updated", description: `Case moved to ${status.replace(/_/g, " ")}.` });
      }
    });
  };

  const handleStageChange = (stage: string) => {
    updateRelocation.mutate({ id: relocationId, data: { stage } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetRelocationQueryKey(relocationId), data);
        invalidateActivity();
        toast({ title: "Stage updated" });
      }
    });
  };

  const handleTaskToggle = (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    updateTask.mutate(
      { id: relocationId, taskId, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRelocationTasksQueryKey(relocationId) });
          invalidateActivity();
        }
      }
    );
  };

  const handleSaveNotes = () => {
    updateRelocation.mutate({ id: relocationId, data: { notes: notesValue } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetRelocationQueryKey(relocationId), data);
        setEditingNotes(false);
        invalidateActivity();
        toast({ title: "Notes saved" });
      }
    });
  };

  const handleShortlistStatusChange = (shortlistId: number, status: string) => {
    updateShortlist.mutate(
      { id: relocationId, shortlistId, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListHousingShortlistsQueryKey(relocationId) });
          invalidateActivity();
          toast({ title: "Shortlist status updated" });
        }
      }
    );
  };

  const handleApplicationStatusChange = (applicationId: number, status: string) => {
    updateApplication.mutate(
      { id: relocationId, applicationId, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSchoolApplicationsQueryKey(relocationId) });
          invalidateActivity();
          toast({ title: "Application status updated" });
        }
      }
    );
  };

  const handleRemoveApplication = (applicationId: number, name: string) => {
    deleteApplication.mutate(
      { id: relocationId, applicationId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSchoolApplicationsQueryKey(relocationId) });
          invalidateActivity();
          toast({ title: "School removed from applications", description: name });
        }
      }
    );
  };

  const handleRemoveShortlist = (shortlistId: number, title: string) => {
    deleteShortlist.mutate(
      { id: relocationId, shortlistId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListHousingShortlistsQueryKey(relocationId) });
          invalidateActivity();
          toast({ title: "Removed from shortlist", description: title });
        }
      }
    );
  };

  const handleAssignVendor = () => {
    if (!selectedVendorId) return;
    createCaseVendor.mutate(
      { id: relocationId, data: { vendorId: parseInt(selectedVendorId) } },
      {
        onSuccess: () => {
          invalidateVendors();
          invalidateActivity();
          setVendorDialogOpen(false);
          setSelectedVendorId("");
          toast({ title: "Vendor assigned to case" });
        },
        onError: () => {
          toast({ title: "Already assigned", description: "This vendor is already on this case.", variant: "destructive" });
        }
      }
    );
  };

  const handleVendorStatusChange = (caseVendorId: number, status: string) => {
    updateCaseVendor.mutate(
      { id: relocationId, caseVendorId, data: { status } },
      {
        onSuccess: () => {
          invalidateVendors();
          invalidateActivity();
          toast({ title: "Vendor status updated" });
        }
      }
    );
  };

  const handleRemoveVendor = (caseVendorId: number, name: string) => {
    deleteCaseVendor.mutate(
      { id: relocationId, caseVendorId },
      {
        onSuccess: () => {
          invalidateVendors();
          invalidateActivity();
          toast({ title: "Vendor removed", description: name });
        }
      }
    );
  };

  const assignableVendors = allVendors?.filter(
    v => !caseVendors?.some(cv => cv.vendorId === v.id)
  ) ?? [];

  const groupedTasks = useMemo(() => {
    if (!tasks) return {} as Record<string, NonNullable<typeof tasks>>;
    return tasks.reduce((acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category]!.push(task);
      return acc;
    }, {} as Record<string, NonNullable<typeof tasks>>);
  }, [tasks]);

  const taskStats = useMemo(() => {
    if (!tasks || tasks.length === 0) return { completed: 0, total: 0, pct: 0 };
    const completed = tasks.filter(t => t.status === "completed").length;
    return { completed, total: tasks.length, pct: Math.round((completed / tasks.length) * 100) };
  }, [tasks]);

  if (loadingRelocation || loadingTasks) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-80 col-span-1" />
          <Skeleton className="h-80 col-span-2" />
        </div>
      </div>
    );
  }

  if (!relocation) return <div className="text-muted-foreground py-12 text-center">Relocation case not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/relocations">
          <Button variant="outline" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3 flex-wrap">
            {relocation.profile.fullName}
            <StatusBadge status={relocation.status} />
          </h1>
          <p className="text-muted-foreground mt-1">Relocation Case #{relocation.id} · {relocation.corporateAccount || relocation.profile.employer}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4 md:col-span-1">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Profile Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <DetailRow icon={<Mail className="h-3.5 w-3.5" />} label="Contact" value={relocation.profile.email} />
              <DetailRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Employer" value={`${relocation.profile.employer} (${relocation.profile.employerType})`} />
              <DetailRow icon={<MapPin className="h-3.5 w-3.5" />} label="Nationality" value={relocation.profile.nationality} />
              <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="Arrival" value={formatDate(relocation.profile.arrivalDate)} />
              <DetailRow icon={<Users className="h-3.5 w-3.5" />} label="Family" value={`Size: ${relocation.profile.familySize}  ·  School-age: ${relocation.profile.schoolAgeChildren}`} />
              <DetailRow icon={<DollarSign className="h-3.5 w-3.5" />} label="Budget" value={`${formatCurrency(relocation.profile.budgetUsd)} / mo`} />
              {relocation.profile.neighbourhoodPreferences && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Neighbourhoods</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {relocation.profile.neighbourhoodPreferences.split(",").map(n => n.trim()).filter(Boolean).map(n => (
                      <span key={n} className="text-xs px-2 py-0.5 bg-accent text-accent-foreground rounded capitalize">{n}</span>
                    ))}
                  </div>
                </div>
              )}
              {relocation.profile.specificNeeds && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Specific Needs</span>
                  <p className="text-xs leading-relaxed">{relocation.profile.specificNeeds}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Case Management</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
                <Select value={relocation.status} onValueChange={handleStatusChange} disabled={updateRelocation.isPending}>
                  <SelectTrigger data-testid="select-status">
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
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stage</label>
                <Select value={relocation.stage} onValueChange={handleStageChange} disabled={updateRelocation.isPending}>
                  <SelectTrigger data-testid="select-stage">
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
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider block">Package</span>
                  <span className="font-medium capitalize">{relocation.packageTier.replace(/_/g, " ")}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider block">Assigned</span>
                  <span className="font-medium">{relocation.assignedTo || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="md:col-span-2 space-y-4">
          {/* Shortlisted Properties */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" /> Shortlisted Properties
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    {shortlists?.length ?? 0} {(shortlists?.length ?? 0) === 1 ? "property" : "properties"} shortlisted
                  </CardDescription>
                </div>
                <Link href="/housing">
                  <Button variant="outline" size="sm">
                    <HomeIcon className="h-4 w-4 mr-1.5" />
                    Browse Housing
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingShortlists ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !shortlists || shortlists.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <Star className="h-8 w-8 mx-auto opacity-20" />
                  <p className="text-sm">No properties shortlisted yet.</p>
                  <p className="text-xs">Browse the housing listings and add properties to this case.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shortlists.map(entry => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <HomeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/housing/${entry.listing.id}`}>
                            <span className="font-medium text-sm hover:text-primary hover:underline cursor-pointer">
                              {entry.listing.title}
                            </span>
                          </Link>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase tracking-wide ${SHORTLIST_STATUS_STYLES[entry.status] ?? ""}`}
                          >
                            {SHORTLIST_STATUS_OPTIONS.find(o => o.value === entry.status)?.label ?? entry.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="capitalize">{entry.listing.neighbourhood}</span>
                          <span>·</span>
                          <span>{entry.listing.bedrooms} bed · {entry.listing.bathrooms} bath</span>
                          <span>·</span>
                          <span className="font-medium text-foreground">{formatCurrency(entry.listing.rentUsdPerMonth)}/mo</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={entry.status}
                          onValueChange={(v) => handleShortlistStatusChange(entry.id, v)}
                          disabled={updateShortlist.isPending}
                        >
                          <SelectTrigger className="h-8 text-xs w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SHORTLIST_STATUS_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveShortlist(entry.id, entry.listing.title)}
                          disabled={deleteShortlist.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* School Applications */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" /> School Applications
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    {applications?.length ?? 0} {(applications?.length ?? 0) === 1 ? "school" : "schools"} in pipeline
                  </CardDescription>
                </div>
                <Link href="/schools">
                  <Button variant="outline" size="sm">
                    <FilePlus className="h-4 w-4 mr-1.5" />
                    Browse Schools
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingApplications ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !applications || applications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <GraduationCap className="h-8 w-8 mx-auto opacity-20" />
                  <p className="text-sm">No school applications yet.</p>
                  <p className="text-xs">Browse the school listings and add schools to this case.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map(entry => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/schools/${entry.school.id}`}>
                            <span className="font-medium text-sm hover:text-primary hover:underline cursor-pointer">
                              {entry.school.name}
                            </span>
                          </Link>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase tracking-wide ${APPLICATION_STATUS_STYLES[entry.status] ?? ""}`}
                          >
                            {APPLICATION_STATUS_OPTIONS.find(o => o.value === entry.status)?.label ?? entry.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="uppercase font-medium">{entry.school.curriculum.replace(/_/g, " ")}</span>
                          <span>·</span>
                          <span>Ages {entry.school.ageRangeMin}–{entry.school.ageRangeMax}</span>
                          <span>·</span>
                          <span className={entry.school.hasWaitlist ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                            {entry.school.hasWaitlist ? `${entry.school.waitlistMonths}mo waitlist` : "Open"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={entry.status}
                          onValueChange={(v) => handleApplicationStatusChange(entry.id, v)}
                          disabled={updateApplication.isPending}
                        >
                          <SelectTrigger className="h-8 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APPLICATION_STATUS_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveApplication(entry.id, entry.school.name)}
                          disabled={deleteApplication.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommended Vendors */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" /> Recommended Vendors
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    {caseVendors?.length ?? 0} {(caseVendors?.length ?? 0) === 1 ? "provider" : "providers"} assigned
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setVendorDialogOpen(true)}>
                  <FilePlus className="h-4 w-4 mr-1.5" />
                  Assign Vendor
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingVendors ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : !caseVendors || caseVendors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <Briefcase className="h-8 w-8 mx-auto opacity-20" />
                  <p className="text-sm">No vendors assigned yet.</p>
                  <p className="text-xs">Assign vetted service providers to help this case.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {caseVendors.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/vendors/${entry.vendor.id}`}>
                            <span className="font-medium text-sm hover:text-primary hover:underline cursor-pointer">
                              {entry.vendor.name}
                            </span>
                          </Link>
                          {entry.vendor.isVetted && (
                            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="uppercase font-medium">{entry.vendor.category.replace(/_/g, " ")}</span>
                          {entry.vendor.phone && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> {entry.vendor.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={entry.status}
                          onValueChange={v => handleVendorStatusChange(entry.id, v)}
                          disabled={updateCaseVendor.isPending}
                        >
                          <SelectTrigger className="h-8 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              { value: "recommended", label: "Recommended" },
                              { value: "engaged", label: "Engaged" },
                              { value: "completed", label: "Completed" },
                              { value: "declined", label: "Declined" },
                            ].map(o => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveVendor(entry.id, entry.vendor.name)}
                          disabled={deleteCaseVendor.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Checklist */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" /> Task Checklist
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    {taskStats.completed} of {taskStats.total} tasks complete
                  </CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary">{taskStats.pct}%</span>
                </div>
              </div>
              <Progress value={taskStats.pct} className="h-2 mt-3" />
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
              {Object.keys(groupedTasks).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No tasks assigned to this case.</div>
              ) : (
                Object.entries(groupedTasks).sort(([a], [b]) => a.localeCompare(b)).map(([category, catTasks]) => {
                  const catDone = catTasks.filter(t => t.status === "completed").length;
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                          {category.replace(/_/g, " ")}
                        </h3>
                        <span className="text-xs text-muted-foreground">{catDone}/{catTasks.length}</span>
                      </div>
                      <div className="space-y-1 border-l-2 border-muted pl-3">
                        {catTasks.map(task => (
                          <div
                            key={task.id}
                            data-testid={`task-${task.id}`}
                            className="flex items-start gap-3 py-2 px-2 rounded-md hover:bg-muted/40 transition-colors"
                          >
                            <Checkbox
                              id={`task-${task.id}`}
                              checked={task.status === "completed"}
                              onCheckedChange={() => handleTaskToggle(task.id, task.status)}
                              disabled={updateTask.isPending}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <label
                                htmlFor={`task-${task.id}`}
                                className={`text-sm font-medium leading-snug cursor-pointer block ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                              >
                                {task.title}
                              </label>
                              <div className="flex items-center gap-2 mt-1">
                                <TaskStatusPill status={task.status} />
                                {task.dueDate && (
                                  <span className="text-[10px] text-muted-foreground">Due: {formatDate(task.dueDate)}</span>
                                )}
                              </div>
                              {task.notes && (
                                <p className="text-xs text-muted-foreground mt-1 italic">{task.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" /> Activity Timeline
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={invalidateActivity}
                  title="Refresh"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingActivity ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !activityLog || activityLog.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground space-y-1.5">
                  <Clock className="h-7 w-7 mx-auto opacity-20" />
                  <p className="text-sm">No activity recorded yet.</p>
                  <p className="text-xs">Events will appear here as the case progresses.</p>
                </div>
              ) : (
                <ol className="relative border-l border-border ml-2 space-y-4">
                  {activityLog.map(event => (
                    <li key={event.id} className="ml-4">
                      <span className="absolute -left-1.5 mt-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary/20 ring-2 ring-background">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm leading-snug text-foreground">{event.description}</p>
                        <time className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {relativeTime(event.createdAt)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {/* Case Notes */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" /> Case Notes
                </CardTitle>
                {!editingNotes ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setNotesValue(relocation.notes ?? ""); setEditingNotes(true); }}
                    data-testid="button-edit-notes"
                  >
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingNotes(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSaveNotes} disabled={updateRelocation.isPending} data-testid="button-save-notes">Save</Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {editingNotes ? (
                <Textarea
                  value={notesValue}
                  onChange={e => setNotesValue(e.target.value)}
                  className="min-h-[120px] text-sm"
                  placeholder="Add case notes, context, escalations..."
                  data-testid="textarea-notes"
                  autoFocus
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {relocation.notes || "No notes added yet. Click Edit to add context for this case."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Vendor Dialog */}
      <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Vendor to Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {assignableVendors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All vendors from the network are already assigned to this case.
              </p>
            ) : (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Select Vendor</label>
                <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableVendors.map(v => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        <span className="flex items-center gap-2">
                          {v.isVetted && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                          <span>{v.name}</span>
                          <span className="text-muted-foreground text-xs">· {v.category.replace(/_/g, " ")}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setVendorDialogOpen(false); setSelectedVendorId(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignVendor}
              disabled={!selectedVendorId || createCaseVendor.isPending}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5 text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        <span>{value}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    intake: "bg-slate-100 text-slate-700 border-slate-200",
    planning: "bg-amber-50 text-amber-800 border-amber-200",
    active: "bg-emerald-50 text-emerald-800 border-emerald-300",
    completed: "bg-green-100 text-green-900 border-green-300",
    on_hold: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <Badge variant="outline" className={`text-xs uppercase tracking-wide ${map[status] ?? ""}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function TaskStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    in_progress: "bg-amber-50 text-amber-700",
    completed: "bg-emerald-50 text-emerald-700",
    blocked: "bg-red-50 text-red-700",
  };
  return (
    <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${map[status] ?? "bg-muted"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
