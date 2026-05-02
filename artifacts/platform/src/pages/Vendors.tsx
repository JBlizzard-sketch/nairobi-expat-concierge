import { useState } from "react";
import { Link } from "wouter";
import { useListVendors, useCreateVendor, useUpdateVendor, getListVendorsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Search, Plus, Phone, Mail, Link as LinkIcon, ShieldCheck, ShieldAlert, Star, Briefcase, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_OPTIONS = [
  { value: "car_hire", label: "Car Hire" },
  { value: "isp", label: "Internet Provider" },
  { value: "domestic_agency", label: "Domestic Agency" },
  { value: "bank", label: "Banking" },
  { value: "mover", label: "Movers" },
  { value: "healthcare", label: "Healthcare" },
  { value: "legal", label: "Legal" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
];

const CATEGORY_STYLES: Record<string, string> = {
  car_hire: "text-blue-700 bg-blue-50 border-blue-200",
  isp: "text-emerald-700 bg-emerald-50 border-emerald-200",
  domestic_agency: "text-violet-700 bg-violet-50 border-violet-200",
  bank: "text-amber-700 bg-amber-50 border-amber-200",
  mover: "text-orange-700 bg-orange-50 border-orange-200",
  healthcare: "text-red-700 bg-red-50 border-red-200",
  legal: "text-slate-700 bg-slate-50 border-slate-200",
  security: "text-zinc-700 bg-zinc-50 border-zinc-200",
  other: "text-muted-foreground bg-muted border-border",
};

const EMPTY_FORM = {
  name: "", category: "other", contactName: "", phone: "", email: "",
  website: "", isVetted: false, rating: "", notes: "",
};

export default function Vendors() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: vendors, isLoading } = useListVendors();
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [vettedOnly, setVettedOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const filtered = vendors?.filter(v => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.contactName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || v.category === categoryFilter;
    const matchesVetted = !vettedOnly || v.isVetted;
    return matchesSearch && matchesCategory && matchesVetted;
  });

  const handleToggleVetted = (id: number, current: boolean) => {
    updateVendor.mutate({ id, data: { isVetted: !current } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() }),
    });
  };

  const handleCreate = () => {
    createVendor.mutate(
      {
        data: {
          name: form.name,
          category: form.category,
          contactName: form.contactName || null,
          phone: form.phone || null,
          email: form.email || null,
          website: form.website || null,
          isVetted: form.isVetted,
          rating: form.rating ? parseInt(form.rating) : null,
          notes: form.notes || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
          setAddOpen(false);
          setForm({ ...EMPTY_FORM });
          toast({ title: "Vendor added to network" });
        },
      }
    );
  };

  const vettedCount = vendors?.filter(v => v.isVetted).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Network</h1>
          <p className="text-muted-foreground mt-1">
            {vendors?.length ?? 0} providers · {vettedCount} vetted
          </p>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY_FORM }); setAddOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Vendor
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card border rounded-lg shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors or contacts..."
            className="pl-8"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORY_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 border rounded-md px-3 bg-background h-10">
          <Switch id="vetted" checked={vettedOnly} onCheckedChange={setVettedOnly} />
          <Label htmlFor="vetted" className="text-sm font-medium whitespace-nowrap cursor-pointer flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-primary" /> Vetted Only
          </Label>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Provider</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
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
                      <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-28 ml-auto" /></td>
                    </tr>
                  ))
                ) : filtered?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      <Briefcase className="mx-auto h-8 w-8 mb-3 opacity-20" />
                      <p>No vendors found matching your filters.</p>
                    </td>
                  </tr>
                ) : (
                  filtered?.map(vendor => (
                    <tr key={vendor.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <Link href={`/vendors/${vendor.id}`}>
                          <span className="font-semibold text-base text-foreground group-hover:text-primary transition-colors cursor-pointer hover:underline">
                            {vendor.name}
                          </span>
                        </Link>
                        <div className="mt-1.5">
                          <Badge
                            variant="outline"
                            className={`uppercase text-[10px] tracking-wide ${CATEGORY_STYLES[vendor.category] ?? ""}`}
                          >
                            {CATEGORY_OPTIONS.find(o => o.value === vendor.category)?.label ?? vendor.category}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4 space-y-1.5">
                        {vendor.contactName && (
                          <div className="font-medium text-foreground">{vendor.contactName}</div>
                        )}
                        <div className="text-muted-foreground space-y-1">
                          {vendor.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3" /> {vendor.phone}
                            </div>
                          )}
                          {vendor.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3" />
                              <a href={`mailto:${vendor.email}`} className="hover:text-primary">{vendor.email}</a>
                            </div>
                          )}
                          {vendor.website && (
                            <div className="flex items-center gap-1.5">
                              <LinkIcon className="h-3 w-3" />
                              <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary text-primary/80">
                                Website
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-2">
                          {vendor.isVetted ? (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              <ShieldCheck className="h-3 w-3 mr-1" /> Vetted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground bg-muted">
                              <ShieldAlert className="h-3 w-3 mr-1" /> Unvetted
                            </Badge>
                          )}
                        </div>
                        {vendor.rating ? (
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < vendor.rating! ? "fill-current" : "text-muted-foreground/20"}`} />
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">({vendor.rating}.0)</span>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">No rating</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleVetted(vendor.id, vendor.isVetted)}
                            disabled={updateVendor.isPending}
                          >
                            {vendor.isVetted ? "Revoke" : "Verify"}
                          </Button>
                          <Link href={`/vendors/${vendor.id}`}>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                          </Link>
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

      {/* Add Vendor Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Vendor to Network</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Name *</Label>
                <Input
                  placeholder="e.g. Budget Rent a Car Kenya"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rating (1–5)</Label>
                <Select value={form.rating} onValueChange={v => setForm(f => ({ ...f, rating: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} ★</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input
                  value={form.contactName}
                  onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                  placeholder="Primary contact person"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+254 700 000 000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input
                  value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch
                  id="add-vetted"
                  checked={form.isVetted}
                  onCheckedChange={v => setForm(f => ({ ...f, isVetted: v }))}
                />
                <Label htmlFor="add-vetted" className="flex items-center gap-1.5 cursor-pointer">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Mark as vetted provider
                </Label>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Internal Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="min-h-[80px] text-sm"
                  placeholder="Rates, reliability, expat community feedback..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name || !form.category || createVendor.isPending}>
              Add Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
