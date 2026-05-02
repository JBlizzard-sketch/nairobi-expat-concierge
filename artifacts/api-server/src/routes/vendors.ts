import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, vendorsTable, caseVendorsTable, activityLogsTable, relocationsTable } from "@workspace/db";
import {
  CreateVendorBody,
  GetVendorParams,
  GetVendorResponse,
  UpdateVendorParams,
  UpdateVendorBody,
  UpdateVendorResponse,
  DeleteVendorParams,
  ListVendorsResponse,
  ListCaseVendorsParams,
  ListCaseVendorsResponse,
  CreateCaseVendorParams,
  CreateCaseVendorBody,
  UpdateCaseVendorParams,
  UpdateCaseVendorBody,
  UpdateCaseVendorResponse,
  DeleteCaseVendorParams,
} from "@workspace/api-zod";
import { toJson } from "../lib/serialize";

const router: IRouter = Router();

async function logActivity(relocationId: number, eventType: string, description: string) {
  await db.insert(activityLogsTable).values({ relocationId, eventType, description });
}

// ─── Case Vendors ──────────────────────────────────────────────────────────

router.get("/relocations/:id/vendors", async (req, res): Promise<void> => {
  const params = ListCaseVendorsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const rows = await db
    .select()
    .from(caseVendorsTable)
    .innerJoin(vendorsTable, eq(caseVendorsTable.vendorId, vendorsTable.id))
    .where(eq(caseVendorsTable.relocationId, params.data.id))
    .orderBy(caseVendorsTable.createdAt);
  const result = rows.map(r => ({ ...r.case_vendors, vendor: r.vendors }));
  res.json(ListCaseVendorsResponse.parse(toJson(result)));
});

router.post("/relocations/:id/vendors", async (req, res): Promise<void> => {
  const params = CreateCaseVendorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = CreateCaseVendorBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const existing = await db
    .select()
    .from(caseVendorsTable)
    .where(and(eq(caseVendorsTable.relocationId, params.data.id), eq(caseVendorsTable.vendorId, parsed.data.vendorId)));
  if (existing.length > 0) { res.status(409).json({ error: "Vendor already assigned to this case" }); return; }

  const [entry] = await db
    .insert(caseVendorsTable)
    .values({ relocationId: params.data.id, vendorId: parsed.data.vendorId, notes: parsed.data.notes ?? null })
    .returning();
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, entry.vendorId));
  await logActivity(params.data.id, "vendor_assigned", `Vendor assigned: "${vendor.name}" (${vendor.category.replace(/_/g, " ")})`);
  res.status(201).json(toJson({ ...entry, vendor }));
});

router.patch("/relocations/:id/vendors/:caseVendorId", async (req, res): Promise<void> => {
  const params = UpdateCaseVendorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateCaseVendorBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [before] = await db.select().from(caseVendorsTable).where(eq(caseVendorsTable.id, params.data.caseVendorId));
  const [entry] = await db
    .update(caseVendorsTable)
    .set({ ...parsed.data })
    .where(and(eq(caseVendorsTable.id, params.data.caseVendorId), eq(caseVendorsTable.relocationId, params.data.id)))
    .returning();
  if (!entry) { res.status(404).json({ error: "Case vendor not found" }); return; }
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, entry.vendorId));
  if (before && parsed.data.status && parsed.data.status !== before.status) {
    await logActivity(params.data.id, "vendor_status", `"${vendor.name}" status → ${parsed.data.status}`);
  }
  res.json(UpdateCaseVendorResponse.parse(toJson({ ...entry, vendor })));
});

router.delete("/relocations/:id/vendors/:caseVendorId", async (req, res): Promise<void> => {
  const params = DeleteCaseVendorParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [row] = await db
    .select({ name: vendorsTable.name })
    .from(caseVendorsTable)
    .innerJoin(vendorsTable, eq(caseVendorsTable.vendorId, vendorsTable.id))
    .where(and(eq(caseVendorsTable.id, params.data.caseVendorId), eq(caseVendorsTable.relocationId, params.data.id)));

  const [entry] = await db
    .delete(caseVendorsTable)
    .where(and(eq(caseVendorsTable.id, params.data.caseVendorId), eq(caseVendorsTable.relocationId, params.data.id)))
    .returning();
  if (!entry) { res.status(404).json({ error: "Case vendor not found" }); return; }
  if (row) await logActivity(params.data.id, "vendor_removed", `Vendor removed: "${row.name}"`);
  res.sendStatus(204);
});

// ─── Vendors CRUD ─────────────────────────────────────────────────────────

router.get("/vendors", async (_req, res): Promise<void> => {
  const vendors = await db.select().from(vendorsTable).orderBy(vendorsTable.name);
  res.json(ListVendorsResponse.parse(toJson(vendors)));
});

router.post("/vendors", async (req, res): Promise<void> => {
  const parsed = CreateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [vendor] = await db.insert(vendorsTable).values(parsed.data).returning();
  res.status(201).json(GetVendorResponse.parse(toJson(vendor)));
});

router.get("/vendors/:id", async (req, res): Promise<void> => {
  const params = GetVendorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, params.data.id));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(GetVendorResponse.parse(toJson(vendor)));
});

router.patch("/vendors/:id", async (req, res): Promise<void> => {
  const params = UpdateVendorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [vendor] = await db
    .update(vendorsTable)
    .set(parsed.data)
    .where(eq(vendorsTable.id, params.data.id))
    .returning();
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(UpdateVendorResponse.parse(toJson(vendor)));
});

router.delete("/vendors/:id", async (req, res): Promise<void> => {
  const params = DeleteVendorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [vendor] = await db
    .delete(vendorsTable)
    .where(eq(vendorsTable.id, params.data.id))
    .returning();
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
