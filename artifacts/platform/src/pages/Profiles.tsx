import { useState } from "react";
import { useListProfiles } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Users, Mail, MapPin, Briefcase } from "lucide-react";
import { Link } from "wouter";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profiles() {
  const { data: profiles, isLoading } = useListProfiles();
  const [search, setSearch] = useState("");

  const filteredProfiles = profiles?.filter(profile => {
    return profile.fullName.toLowerCase().includes(search.toLowerCase()) || 
           profile.employer.toLowerCase().includes(search.toLowerCase()) ||
           profile.email.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Expat Profiles</h1>
          <p className="text-muted-foreground mt-1">Intake profiles for arriving expatriates and their families.</p>
        </div>
        <Link href="/profiles/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Profile
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <CardTitle>All Profiles</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, or employer..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Expat Details</th>
                  <th className="px-6 py-4 font-medium">Employment</th>
                  <th className="px-6 py-4 font-medium">Family & Arrival</th>
                  <th className="px-6 py-4 font-medium">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-40" />
                      </td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-24 mb-2" /><Skeleton className="h-4 w-20" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-28 mb-2" /><Skeleton className="h-4 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    </tr>
                  ))
                ) : filteredProfiles?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      <Users className="mx-auto h-8 w-8 mb-3 opacity-20" />
                      <p>No profiles found matching "{search}".</p>
                    </td>
                  </tr>
                ) : (
                  filteredProfiles?.map((profile) => (
                    <tr key={profile.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-base text-foreground group-hover:text-primary transition-colors">
                          {profile.fullName}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {profile.email}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.nationality}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          {profile.employer}
                        </div>
                        <Badge variant="outline" className="mt-1.5 text-[10px] uppercase">{profile.employerType.replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">
                          Size: {profile.familySize} <span className="text-muted-foreground font-normal">(Kids: {profile.schoolAgeChildren})</span>
                        </div>
                        <div className="text-muted-foreground mt-1">
                          Arrival: {formatDate(profile.arrivalDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {formatDate(profile.createdAt)}
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
