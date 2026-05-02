import { Router, type IRouter } from "express";
import { count, eq, desc, lt, and, not, inArray } from "drizzle-orm";
import {
  db,
  profilesTable,
  relocationsTable,
  housingListingsTable,
  schoolsTable,
  vendorsTable,
  relocationTasksTable,
  relocationDocumentsTable,
  caseVendorsTable,
} from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRecentRelocationsResponse,
  GetRelocationsByStatusResponse,
  GetHousingByNeighbourhoodResponse,
  GetTaskCompletionStatsResponse,
  GetDocumentStatusBreakdownResponse,
  GetVendorEngagementResponse,
  GetRelocationsByStageResponse,
  GetOverdueDocumentsResponse,
} from "@workspace/api-zod";
import { toJson } from "../lib/serialize";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [totalRelocations] = await db.select({ count: count() }).from(relocationsTable);
  const [activeRelocations] = await db
    .select({ count: count() })
    .from(relocationsTable)
    .where(eq(relocationsTable.status, "active"));
  const [completedRelocations] = await db
    .select({ count: count() })
    .from(relocationsTable)
    .where(eq(relocationsTable.status, "completed"));
  const [totalProfiles] = await db.select({ count: count() }).from(profilesTable);
  const [availableHousing] = await db
    .select({ count: count() })
    .from(housingListingsTable)
    .where(eq(housingListingsTable.isAvailable, true));
  const [totalSchools] = await db.select({ count: count() }).from(schoolsTable);
  const [totalVendors] = await db.select({ count: count() }).from(vendorsTable);
  const [vettedVendors] = await db
    .select({ count: count() })
    .from(vendorsTable)
    .where(eq(vendorsTable.isVetted, true));

  res.json(GetDashboardSummaryResponse.parse({
    totalRelocations: totalRelocations.count,
    activeRelocations: activeRelocations.count,
    completedRelocations: completedRelocations.count,
    totalProfiles: totalProfiles.count,
    availableHousing: availableHousing.count,
    totalSchools: totalSchools.count,
    totalVendors: totalVendors.count,
    vettedVendors: vettedVendors.count,
  }));
});

router.get("/dashboard/recent-relocations", async (_req, res): Promise<void> => {
  const relocations = await db
    .select()
    .from(relocationsTable)
    .orderBy(desc(relocationsTable.updatedAt))
    .limit(8);
  const profiles = await db.select().from(profilesTable);
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const result = relocations.map(r => ({ ...r, profile: profileMap.get(r.profileId)! }));
  res.json(GetRecentRelocationsResponse.parse(toJson(result)));
});

router.get("/dashboard/relocations-by-status", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ status: relocationsTable.status, count: count() })
    .from(relocationsTable)
    .groupBy(relocationsTable.status);
  res.json(GetRelocationsByStatusResponse.parse(rows));
});

router.get("/dashboard/housing-by-neighbourhood", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ neighbourhood: housingListingsTable.neighbourhood, count: count() })
    .from(housingListingsTable)
    .groupBy(housingListingsTable.neighbourhood);
  res.json(GetHousingByNeighbourhoodResponse.parse(rows));
});

router.get("/dashboard/task-completion", async (_req, res): Promise<void> => {
  const [total] = await db.select({ count: count() }).from(relocationTasksTable);
  const [completed] = await db
    .select({ count: count() })
    .from(relocationTasksTable)
    .where(eq(relocationTasksTable.status, "completed"));
  const totalTasks = Number(total.count);
  const completedTasks = Number(completed.count);
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  res.json(GetTaskCompletionStatsResponse.parse({ totalTasks, completedTasks, pendingTasks, completionRate }));
});

router.get("/dashboard/document-status", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ status: relocationDocumentsTable.status, count: count() })
    .from(relocationDocumentsTable)
    .groupBy(relocationDocumentsTable.status);
  res.json(GetDocumentStatusBreakdownResponse.parse(rows.map(r => ({ status: r.status, count: Number(r.count) }))));
});

router.get("/dashboard/vendor-engagement", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ status: caseVendorsTable.status, count: count() })
    .from(caseVendorsTable)
    .groupBy(caseVendorsTable.status);
  res.json(GetVendorEngagementResponse.parse(rows.map(r => ({ status: r.status, count: Number(r.count) }))));
});

router.get("/dashboard/relocations-by-stage", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ stage: relocationsTable.stage, count: count() })
    .from(relocationsTable)
    .groupBy(relocationsTable.stage);
  res.json(GetRelocationsByStageResponse.parse(rows.map(r => ({ stage: r.stage, count: Number(r.count) }))));
});

router.get("/dashboard/overdue-documents", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0]!;
  const COMPLETE_STATUSES = ["received", "approved"];
  const rows = await db
    .select({
      id: relocationDocumentsTable.id,
      name: relocationDocumentsTable.name,
      category: relocationDocumentsTable.category,
      dueDate: relocationDocumentsTable.dueDate,
      relocationId: relocationDocumentsTable.relocationId,
      status: relocationDocumentsTable.status,
    })
    .from(relocationDocumentsTable)
    .where(
      and(
        not(inArray(relocationDocumentsTable.status, COMPLETE_STATUSES)),
        lt(relocationDocumentsTable.dueDate, today)
      )
    )
    .orderBy(relocationDocumentsTable.dueDate);

  const profiles = await db
    .select({ id: profilesTable.id, fullName: profilesTable.fullName })
    .from(profilesTable)
    .innerJoin(relocationsTable, eq(relocationsTable.profileId, profilesTable.id));

  const relocationToProfile = new Map<number, string>();
  const relocations = await db.select({ id: relocationsTable.id, profileId: relocationsTable.profileId }).from(relocationsTable);
  const profileMap = new Map(profiles.map(p => [p.id, p.fullName]));
  for (const r of relocations) {
    relocationToProfile.set(r.id, profileMap.get(r.profileId) ?? "Unknown");
  }

  const result = rows
    .filter(r => r.dueDate !== null)
    .map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      dueDate: r.dueDate!,
      relocationId: r.relocationId,
      clientName: relocationToProfile.get(r.relocationId) ?? "Unknown",
    }));

  res.json(GetOverdueDocumentsResponse.parse(result));
});

export default router;
