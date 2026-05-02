import { useState } from "react";
import {
  useGetHousingListing, getGetHousingListingQueryKey,
  useListRelocations, getListRelocationsQueryKey,
  useCreateHousingShortlist, getListHousingShortlistsQueryKey,
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
  ArrowLeft, MapPin, BedDouble, Bath, Shield, Home as HomeIcon,
  Phone, User, DollarSign, CheckCircle2, XCircle, Wifi, Car,
  Zap, Droplets, Dumbbell, TreePine, Waves, Tv2, Star,
} from "lucide-react";
import { parseTextList } from "@/lib/utils";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  borehole: <Droplets className="h-3.5 w-3.5" />,
  backup_generator: <Zap className="h-3.5 w-3.5" />,
  swimming_pool: <Waves className="h-3.5 w-3.5" />,
  staff_quarters: <User className="h-3.5 w-3.5" />,
  dstv: <Tv2 className="h-3.5 w-3.5" />,
  gym: <Dumbbell className="h-3.5 w-3.5" />,
  fibre_ready: <Wifi className="h-3.5 w-3.5" />,
  rooftop_pool: <Waves className="h-3.5 w-3.5" />,
  rooftop_terrace: <TreePine className="h-3.5 w-3.5" />,
  parking: <Car className="h-3.5 w-3.5" />,
  acre_garden: <TreePine className="h-3.5 w-3.5" />,
  garden: <TreePine className="h-3.5 w-3.5" />,
  concierge: <User className="h-3.5 w-3.5" />,
  tennis_court: <Dumbbell className="h-3.5 w-3.5" />,
  wine_cellar: <Droplets className="h-3.5 w-3.5" />,
  panoramic_views: <TreePine className="h-3.5 w-3.5" />,
};

const NEIGHBOURHOOD_CONTEXT: Record<string, string> = {
  gigiri: "UN Village area — diplomatic hub, close to UN HQ, embassies. Exceptionally high security. Excellent for families.",
  runda: "Prestigious residential estate north of Gigiri. Private roads, mature vegetation, quiet and secure. Popular with senior diplomats.",
  karen: "Leafy suburb with large plots, British-style living. Home to Karen Blixen Museum. Top international schools nearby.",
  westlands: "Nairobi's commercial and social hub. Excellent restaurants, shopping, nightlife. Dense expat social scene.",
  kilimani: "Central, walkable neighbourhood. Mix of apartments and townhouses. Close to Yaya Centre and Hurlingham.",
  lavington: "Quiet, residential area popular with NGO and embassy staff. Good security, easy city access.",
  riverside: "Upscale riverside apartments along Nairobi River. Modern buildings, panoramic city views.",
  muthaiga: "Nairobi's most exclusive enclave — old-money estates, Muthaiga Golf Club. Embassies and senior corporate.",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  villa: "Detached Villa",
  townhouse: "Townhouse",
  apartment: "Apartment",
  serviced_apartment: "Serviced Apartment",
};

function SecurityStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Shield
          key={i}
          className={`h-4 w-4 ${i < rating ? "text-primary fill-primary" : "text-muted-foreground/20"}`}
        />
      ))}
      <span className="text-sm text-muted-foreground ml-1">Level {rating} / 5</span>
    </div>
  );
}

