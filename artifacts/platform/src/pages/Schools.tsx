import { useState } from "react";
import { useListSchools } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MapPin, GraduationCap, Plus, Mail, Link as LinkIcon, Users, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Schools() {
  const { data: schools, isLoading } = useListSchools();
  const [search, setSearch] = useState("");
  const [curriculumFilter, setCurriculumFilter] = useState("all");
  const [waitlistOnly, setWaitlistOnly] = useState(false);

  const filteredSchools = schools?.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(search.toLowerCase());
    const matchesCurriculum = curriculumFilter === "all" || school.curriculum === curriculumFilter;
    const matchesWaitlist = !waitlistOnly || school.hasWaitlist;
    return matchesSearch && matchesCurriculum && matchesWaitlist;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Schools Intelligence</h1>
          <p className="text-muted-foreground mt-1">Directory of international schools and curriculums.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add School
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border rounded-lg shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schools..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={curriculumFilter} onValueChange={setCurriculumFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Curriculum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Curriculums</SelectItem>
            <SelectItem value="ib">International Baccalaureate (IB)</SelectItem>
            <SelectItem value="british">British Curriculum</SelectItem>
            <SelectItem value="american">American Curriculum</SelectItem>
            <SelectItem value="kenyan_cbc">Kenyan CBC</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2 border rounded-md px-3 bg-background">
          <Switch 
            id="waitlist" 
            checked={waitlistOnly}
            onCheckedChange={setWaitlistOnly}
          />
          <Label htmlFor="waitlist" className="text-sm font-medium whitespace-nowrap cursor-pointer">
            Has Waitlist
          </Label>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSchools?.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-card/50">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-lg font-medium text-foreground">No schools found</h3>
          <p className="text-muted-foreground">Adjust your filters to see more results.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSchools?.map((school) => (
            <Link key={school.id} href={`/schools/${school.id}`}>
            <Card className="overflow-hidden transition-all hover-elevate flex flex-col cursor-pointer group">
              <CardHeader className="pb-3 flex-none">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="line-clamp-2 leading-tight">{school.name}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span className="capitalize">{school.neighbourhood}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-5 flex-1 flex flex-col justify-between">
                <div className="space-y-4 mb-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                      {school.curriculum.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1 font-normal">
                      <Users className="h-3 w-3" /> Ages {school.ageRangeMin}-{school.ageRangeMax}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 p-3 rounded-md border border-border/50">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Annual Fees</span>
                      <span className="font-semibold">{formatCurrency(school.annualFeesUsd)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Waitlist Status</span>
                      <span className={`font-medium flex items-center gap-1 ${school.hasWaitlist ? 'text-chart-4' : 'text-chart-1'}`}>
                        {school.hasWaitlist ? (
                          <>Yes <span className="text-xs font-normal">({school.waitlistMonths}mo)</span></>
                        ) : 'Open'}
                      </span>
                    </div>
                  </div>
                  
                  {(school.admissionsEmail || school.websiteUrl) && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      {school.admissionsEmail && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <a href={`mailto:${school.admissionsEmail}`} className="hover:text-primary transition-colors line-clamp-1">{school.admissionsEmail}</a>
                        </div>
                      )}
                      {school.websiteUrl && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <LinkIcon className="h-3.5 w-3.5" />
                          <a href={school.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors line-clamp-1 text-primary/80">Visit Website</a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <Button variant="outline" className="w-full mt-auto" tabIndex={-1}>View Details</Button>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
