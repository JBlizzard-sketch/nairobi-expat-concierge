import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable, relocationsTable, profilesTable, activityLogsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { CreateInvoiceBody, UpdateInvoiceBody } from "@workspace/api-zod";
import { toJson } from "../lib/serialize";

export const invoicesRouter = Router();

const PACKAGE_TIERS: Record<string, { label: string }> = {
  individual:          { label: "Individual" },
  premium:             { label: "Premium" },
  corporate_standard:  { label: "Corporate Standard" },
  corporate_premium:   { label: "Corporate Premium" },
};

function parseLineItems(raw: string): unknown[] {
  try { return JSON.parse(raw) as unknown[]; }
  catch { return []; }
}

function buildInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${rand}`;
}

// GET /billing/summary
invoicesRouter.get("/billing/summary", async (req, res) => {
  const rows = await db
    .select({
      id: invoicesTable.id,
      relocationId: invoicesTable.relocationId,
      invoiceNumber: invoicesTable.invoiceNumber,
      status: invoicesTable.status,
      packageTier: invoicesTable.packageTier,
      amountUsd: invoicesTable.amountUsd,
      dueDate: invoicesTable.dueDate,
      paidAt: invoicesTable.paidAt,
      notes: invoicesTable.notes,
      lineItems: invoicesTable.lineItems,
      createdAt: invoicesTable.createdAt,
      updatedAt: invoicesTable.updatedAt,
      clientName: profilesTable.fullName,
      clientEmail: profilesTable.email,
    })
    .from(invoicesTable)
    .leftJoin(relocationsTable, eq(invoicesTable.relocationId, relocationsTable.id))
    .leftJoin(profilesTable, eq(relocationsTable.profileId, profilesTable.id))
    .orderBy(desc(invoicesTable.createdAt));

  const totalInvoiced = rows.reduce((s, r) => s + r.amountUsd, 0);
  const totalCollected = rows.filter(r => r.status === "paid").reduce((s, r) => s + r.amountUsd, 0);
  const totalOutstanding = rows.filter(r => ["sent", "overdue"].includes(r.status)).reduce((s, r) => s + r.amountUsd, 0);

  const byStatusMap = new Map<string, { count: number; totalUsd: number }>();
  const byTierMap = new Map<string, { count: number; totalUsd: number }>();

  for (const r of rows) {
    const st = byStatusMap.get(r.status) ?? { count: 0, totalUsd: 0 };
    st.count++; st.totalUsd += r.amountUsd;
    byStatusMap.set(r.status, st);

    const ti = byTierMap.get(r.packageTier) ?? { count: 0, totalUsd: 0 };
    ti.count++; ti.totalUsd += r.amountUsd;
    byTierMap.set(r.packageTier, ti);
  }

  const byStatus = Array.from(byStatusMap.entries()).map(([status, v]) => ({ status, ...v }));
  const byTier = Array.from(byTierMap.entries()).map(([tier, v]) => ({ tier, ...v }));
  const recentInvoices = rows.slice(0, 10).map(r => ({
    ...toJson(r),
    lineItems: parseLineItems(r.lineItems),
  }));

  res.json({ totalInvoiced, totalCollected, totalOutstanding, invoiceCount: rows.length, byStatus, byTier, recentInvoices });
});

// GET /billing/invoices
invoicesRouter.get("/billing/invoices", async (req, res) => {
  const status = req.query["status"] as string | undefined;

  const rows = await db
    .select({
      id: invoicesTable.id,
      relocationId: invoicesTable.relocationId,
      invoiceNumber: invoicesTable.invoiceNumber,
      status: invoicesTable.status,
      packageTier: invoicesTable.packageTier,
      amountUsd: invoicesTable.amountUsd,
      dueDate: invoicesTable.dueDate,
      paidAt: invoicesTable.paidAt,
      notes: invoicesTable.notes,
      lineItems: invoicesTable.lineItems,
      createdAt: invoicesTable.createdAt,
      updatedAt: invoicesTable.updatedAt,
      clientName: profilesTable.fullName,
      clientEmail: profilesTable.email,
    })
    .from(invoicesTable)
    .leftJoin(relocationsTable, eq(invoicesTable.relocationId, relocationsTable.id))
    .leftJoin(profilesTable, eq(relocationsTable.profileId, profilesTable.id))
    .orderBy(desc(invoicesTable.createdAt));

  const filtered = status ? rows.filter(r => r.status === status) : rows;
  res.json(filtered.map(r => ({ ...toJson(r), lineItems: parseLineItems(r.lineItems) })));
});

// GET /relocations/:id/invoices
invoicesRouter.get("/relocations/:id/invoices", async (req, res) => {
  const relocationId = parseInt(req.params["id"]!);
  const rows = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.relocationId, relocationId))
    .orderBy(desc(invoicesTable.createdAt));

  res.json(rows.map(r => ({ ...toJson(r), lineItems: parseLineItems(r.lineItems) })));
});

// POST /relocations/:id/invoices
invoicesRouter.post("/relocations/:id/invoices", async (req, res) => {
  const relocationId = parseInt(req.params["id"]!);
  const body = CreateInvoiceBody.parse(req.body);

  let lineItems = (body.lineItems ?? []) as Array<{ description: string; quantity: number; unitPriceUsd: number; totalUsd: number }>;
  if (lineItems.length === 0) {
    const tier = PACKAGE_TIERS[body.packageTier];
    if (tier) {
      lineItems = [
        { description: `${tier.label} Relocation Package`, quantity: 1, unitPriceUsd: body.amountUsd, totalUsd: body.amountUsd },
      ];
    }
  }

  const [row] = await db.insert(invoicesTable).values({
    relocationId,
    invoiceNumber: buildInvoiceNumber(),
    status: "draft",
    packageTier: body.packageTier,
    amountUsd: body.amountUsd,
    dueDate: body.dueDate ?? null,
    notes: body.notes ?? null,
    lineItems: JSON.stringify(lineItems),
  }).returning();

  await db.insert(activityLogsTable).values({
    relocationId,
    eventType: "invoice_created",
    description: `Invoice ${row!.invoiceNumber} created — $${body.amountUsd.toLocaleString()} (${body.packageTier.replace(/_/g, " ")})`,
  });

  res.status(201).json({ ...toJson(row!), lineItems: parseLineItems(row!.lineItems) });
});

// PUT /relocations/:id/invoices/:invoiceId
invoicesRouter.put("/relocations/:id/invoices/:invoiceId", async (req, res) => {
  const relocationId = parseInt(req.params["id"]!);
  const invoiceId = parseInt(req.params["invoiceId"]!);
  const body = UpdateInvoiceBody.parse(req.body);

  const updates: Partial<typeof invoicesTable.$inferInsert> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.amountUsd !== undefined) updates.amountUsd = body.amountUsd;
  if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.paidAt !== undefined) updates.paidAt = body.paidAt ? new Date(body.paidAt) : null;
  if (body.lineItems !== undefined) {
    updates.lineItems = JSON.stringify(body.lineItems);
  }

  const [row] = await db.update(invoicesTable)
    .set(updates)
    .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.relocationId, relocationId)))
    .returning();

  res.json({ ...toJson(row!), lineItems: parseLineItems(row!.lineItems) });
});

// DELETE /relocations/:id/invoices/:invoiceId
invoicesRouter.delete("/relocations/:id/invoices/:invoiceId", async (req, res) => {
  const relocationId = parseInt(req.params["id"]!);
  const invoiceId = parseInt(req.params["invoiceId"]!);
  await db.delete(invoicesTable)
    .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.relocationId, relocationId)));
  res.status(204).end();
});