function AmenityBadge({ amenity }: { amenity: string }) {
  const label = amenity.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-accent text-accent-foreground rounded-md font-medium border border-border/50">
      {AMENITY_ICONS[amenity] ?? <CheckCircle2 className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function ShortlistDialog({ listingId, listingTitle, open, onClose }: {
  listingId: number;
  listingTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedRelocationId, setSelectedRelocationId] = useState<string>("");

  const { data: relocations, isLoading } = useListRelocations({
    query: { queryKey: getListRelocationsQueryKey() }
  });

  const createShortlist = useCreateHousingShortlist();

  const handleAdd = () => {
    if (!selectedRelocationId) return;
    const relId = parseInt(selectedRelocationId);
    createShortlist.mutate(
      { id: relId, data: { housingId: listingId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListHousingShortlistsQueryKey(relId) });
          toast({ title: "Property shortlisted", description: `Added to relocation case #${relId}.` });
          setSelectedRelocationId("");
          onClose();
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Already shortlisted for this case.";
          toast({ title: "Could not shortlist", description: msg, variant: "destructive" });
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
            <Star className="h-5 w-5 text-primary" />
            Shortlist for a Case
          </DialogTitle>
          <DialogDescription>
            Add <strong>{listingTitle}</strong> to a relocation case shortlist.
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
            onClick={handleAdd}
            disabled={!selectedRelocationId || createShortlist.isPending}
          >
            {createShortlist.isPending ? "Adding…" : "Add to Shortlist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HousingDetail({ id }: { id: string }) {
  const listingId = parseInt(id);
  const [shortlistOpen, setShortlistOpen] = useState(false);

  const { data: listing, isLoading } = useGetHousingListing(listingId, {
    query: { enabled: !!listingId, queryKey: getGetHousingListingQueryKey(listingId) }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!listing) return <div className="text-muted-foreground py-12 text-center">Property not found.</div>;

  const amenities = parseTextList(listing.amenities);
  const neighbourhoodCtx = NEIGHBOURHOOD_CONTEXT[listing.neighbourhood];

  return (
    <div className="space-y-6">
      {listing && (
        <ShortlistDialog
          listingId={listing.id}
          listingTitle={listing.title}
          open={shortlistOpen}
          onClose={() => setShortlistOpen(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/housing">
          <Button variant="outline" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{listing.title}</h1>
            <Badge variant={listing.isAvailable ? "default" : "secondary"} className="text-xs uppercase">
              {listing.isAvailable ? "Available" : "Leased"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <MapPin className="h-4 w-4" />
            <span className="capitalize font-medium">{listing.neighbourhood}</span>
            <span>·</span>
            <span>{PROPERTY_TYPE_LABELS[listing.propertyType] ?? listing.propertyType}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-bold text-primary">{formatCurrency(listing.rentUsdPerMonth)}</div>
          <div className="text-sm text-muted-foreground">per month</div>
        </div>
      </div>

      {/* Hero placeholder */}
      <div className="aspect-[21/8] w-full rounded-xl bg-muted border flex items-center justify-center overflow-hidden relative">
        <HomeIcon className="h-24 w-24 text-muted-foreground/10" />
        <div className="absolute bottom-4 left-4 flex gap-2">
          <div className="bg-background/90 backdrop-blur px-3 py-1.5 rounded-md border text-sm font-medium flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-primary" />
            {listing.bedrooms} Bedrooms
          </div>
          <div className="bg-background/90 backdrop-blur px-3 py-1.5 rounded-md border text-sm font-medium flex items-center gap-2">
            <Bath className="h-4 w-4 text-primary" />
            {listing.bathrooms} Bathrooms
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Bedrooms" value={String(listing.bedrooms)} icon={<BedDouble className="h-5 w-5" />} />
            <StatCard label="Bathrooms" value={String(listing.bathrooms)} icon={<Bath className="h-5 w-5" />} />
            <StatCard label="Type" value={PROPERTY_TYPE_LABELS[listing.propertyType] ?? listing.propertyType} icon={<HomeIcon className="h-5 w-5" />} />
            <StatCard label="Monthly Rent" value={formatCurrency(listing.rentUsdPerMonth)} icon={<DollarSign className="h-5 w-5" />} />
          </div>

          {/* Amenities */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Property Amenities</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {amenities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {amenities.map(a => <AmenityBadge key={a} amenity={a} />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No amenities listed.</p>
              )}
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Security Rating
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <SecurityStars rating={listing.securityRating} />
              <p className="text-sm text-muted-foreground">
                {listing.securityRating >= 5
                  ? "Exceptional — 24/7 manned gate, CCTV, electric fence, rapid response patrol."
                  : listing.securityRating >= 4
                    ? "Strong — 24/7 gate security, CCTV, alarm system linked to rapid response."
                    : listing.securityRating >= 3
                      ? "Standard — Manned gate during daytime, CCTV coverage on perimeter."
                      : "Basic — Entry intercom, standard lock-and-key security."}
              </p>
            </CardContent>
          </Card>

          {/* Neighbourhood context */}
          {neighbourhoodCtx && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  About {listing.neighbourhood.charAt(0).toUpperCase() + listing.neighbourhood.slice(1)}
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
          {/* Shortlist CTA */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-5 pb-5 text-center space-y-3">
              <Star className="h-8 w-8 text-primary mx-auto" />
              <div>
                <div className="font-bold text-base">Add to Case Shortlist</div>
                <div className="text-xs text-muted-foreground mt-0.5">Attach this property to a relocation case</div>
              </div>
              <Button className="w-full" onClick={() => setShortlistOpen(true)}>
                <Star className="h-4 w-4 mr-2" />
                Shortlist for Case
              </Button>
            </CardContent>
          </Card>

          {/* Availability card */}
          <Card className={`border-2 ${listing.isAvailable ? "border-primary/30 bg-primary/5" : "border-muted bg-muted/30"}`}>
            <CardContent className="pt-5 pb-5 text-center space-y-3">
              {listing.isAvailable ? (
                <>
                  <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                  <div>
                    <div className="font-bold text-lg text-primary">Available Now</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Ready for immediate viewing</div>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                  <div>
                    <div className="font-bold text-lg text-foreground">Currently Leased</div>
                    <div className="text-xs text-muted-foreground mt-0.5">May become available — contact landlord</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Landlord contact */}
          {(listing.landlordName || listing.landlordPhone) && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">Landlord Contact</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {listing.landlordName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{listing.landlordName}</span>
                  </div>
                )}
                {listing.landlordPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${listing.landlordPhone}`} className="text-primary hover:underline">
                      {listing.landlordPhone}
                    </a>
                  </div>
                )}
                <Separator />
                <Button className="w-full" variant={listing.isAvailable ? "default" : "outline"} asChild>
                  <a href={`tel:${listing.landlordPhone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    {listing.isAvailable ? "Arrange Viewing" : "Enquire Availability"}
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick facts */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Quick Facts</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Property ID</span>
                <span className="font-medium">#{listing.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Neighbourhood</span>
                <span className="font-medium capitalize">{listing.neighbourhood}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Property Type</span>
                <span className="font-medium">{PROPERTY_TYPE_LABELS[listing.propertyType] ?? listing.propertyType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Security Level</span>
                <span className="font-medium">{listing.securityRating} / 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-medium ${listing.isAvailable ? "text-primary" : "text-muted-foreground"}`}>
                  {listing.isAvailable ? "Available" : "Leased"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-3 bg-card space-y-1">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="font-bold text-sm leading-tight">{value}</div>
    </div>
  );
}
