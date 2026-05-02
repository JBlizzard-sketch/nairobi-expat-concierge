import { useState } from "react";
import { useListVendors, useUpdateVendor } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Plus, Phone, Mail, Link as LinkIcon, ShieldCheck, ShieldAlert, Star, Briefcase } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { getListVendorsQueryKey } from "@workspace/api-client-react";

export default function Vendors() {
  const queryClient = useQueryClient();
  const { data: vendors, isLoading } = useListVendors();
  const updateVendor = useUpdateVendor();
  
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [vettedOnly, setVettedOnly] = useState(false);

  const filteredVendors = vendors?.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(search.toLowerCase()) || 
                          (vendor.contactName && vendor.contactName.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || vendor.category === categoryFilter;
    const matchesVetted = !vettedOnly || vendor.isVetted;
    return matchesSearch && matchesCategory && matchesVetted;
  });

  const handleToggleVetted = (id: number, currentStatus: boolean) => {
    updateVendor.mutate({ id, data: { isVetted: !currentStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
      }
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      car_hire: 'text-chart-1 bg-chart-1/10 border-chart-1/20',
      isp: 'text-chart-2 bg-chart-2/10 border-chart-2/20',
      domestic_agency: 'text-chart-3 bg-chart-3/10 border-chart-3/20',
      bank: 'text-chart-4 bg-chart-4/10 border-chart-4/20',
      mover: 'text-chart-5 bg-chart-5/10 border-chart-5/20',
      healthcare: 'text-destructive bg-destructive/10 border-destructive/20',
      other: 'text-muted-foreground bg-muted border-border'
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Vendor Network</h1>
          <p className="text-muted-foreground mt-1">Directory of service providers and partners.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Vendor
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border rounded-lg shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors or contacts..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="car_hire">Car Hire</SelectItem>
            <SelectItem value="isp">Internet Providers</SelectItem>
            <SelectItem value="domestic_agency">Domestic Agencies</SelectItem>
            <SelectItem value="bank">Banking</SelectItem>
            <SelectItem value="mover">Movers</SelectItem>
            <SelectItem value="healthcare">Healthcare</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2 border rounded-md px-3 bg-background">
          <Switch 
            id="vetted" 
            checked={vettedOnly}
            onCheckedChange={setVettedOnly}
          />
          <Label htmlFor="vetted" className="text-sm font-medium whitespace-nowrap cursor-pointer flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-primary" /> Vetted Only
          </Label>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Provider Details</th>
                  <th className="px-6 py-4 font-medium">Contact Information</th>
                  <th className="px-6 py-4 font-medium">Status & Rating</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-40 mb-2" /><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-4 w-28" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-20 mb-2" /><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredVendors?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      <Briefcase className="mx-auto h-8 w-8 mb-3 opacity-20" />
                      <p>No vendors found matching your filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredVendors?.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                          {vendor.name}
                        </div>
                        <Badge variant="outline" className={`mt-1.5 uppercase text-[10px] ${getCategoryColor(vendor.category)}`}>
                          {vendor.category.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 space-y-1.5">
                        {vendor.contactName && (
                          <div className="font-medium text-foreground">{vendor.contactName}</div>
                        )}
                        <div className="text-muted-foreground space-y-1">
                          {vendor.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {vendor.phone}</div>}
                          {vendor.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> <a href={`mailto:${vendor.email}`} className="hover:text-primary transition-colors">{vendor.email}</a></div>}
                          {vendor.website && <div className="flex items-center gap-1.5"><LinkIcon className="h-3 w-3" /> <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors text-primary/80 line-clamp-1">Website</a></div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-2">
                          {vendor.isVetted ? (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><ShieldCheck className="h-3 w-3 mr-1" /> Vetted</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground bg-muted"><ShieldAlert className="h-3 w-3 mr-1" /> Unvetted</Badge>
                          )}
                        </div>
                        {vendor.rating ? (
                          <div className="flex items-center gap-1 text-chart-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < vendor.rating! ? 'fill-current' : 'text-muted-foreground/30'}`} />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">({vendor.rating}.0)</span>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">No rating</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleToggleVetted(vendor.id, vendor.isVetted)}>
                            {vendor.isVetted ? 'Revoke' : 'Verify'}
                          </Button>
                          <Button variant="outline" size="sm">Edit</Button>
                        </div>
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
