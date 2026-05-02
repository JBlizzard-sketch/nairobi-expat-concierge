import { useState } from "react";
import {
  useGetBillingSummary,
  useListAllInvoices,
  useUpdateInvoice,
  useDeleteInvoice,
  getGetBillingSummaryQueryKey,
  getListAllInvoicesQueryKey,
} from "@workspace/api-client-react";
import type { InvoiceWithClient } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  CreditCard, DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle,
  Trash2, ExternalLink, FileText, BarChart2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  draft:     { label: "Draft",     color: "text-slate-600",  bg: "bg-slate-100",  icon: FileText },
  sent:      { label: "Sent",      color: "text-blue-600",   bg: "bg-blue-50",    icon: Clock },
  paid:      { label: "Paid",      color: "text-emerald-600",bg: "bg-emerald-50", icon: CheckCircle2 },
  overdue:   { label: "Overdue",   color: "text-red-600",    bg: "bg-red-50",     icon: AlertCircle },
  cancelled: { label: "Cancelled", color: "text-slate-400",  bg: "bg-slate-50",   icon: Trash2 },
};

const TIER_LABELS: Record<string, string> = {
  individual:         "Individual",
  premium:            "Premium",
  corporate_standard: "Corporate Standard",
  corporate_premium:  "Corporate Premium",
};

const TIER_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];

const STATUS_FLOW: string[] = ["draft", "sent", "paid"];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["draft"]!;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  );
}

export default function Billing() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const summaryQ = useGetBillingSummary({ query: { queryKey: getGetBillingSummaryQueryKey() } });
  const invoicesQ = useListAllInvoices(
    statusFilter !== "all" ? { status: statusFilter } : undefined,
    { query: { queryKey: getListAllInvoicesQueryKey(statusFilter !== "all" ? { status: statusFilter } : undefined) } }
  );

  const updateInvoice = useUpdateInvoice({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetBillingSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getListAllInvoicesQueryKey() });
      },
    },
  });

  const deleteInvoice = useDeleteInvoice({
    mutation: {
      onSuccess: () => {
        toast({ title: "Invoice deleted" });
        qc.invalidateQueries({ queryKey: getGetBillingSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getListAllInvoicesQueryKey() });
      },
    },
  });

  const summary = summaryQ.data;
  const invoices: InvoiceWithClient[] = (invoicesQ.data ?? []) as InvoiceWithClient[];

  function advanceStatus(inv: InvoiceWithClient) {
    const idx = STATUS_FLOW.indexOf(inv.status);
    const next = STATUS_FLOW[idx + 1];
    if (!next) return;
    const updates: Record<string, unknown> = { status: next };
    if (next === "paid") updates["paidAt"] = new Date().toISOString();
    updateInvoice.mutate({ id: inv.relocationId, invoiceId: inv.id, data: updates });
  }

  const tierChartData = (summary?.byTier ?? []).map((t, i) => ({
    name: TIER_LABELS[t.tier] ?? t.tier,
    value: t.totalUsd,
    color: TIER_COLORS[i % TIER_COLORS.length]!,
  }));

  const statusChartData = (summary?.byStatus ?? []).map(s => ({
    name: STATUS_CONFIG[s.status]?.label ?? s.status,
    amount: s.totalUsd,
    fill: s.status === "paid" ? "#10b981" : s.status === "sent" ? "#6366f1" : s.status === "overdue" ? "#ef4444" : "#94a3b8",
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" /> Billing & Invoices
        </h1>
        <p className="text-muted-foreground mt-0.5">Track service package revenue, invoice status, and payment collection</p>
      </div>

      {/* KPI Cards */}
      {summaryQ.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-white">
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Invoiced</p>
              <p className="text-2xl font-bold mt-1">${((summary?.totalInvoiced ?? 0) / 1000).toFixed(0)}k</p>
              <p className="text-xs text-muted-foreground mt-0.5">{summary?.invoiceCount ?? 0} invoices</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Collected</p>
              <p className="text-2xl font-bold mt-1 text-emerald-700">${((summary?.totalCollected ?? 0) / 1000).toFixed(0)}k</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {summary && summary.totalInvoiced > 0
                  ? `${Math.round((summary.totalCollected / summary.totalInvoiced) * 100)}% collection rate`
                  : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outstanding</p>
              <p className="text-2xl font-bold mt-1 text-amber-700">${((summary?.totalOutstanding ?? 0) / 1000).toFixed(0)}k</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sent + overdue</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-white">
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue</p>
              <p className="text-2xl font-bold mt-1 text-red-600">
                ${(((summary?.byStatus ?? []).find(s => s.status === "overdue")?.totalUsd ?? 0) / 1000).toFixed(0)}k
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(summary?.byStatus ?? []).find(s => s.status === "overdue")?.count ?? 0} invoices
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {summary && (summary.byStatus.length > 0 || summary.byTier.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" /> Revenue by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={statusChartData} barSize={36}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Amount"]} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {statusChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Revenue by Package Tier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={tierChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={68}
                    label={({ name, percent }: { name: string; percent: number }) =>
                      percent > 0.05 ? `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%` : ""
                    }
                    labelLine={false}
                  >
                    {tierChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoice Table */}
      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" /> All Invoices
              </CardTitle>
              <CardDescription>Click a row to open the relocation case</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {invoicesQ.isLoading ? (
            <div className="space-y-2 pt-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No invoices yet. Open a relocation case and create the first invoice from the Billing tab.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Invoice #</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Client</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Package</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Due</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(inv.status) + 1];
                    return (
                      <tr
                        key={inv.id}
                        className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => navigate(`/relocations/${inv.relocationId}`)}
                      >
                        <td className="py-3 px-3 font-mono text-xs">{inv.invoiceNumber}</td>
                        <td className="py-3 px-3">
                          <div className="font-medium">{inv.clientName}</div>
                          <div className="text-xs text-muted-foreground">{inv.clientEmail}</div>
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">
                          {TIER_LABELS[inv.packageTier] ?? inv.packageTier}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold">
                          ${inv.amountUsd.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">
                          {inv.dueDate ?? "—"}
                        </td>
                        <td className="py-3 px-3"><StatusBadge status={inv.status} /></td>
                        <td className="py-3 px-3">
                          <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                            {nextStatus && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => advanceStatus(inv)}
                                disabled={updateInvoice.isPending}
                              >
                                Mark {STATUS_CONFIG[nextStatus]?.label}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                              onClick={() => deleteInvoice.mutate({ id: inv.relocationId, invoiceId: inv.id })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground"
                              onClick={() => navigate(`/relocations/${inv.relocationId}`)}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
