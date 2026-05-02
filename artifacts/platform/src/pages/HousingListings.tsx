import { useState } from "react";
import { useListHousing } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MapPin, BedDouble, Bath, Shield, Plus, Home as HomeIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function HousingListings() {
  const { data: housing, isLoading } = useListHousing();
  const [search, setSearch] = useState("");
  const [neighbourhoodFilter, setNeighbourhoodFilter] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(true);

  const filteredHousing = housing?.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(search.toLowerCase());
    const matchesNeighbourhood = neighbourhoodFilter === "all" || listing.neighbourhood === neighbourhoodFilter;
    const matchesAvailability = !availableOnly || listing.isAvailable;
    return matchesSearch && matchesNeighbourhood && matchesAvailability;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Housing Intelligence</h1>
          <p className="text-muted-foreground mt-1">Vetted properties for premium relocations.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Property
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border rounded-lg shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={neighbourhoodFilter} onValueChange={setNeighbourhoodFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Neighbourhood" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            <SelectItem value="gigiri">Gigiri</SelectItem>
            <SelectItem value="karen">Karen</SelectItem>
            <SelectItem value="westlands">Westlands</SelectItem>
            <SelectItem value="kilimani">Kilimani</SelectItem>
            <SelectItem value="runda">Runda</SelectItem>
            <SelectItem value="lavington">Lavington</SelectItem>
            <SelectItem value="riverside">Riverside</SelectItem>
            <SelectItem value="muthaiga">Muthaiga</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2 border rounded-md px-3 bg-background">
          <Switch 
            id="available" 
            checked={availableOnly}
            onCheckedChange={setAvailableOnly}
          />
          <Label htmlFor="available" className="text-sm font-medium whitespace-nowrap cursor-pointer">
            Available Only
          </Label>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full rounded-none" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredHousing?.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-card/50">
          <HomeIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-lg font-medium text-foreground">No properties found</h3>
          <p className="text-muted-foreground">Adjust your filters to see more results.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredHousing?.map((listing) => (
            <Link key={listing.id} href={`/housing/${listing.id}`}>
            <Card className={`overflow-hidden transition-all hover-elevate cursor-pointer group ${!listing.isAvailable ? 'opacity-75 grayscale-[0.2]' : ''}`}>
              <div className="aspect-video w-full bg-muted relative border-b">
                {listing.imageUrl ? (
                  <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                    <HomeIcon className="h-12 w-12" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
                  <Badge variant={listing.isAvailable ? "default" : "secondary"} className="shadow-sm">
                    {listing.isAvailable ? "Available" : "Leased"}
                  </Badge>
                  <div className="bg-background/90 backdrop-blur text-foreground px-2 py-1 rounded text-xs font-bold shadow-sm flex items-center gap-1 border">
                    <Shield className="h-3 w-3 text-primary" /> Lvl {listing.securityRating} Sec
                  </div>
                </div>
              </div>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">{listing.title}</h3>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span className="capitalize">{listing.neighbourhood}</span>
                      <span className="mx-2">•</span>
                      <span className="capitalize">{listing.propertyType}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <div className="text-lg font-bold text-primary">
                    {formatCurrency(listing.rentUsdPerMonth)} <span className="text-xs text-muted-foreground font-normal">/mo</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded">
                    <div className="flex items-center gap-1"><BedDouble className="h-4 w-4" /> {listing.bedrooms}</div>
                    <div className="flex items-center gap-1"><Bath className="h-4 w-4" /> {listing.bathrooms}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
