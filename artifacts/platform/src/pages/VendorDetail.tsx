import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetVendor, useUpdateVendor, useDeleteVendor, getListVendorsQueryKey, getGetVendorQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Phone, Mail, Globe, ShieldCheck, ShieldAlert,
  Star, Pencil, Trash2, Briefcase,
} from "lucide-react";

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
  car_hire: "bg-blue-50 text-blue-700 border-blue-200",
  isp: "bg-emerald-50 text-emerald-700 border-emerald-200",
  domestic_agency: "bg-violet-50 text-violet-700 border-violet-200",
  bank: "bg-amber-50 text-amber-700 border-amber-200",
  mover: "bg-orange-50 text-orange-700 border-orange-200",
  healthcare: "bg-red-50 text-red-700 border-red-200",
  legal: "bg-slate-50 text-slate-700 border-slate-200",
  security: "bg-zinc-50 text-zinc-700 border-zinc-200",
  other: "bg-muted text-muted-foreground border-border",
};

export default function VendorDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const vendorId = parseInt(id);

  const { data: vendor, isLoading } = useGetVendor(vendorId, {
    query: { enabled: !!vendorId, queryKey: getGetVendorQueryKey(vendorId) }
  });

  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [form, setForm] = useState({
    name: "", category: "other", contactName: "", phone: "", email: "",
    website: "", isVetted: false, rating: "", notes: "",
  });

  const openEdit = () => {
    if (!vendor) return;
    setForm({
      name: vendor.name,
      category: vendor.category,
      contactName: vendor.contactName ?? "",
      phone: vendor.phone ?? "",
      email: vendor.email ?? "",
      website: vendor.website ?? "",
      isVetted: vendor.isVetted,
      rating: vendor.rating?.toString() ?? "",
      notes: vendor.notes ?? "",
    });
    setEditOpen(true);
  };

  const handleSave = () => {
    updateVendor.mutate(
      {
        id: vendorId,
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
          setEditOpen(false);
          toast({ title: "Vendor updated" });
        },
      }
    );
  };

  const handleDelete = () => {
    deleteVendor.mutate(
      { id: vendorId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
          toast({ title: "Vendor deleted" });
          navigate("/vendors");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!vendor) return <div className="text-muted-foreground py-12 text-center">Vendor not found.</div>;

  const catLabel = CATEGORY_OPTIONS.find(o => o.value === vendor.category)?.label ?? vendor.category;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/vendors">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{vendor.name}</h1>
            <Badge variant="outline" className={`uppercase text-[10px] tracking-wide ${CATEGORY_STYLES[vendor.category] ?? ""}`}>
              {catLabel}
            </Badge>
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
          {vendor.rating && (
            <div className="flex items-center gap-1 mt-1.5 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < vendor.rating! ? "fill-current" : "text-muted-foreground/20"}`} />
              ))}
              <span className="text-sm text-muted-foreground ml-1">{vendor.rating}.0 / 5</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={openEdit}>
            <Pencil className="h-4 w-4 mr-1.5" /> Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Details */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" /> Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {vendor.contactName && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Contact Person</p>
                <p className="font-medium">{vendor.contactName}</p>
              </div>
            )}
            {vendor.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`tel:${vendor.phone}`} className="hover:text-primary transition-colors">{vendor.phone}</a>
              </div>
            )}
            {vendor.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${vendor.email}`} className="hover:text-primary transition-colors">{vendor.email}</a>
              </div>
            )}
            {vendor.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline line-clamp-1">
                  {vendor.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            {!vendor.contactName && !vendor.phone && !vendor.email && !vendor.website && (
              <p className="text-sm text-muted-foreground">No contact information on file.</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Concierge Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {vendor.notes || "No notes recorded for this vendor."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
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
                <Input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch
                  id="edit-vetted"
                  checked={form.isVetted}
                  onCheckedChange={v => setForm(f => ({ ...f, isVetted: v }))}
                />
                <Label htmlFor="edit-vetted" className="flex items-center gap-1.5 cursor-pointer">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Vetted provider
                </Label>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="min-h-[80px] text-sm"
                  placeholder="Internal notes about this vendor..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.category || updateVendor.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{vendor.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteVendor.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
