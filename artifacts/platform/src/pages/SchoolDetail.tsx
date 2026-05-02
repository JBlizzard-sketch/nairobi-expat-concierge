import { useState } from "react";
import {
  useGetSchool, getGetSchoolQueryKey,
  useListRelocations, getListRelocationsQueryKey,
  useCreateSchoolApplication, getListSchoolApplicationsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft, MapPin, GraduationCap, Mail, Link as LinkIcon,
  Users, Clock, DollarSign, CheckCircle2, AlertTriangle,
  BookOpen, Star, FilePlus,
} from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const CURRICULUM_INFO: Record<string, { label: string; desc: string; color: string }> = {
  ib: {
    label: "International Baccalaureate (IB)",
    desc: "Globally recognised, inquiry-based programme. Strong university preparation. Accepted worldwide including UK, US, Kenya and Europe. Ideal for highly mobile families.",
    color: "bg-blue-50 text-blue-800 border-blue-200",
  },
  british: {
    label: "British Curriculum",
    desc: "IGCSE and A-Level framework. Excellent preparation for UK and Commonwealth universities. Widely respected and structured. Familiar to British and Commonwealth nationals.",
    color: "bg-red-50 text-red-800 border-red-200",
  },
  american: {
    label: "American Curriculum",
    desc: "High school diploma and AP programme. Ideal preparation for US and Canadian universities. Familiar to American families. Increasingly accepted globally.",
    color: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
  kenyan_cbc: {
    label: "Kenyan CBC",
    desc: "Kenya's Competency-Based Curriculum. Locally accredited and ideal for families planning long-term Nairobi residence. Affordable and community-integrated.",
    color: "bg-green-50 text-green-800 border-green-200",
  },
};

const NEIGHBOURHOOD_CONTEXT: Record<string, string> = {
  gigiri: "UN Village — diplomatic enclave, extremely safe, close to UN HQ and embassies.",
  karen: "Leafy suburb with large properties. Known for top international schools and relaxed lifestyle.",
  westlands: "Nairobi's commercial hub. Dense traffic but excellent amenities and restaurants.",
  kilimani: "Central, walkable. Popular with NGO staff and young professionals.",
  lavington: "Quiet residential. Easy access to city centre. Preferred by NGO and embassy staff.",
};

function ApplyForCaseDialog({ schoolId, schoolName, open, onClose }: {
  schoolId: number;
  schoolName: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedRelocationId, setSelectedRelocationId] = useState<string>("");

  const { data: relocations, isLoading } = useListRelocations({
    query: { queryKey: getListRelocationsQueryKey() }
  });

  const createApplication = useCreateSchoolApplication();

  const handleApply = () => {
    if (!selectedRelocationId) return;
    const relId = parseInt(selectedRelocationId);
    createApplication.mutate(
      { id: relId, data: { schoolId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSchoolApplicationsQueryKey(relId) });
          toast({ title: "School added to case", description: `${schoolName} added to relocation case #${relId}.` });
          setSelectedRelocationId("");
          onClose();
        },
        onError: () => {
          toast({ title: "Could not add school", description: "This school may already be in the applications for this case.", variant: "destructive" });
        }
      }
    );
  };

  const activeRelocations = relocations?.filter(r => r.status !== "completed") ?? [];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus className="h-5 w-5 text-primary" />
            Add to Case Applications
          </DialogTitle>
          <DialogDescription>
            Add <strong>{schoolName}</strong> to a relocation case's school applications.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <label className="text-sm font-medium">Select Relocation Case</label>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : activeRelocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active relocation cases found.</p>
          ) : (
            <Select value={selectedRelocationId} onValueChange={setSelectedRelocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a relocation case…" />
              </SelectTrigger>
              <SelectContent>
                {activeRelocations.map(r => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    <span className="font-medium">{r.profile.fullName}</span>
                    <span className="text-muted-foreground ml-2 text-xs">#{r.id} · {r.status}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleApply}
            disabled={!selectedRelocationId || createApplication.isPending}
          >
            {createApplication.isPending ? "Adding…" : "Add Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SchoolDetail({ id }: { id: string }) {
  const schoolId = parseInt(id);
  const [applyOpen, setApplyOpen] = useState(false);

  const { data: school, isLoading } = useGetSchool(schoolId, {
    query: { enabled: !!schoolId, queryKey: getGetSchoolQueryKey(schoolId) }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!school) return <div className="text-muted-foreground py-12 text-center">School not found.</div>;

  const currInfo = CURRICULUM_INFO[school.curriculum];
  const neighbourhoodCtx = NEIGHBOURHOOD_CONTEXT[school.neighbourhood ?? ""];

  return (
    <div className="space-y-6">
      {school && (
        <ApplyForCaseDialog
          schoolId={school.id}
          schoolName={school.name}
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/schools">
          <Button variant="outline" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{school.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-1 flex-wrap">
            {school.neighbourhood && (
              <>
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="capitalize">{school.neighbourhood}</span>
                <span>·</span>
              </>
            )}
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>Ages {school.ageRangeMin}–{school.ageRangeMax}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-primary">{formatCurrency(school.annualFeesUsd)}</div>
          <div className="text-sm text-muted-foreground">per year</div>
        </div>
      </div>

      {/* Curriculum banner */}
      {currInfo && (
        <div className={`rounded-xl border-2 p-5 ${currInfo.color}`}>
          <div className="flex items-start gap-3">
            <GraduationCap className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-base">{currInfo.label}</div>
              <p className="text-sm mt-1 leading-relaxed opacity-90">{currInfo.desc}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Annual Fees" value={formatCurrency(school.annualFeesUsd)} icon={<DollarSign className="h-5 w-5" />} />
            <StatCard label="Age Range" value={`${school.ageRangeMin}–${school.ageRangeMax} yrs`} icon={<Users className="h-5 w-5" />} />
            <StatCard
              label="Waitlist"
              value={school.hasWaitlist ? `${school.waitlistMonths ?? "?"} months` : "Open"}
              icon={<Clock className="h-5 w-5" />}
              highlight={school.hasWaitlist}
            />
            <StatCard label="Curriculum" value={school.curriculum.replace(/_/g, " ").toUpperCase()} icon={<BookOpen className="h-5 w-5" />} />
          </div>

          {/* Admissions guidance */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Admissions Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className={`flex items-start gap-3 p-3 rounded-lg ${school.hasWaitlist ? "bg-amber-50 border border-amber-200" : "bg-emerald-50 border border-emerald-200"}`}>
                {school.hasWaitlist ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm">
                  {school.hasWaitlist ? (
                    <>
                      <span className="font-semibold text-amber-800">Waitlist Active</span>
                      <p className="text-amber-700 mt-0.5">
                        Current wait time is approximately <strong>{school.waitlistMonths} months</strong>. We recommend applying immediately upon profile creation. Early placement is critical for this school.
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-emerald-800">Open Admissions</span>
                      <p className="text-emerald-700 mt-0.5">
                        No current waitlist. Places are available — contact admissions to confirm availability for your child's year group and arrange an assessment visit.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {school.admissionsContact && (
                <div className="text-sm space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Primary Contact</span>
                  <div className="font-medium">{school.admissionsContact}</div>
                </div>
              )}

              <div className="space-y-2 text-sm">
                {school.admissionsEmail && (
                  <a href={`mailto:${school.admissionsEmail}`} className="flex items-center gap-2 text-primary hover:underline">
                    <Mail className="h-4 w-4" /> {school.admissionsEmail}
                  </a>
                )}
                {school.websiteUrl && (
                  <a href={school.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                    <LinkIcon className="h-4 w-4" /> {school.websiteUrl.replace(/^https?:\/\/www\./, "")}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Concierge tips */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" /> Concierge Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <ul className="space-y-2 text-sm text-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  Request the school's prospectus and fee structure at initial enquiry — fees often increase annually.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  Most schools require previous school reports (last 2 years), passport copies, immunisation records, and a reference letter.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  {school.hasWaitlist
                    ? "Apply immediately — even with a waitlist, families sometimes withdraw late. Early applications receive priority."
                    : "Arrange a school tour before committing — most schools are very receptive to expat families and offer tailored inductions."}
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  Annual fees are typically paid in three instalments (per term). Confirm invoice timing against your employer's education allowance cycle.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Neighbourhood context */}
          {neighbourhoodCtx && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Location — {school.neighbourhood?.charAt(0).toUpperCase()}{school.neighbourhood?.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-foreground leading-relaxed">{neighbourhoodCtx}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Apply for Case CTA */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-5 pb-5 text-center space-y-3">
              <FilePlus className="h-8 w-8 text-primary mx-auto" />
              <div>
                <div className="font-bold text-base">Add to Case Applications</div>
                <div className="text-xs text-muted-foreground mt-0.5">Track this school in a relocation case</div>
              </div>
              <Button className="w-full" onClick={() => setApplyOpen(true)}>
                <FilePlus className="h-4 w-4 mr-2" />
                Add to Case
              </Button>
            </CardContent>
          </Card>

          {/* Admissions CTA */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-5 pb-5 space-y-4">
              <div className="text-center">
                <GraduationCap className="h-10 w-10 text-primary mx-auto" />
                <div className="font-bold text-lg mt-2">{school.hasWaitlist ? "Apply Now" : "Book a Tour"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {school.hasWaitlist ? "Don't delay — waitlist spots fill quickly" : "Places available"}
                </div>
              </div>
              {school.admissionsEmail && (
                <Button className="w-full" asChild>
                  <a href={`mailto:${school.admissionsEmail}?subject=Admissions Enquiry – ${school.name}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email Admissions
                  </a>
                </Button>
              )}
              {school.websiteUrl && (
                <Button className="w-full" variant="outline" asChild>
                  <a href={school.websiteUrl} target="_blank" rel="noopener noreferrer">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Visit Website
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Quick facts */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Quick Reference</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">School ID</span>
                <span className="font-medium">#{school.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Curriculum</span>
                <span className="font-medium uppercase">{school.curriculum.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Age Range</span>
                <span className="font-medium">{school.ageRangeMin}–{school.ageRangeMax} years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Annual Fees</span>
                <span className="font-medium">{formatCurrency(school.annualFeesUsd)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waitlist</span>
                <span className={`font-medium ${school.hasWaitlist ? "text-amber-600" : "text-emerald-700"}`}>
                  {school.hasWaitlist ? `${school.waitlistMonths}mo wait` : "Open"}
                </span>
              </div>
              {school.neighbourhood && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium capitalize">{school.neighbourhood}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, highlight,
}: {
  label: string; value: string; icon: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className={`border rounded-lg p-3 space-y-1 ${highlight ? "border-amber-300 bg-amber-50" : "bg-card"}`}>
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
        <span className={highlight ? "text-amber-600" : "text-primary"}>{icon}</span>
        {label}
      </div>
      <div className={`font-bold text-sm leading-tight ${highlight ? "text-amber-700" : ""}`}>{value}</div>
    </div>
  );
}
