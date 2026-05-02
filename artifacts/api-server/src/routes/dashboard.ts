import { Router, type IRouter } from "express";
import { count, eq, desc } from "drizzle-orm";
import { db, profilesTable, relocationsTable, housingListingsTable, schoolsTable, vendorsTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRecentRelocationsResponse,
  GetRelocationsByStatusResponse,
  GetHousingByNeighbourhoodResponse,
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

export default router;
