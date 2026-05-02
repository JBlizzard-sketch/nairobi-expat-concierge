import { useGetProfile, useCreateRelocation, useListRelocations, getListRelocationsQueryKey, getGetProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { ArrowLeft, Mail, MapPin, Briefcase, Calendar, Users, DollarSign, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ProfileDetail({ id }: { id: string }) {
  const profileId = parseInt(id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile, isLoading } = useGetProfile(profileId, {
    query: { enabled: !!profileId, queryKey: getGetProfileQueryKey(profileId) }
  });

  const { data: allRelocations } = useListRelocations();
  const createRelocation = useCreateRelocation();

  const profileRelocations = allRelocations?.filter(r => r.profileId === profileId) ?? [];

  const handleStartRelocation = () => {
    createRelocation.mutate({
      data: {
        profileId,
        status: "intake",
        stage: "profile_complete",
        packageTier: "corporate_standard",
      }
    }, {
      onSuccess: (relocation) => {
        queryClient.invalidateQueries({ queryKey: getListRelocationsQueryKey() });
        toast({ title: "Relocation case started" });
        setLocation(`/relocations/${relocation.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Could not create relocation case.", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!profile) return <div className="text-muted-foreground py-12 text-center">Profile not found.</div>;

  const neighbourhoods = profile.neighbourhoodPreferences
    ? profile.neighbourhoodPreferences.split(",").map(n => n.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/profiles">
          <Button variant="outline" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{profile.fullName}</h1>
          <p className="text-muted-foreground mt-1">Expat Profile #{profile.id}</p>
        </div>
        <Button onClick={handleStartRelocation} disabled={createRelocation.isPending} data-testid="button-start-relocation">
          <Plus className="h-4 w-4 mr-2" /> New Relocation Case
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Avatar + summary */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
              {getInitials(profile.fullName)}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profile.fullName}</h2>
              <p className="text-sm text-muted-foreground">{profile.nationality}</p>
            </div>
            <Badge variant="outline" className="uppercase text-xs">{profile.employerType.replace(/_/g, " ")}</Badge>
            <div className="w-full text-left space-y-3 pt-2 border-t text-sm">
              <DetailItem icon={<Mail className="h-3.5 w-3.5" />} value={profile.email} />
              <DetailItem icon={<Briefcase className="h-3.5 w-3.5" />} value={profile.employer} />
              <DetailItem icon={<MapPin className="h-3.5 w-3.5" />} value={profile.nationality} />
              <DetailItem icon={<Calendar className="h-3.5 w-3.5" />} value={`Arriving ${formatDate(profile.arrivalDate)}`} />
              <DetailItem icon={<Users className="h-3.5 w-3.5" />} value={`Family of ${profile.familySize} · ${profile.schoolAgeChildren} school-age`} />
              <DetailItem icon={<DollarSign className="h-3.5 w-3.5" />} value={`${formatCurrency(profile.budgetUsd)} / month budget`} />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-4">
          {/* Preferences */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Relocation Preferences</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {neighbourhoods.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Neighbourhood Preferences</span>
                  <div className="flex flex-wrap gap-1.5">
                    {neighbourhoods.map(n => (
                      <span key={n} className="text-xs px-2.5 py-1 bg-accent text-accent-foreground rounded-md capitalize font-medium">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.specificNeeds && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Specific Needs</span>
                  <p className="text-sm leading-relaxed text-foreground">{profile.specificNeeds}</p>
                </div>
              )}
              {!neighbourhoods.length && !profile.specificNeeds && (
                <p className="text-sm text-muted-foreground">No preferences recorded.</p>
              )}
            </CardContent>
          </Card>

          {/* Relocation history */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Relocation Cases</CardTitle>
                <span className="text-sm text-muted-foreground">{profileRelocations.length} total</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {profileRelocations.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No relocation cases yet.
                  <div className="mt-3">
                    <Button variant="outline" size="sm" onClick={handleStartRelocation} disabled={createRelocation.isPending}>
                      Start First Case
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {profileRelocations.map(rel => (
                    <Link key={rel.id} href={`/relocations/${rel.id}`}>
                      <div
                        data-testid={`relocation-link-${rel.id}`}
                        className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium group-hover:text-primary transition-colors">
                            Case #{rel.id} · {rel.packageTier.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-muted-foreground">{rel.assignedTo || "Unassigned"} · {rel.stage.replace(/_/g, " ")}</span>
                        </div>
                        <StatusBadge status={rel.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground">
            Profile created: {formatDate(profile.createdAt)} · Last updated: {formatDate(profile.updatedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    intake: "bg-slate-100 text-slate-700",
    planning: "bg-amber-50 text-amber-800",
    active: "bg-emerald-50 text-emerald-800",
    completed: "bg-green-100 text-green-900",
    on_hold: "bg-red-50 text-red-700",
  };
  return (
    <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded ${map[status] ?? "bg-muted"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
