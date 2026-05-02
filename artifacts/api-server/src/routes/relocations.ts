import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, profilesTable, relocationsTable, relocationTasksTable, housingShortlistsTable, housingListingsTable, schoolApplicationsTable, schoolsTable, activityLogsTable } from "@workspace/db";
import {
  CreateRelocationBody,
  GetRelocationParams,
  GetRelocationResponse,
  UpdateRelocationParams,
  UpdateRelocationBody,
  UpdateRelocationResponse,
  DeleteRelocationParams,
  ListRelocationsResponse,
  GetRelocationTasksParams,
  GetRelocationTasksResponse,
  UpdateRelocationTaskParams,
  UpdateRelocationTaskBody,
  UpdateRelocationTaskResponse,
  ListHousingShortlistsParams,
  ListHousingShortlistsResponse,
  CreateHousingShortlistParams,
  CreateHousingShortlistBody,
  UpdateHousingShortlistParams,
  UpdateHousingShortlistBody,
  UpdateHousingShortlistResponse,
  DeleteHousingShortlistParams,
  ListSchoolApplicationsParams,
  ListSchoolApplicationsResponse,
  CreateSchoolApplicationParams,
  CreateSchoolApplicationBody,
  UpdateSchoolApplicationParams,
  UpdateSchoolApplicationBody,
  UpdateSchoolApplicationResponse,
  DeleteSchoolApplicationParams,
  ListRelocationActivityParams,
  ListRelocationActivityResponse,
} from "@workspace/api-zod";
import { toJson } from "../lib/serialize";

const router: IRouter = Router();

const DEFAULT_TASKS = [
  { category: "housing", title: "Shortlist 3 properties in preferred neighbourhoods" },
  { category: "housing", title: "Arrange property viewings" },
  { category: "housing", title: "Negotiate lease and sign agreement" },
  { category: "schools", title: "Identify schools matching age and curriculum" },
  { category: "schools", title: "Submit school applications" },
  { category: "schools", title: "Confirm school placements" },
  { category: "logistics", title: "Arrange airport pickup and temporary accommodation" },
  { category: "logistics", title: "Register with home-country embassy" },
  { category: "immigration", title: "Submit work permit application" },
  { category: "immigration", title: "Collect alien card (Class G permit)" },
  { category: "banking", title: "Open KES bank account" },
  { category: "banking", title: "Set up mobile money (M-Pesa)" },
  { category: "health", title: "Register with a NHIF-accredited hospital" },
  { category: "health", title: "Obtain international health insurance card" },
];

async function logActivity(relocationId: number, eventType: string, description: string) {
  await db.insert(activityLogsTable).values({ relocationId, eventType, description });
}

// ─── Relocations ────────────────────────────────────────────────────────────

router.get("/relocations", async (req, res): Promise<void> => {
  const relocations = await db.select().from(relocationsTable).orderBy(relocationsTable.createdAt);
  const profiles = await db.select().from(profilesTable);
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const result = relocations.map(r => ({ ...r, profile: profileMap.get(r.profileId)! }));
  res.json(ListRelocationsResponse.parse(toJson(result)));
});

router.post("/relocations", async (req, res): Promise<void> => {
  const parsed = CreateRelocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [relocation] = await db.insert(relocationsTable).values({
    ...parsed.data,
    status: parsed.data.status ?? "intake",
    stage: parsed.data.stage ?? "profile_complete",
  }).returning();

  const tasks = DEFAULT_TASKS.map(t => ({
    relocationId: relocation.id,
    category: t.category,
    title: t.title,
    status: "pending" as const,
  }));
  await db.insert(relocationTasksTable).values(tasks);
  await logActivity(relocation.id, "case_created", "Relocation case opened");

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, relocation.profileId));
  res.status(201).json(GetRelocationResponse.parse(toJson({ ...relocation, profile })));
});

router.get("/relocations/:id", async (req, res): Promise<void> => {
  const params = GetRelocationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [relocation] = await db.select().from(relocationsTable).where(eq(relocationsTable.id, params.data.id));
  if (!relocation) {
    res.status(404).json({ error: "Relocation not found" });
    return;
  }
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, relocation.profileId));
  res.json(GetRelocationResponse.parse(toJson({ ...relocation, profile })));
});

router.patch("/relocations/:id", async (req, res): Promise<void> => {
  const params = UpdateRelocationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateRelocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [before] = await db.select().from(relocationsTable).where(eq(relocationsTable.id, params.data.id));
  const { completedAt, ...restUpdate } = parsed.data;
  const [relocation] = await db
    .update(relocationsTable)
    .set({ ...restUpdate, ...(completedAt !== undefined ? { completedAt: completedAt ? new Date(completedAt) : null } : {}) })
    .where(eq(relocationsTable.id, params.data.id))
    .returning();
  if (!relocation) {
    res.status(404).json({ error: "Relocation not found" });
    return;
  }

  if (before && parsed.data.status && parsed.data.status !== before.status) {
    await logActivity(relocation.id, "status_changed", `Status changed from "${before.status}" to "${parsed.data.status}"`);
  }
  if (before && parsed.data.stage && parsed.data.stage !== before.stage) {
    await logActivity(relocation.id, "stage_changed", `Stage advanced to "${parsed.data.stage.replace(/_/g, " ")}"`);
  }
  if (parsed.data.notes !== undefined && parsed.data.notes !== before?.notes) {
    await logActivity(relocation.id, "notes_updated", "Case notes updated");
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, relocation.profileId));
  res.json(UpdateRelocationResponse.parse(toJson({ ...relocation, profile })));
});

router.delete("/relocations/:id", async (req, res): Promise<void> => {
  const params = DeleteRelocationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(relocationTasksTable).where(eq(relocationTasksTable.relocationId, params.data.id));
  const [relocation] = await db
    .delete(relocationsTable)
    .where(eq(relocationsTable.id, params.data.id))
    .returning();
  if (!relocation) {
    res.status(404).json({ error: "Relocation not found" });
    return;
  }
  res.sendStatus(204);
});

// ─── Activity Log ───────────────────────────────────────────────────────────

router.get("/relocations/:id/activity", async (req, res): Promise<void> => {
  const params = ListRelocationActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const events = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.relocationId, params.data.id))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(50);
  res.json(ListRelocationActivityResponse.parse(toJson(events)));
});

// ─── Tasks ─────────────────────────────────────────────────────────────────

router.get("/relocations/:id/tasks", async (req, res): Promise<void> => {
  const params = GetRelocationTasksParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tasks = await db
    .select()
    .from(relocationTasksTable)
    .where(eq(relocationTasksTable.relocationId, params.data.id))
    .orderBy(relocationTasksTable.category, relocationTasksTable.id);
  res.json(GetRelocationTasksResponse.parse(toJson(tasks)));
});

router.patch("/relocations/:id/tasks/:taskId", async (req, res): Promise<void> => {
  const params = UpdateRelocationTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateRelocationTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [before] = await db.select().from(relocationTasksTable).where(eq(relocationTasksTable.id, params.data.taskId));
  const { completedAt: taskCompletedAt, ...restTaskUpdate } = parsed.data;
  const [task] = await db
    .update(relocationTasksTable)
    .set({ ...restTaskUpdate, ...(taskCompletedAt !== undefined ? { completedAt: taskCompletedAt ? new Date(taskCompletedAt) : null } : {}) })
    .where(eq(relocationTasksTable.id, params.data.taskId))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (before && parsed.data.status && parsed.data.status !== before.status) {
    const label = parsed.data.status === "completed" ? "completed" : "reopened";
    await logActivity(params.data.id, `task_${label}`, `Task ${label}: "${task.title}"`);
  }

  res.json(UpdateRelocationTaskResponse.parse(toJson(task)));
});

// ─── School Applications ───────────────────────────────────────────────────

router.get("/relocations/:id/applications", async (req, res): Promise<void> => {
  const params = ListSchoolApplicationsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const rows = await db
    .select()
    .from(schoolApplicationsTable)
    .innerJoin(schoolsTable, eq(schoolApplicationsTable.schoolId, schoolsTable.id))
    .where(eq(schoolApplicationsTable.relocationId, params.data.id))
    .orderBy(schoolApplicationsTable.createdAt);
  const result = rows.map(r => ({ ...r.school_applications, school: r.schools }));
  res.json(ListSchoolApplicationsResponse.parse(toJson(result)));
});

router.post("/relocations/:id/applications", async (req, res): Promise<void> => {
  const params = CreateSchoolApplicationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = CreateSchoolApplicationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await db
    .select()
    .from(schoolApplicationsTable)
    .where(and(eq(schoolApplicationsTable.relocationId, params.data.id), eq(schoolApplicationsTable.schoolId, parsed.data.schoolId)));
  if (existing.length > 0) { res.status(409).json({ error: "School already in applications for this case" }); return; }
  const [entry] = await db
    .insert(schoolApplicationsTable)
    .values({ relocationId: params.data.id, schoolId: parsed.data.schoolId, notes: parsed.data.notes ?? null, applicationDate: parsed.data.applicationDate ?? null })
    .returning();
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, entry.schoolId));
  await logActivity(params.data.id, "school_added", `School added to applications: "${school.name}"`);
  res.status(201).json(toJson({ ...entry, school }));
});

router.patch("/relocations/:id/applications/:applicationId", async (req, res): Promise<void> => {
  const params = UpdateSchoolApplicationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateSchoolApplicationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [before] = await db.select().from(schoolApplicationsTable).where(eq(schoolApplicationsTable.id, params.data.applicationId));
  const [entry] = await db
    .update(schoolApplicationsTable)
    .set({ ...parsed.data })
    .where(and(eq(schoolApplicationsTable.id, params.data.applicationId), eq(schoolApplicationsTable.relocationId, params.data.id)))
    .returning();
  if (!entry) { res.status(404).json({ error: "Application not found" }); return; }
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, entry.schoolId));
  if (before && parsed.data.status && parsed.data.status !== before.status) {
    await logActivity(params.data.id, "school_status", `"${school.name}" application status → ${parsed.data.status}`);
  }
  res.json(UpdateSchoolApplicationResponse.parse(toJson({ ...entry, school })));
});

router.delete("/relocations/:id/applications/:applicationId", async (req, res): Promise<void> => {
  const params = DeleteSchoolApplicationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [school] = await db
    .select({ name: schoolsTable.name })
    .from(schoolApplicationsTable)
    .innerJoin(schoolsTable, eq(schoolApplicationsTable.schoolId, schoolsTable.id))
    .where(and(eq(schoolApplicationsTable.id, params.data.applicationId), eq(schoolApplicationsTable.relocationId, params.data.id)));
  const [entry] = await db
    .delete(schoolApplicationsTable)
    .where(and(eq(schoolApplicationsTable.id, params.data.applicationId), eq(schoolApplicationsTable.relocationId, params.data.id)))
    .returning();
  if (!entry) { res.status(404).json({ error: "Application not found" }); return; }
  if (school) await logActivity(params.data.id, "school_removed", `School removed from applications: "${school.name}"`);
  res.sendStatus(204);
});

// ─── Housing Shortlists ────────────────────────────────────────────────────

router.get("/relocations/:id/shortlists", async (req, res): Promise<void> => {
  const params = ListHousingShortlistsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(housingShortlistsTable)
    .innerJoin(housingListingsTable, eq(housingShortlistsTable.housingId, housingListingsTable.id))
    .where(eq(housingShortlistsTable.relocationId, params.data.id))
    .orderBy(housingShortlistsTable.createdAt);
  const result = rows.map(r => ({ ...r.housing_shortlists, listing: r.housing_listings }));
  res.json(ListHousingShortlistsResponse.parse(toJson(result)));
});

router.post("/relocations/:id/shortlists", async (req, res): Promise<void> => {
  const params = CreateHousingShortlistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateHousingShortlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await db
    .select()
    .from(housingShortlistsTable)
    .where(and(eq(housingShortlistsTable.relocationId, params.data.id), eq(housingShortlistsTable.housingId, parsed.data.housingId)));
  if (existing.length > 0) {
    res.status(409).json({ error: "Property already shortlisted for this case" });
    return;
  }
  const [entry] = await db
    .insert(housingShortlistsTable)
    .values({ relocationId: params.data.id, housingId: parsed.data.housingId, notes: parsed.data.notes ?? null })
    .returning();
  const [listing] = await db.select().from(housingListingsTable).where(eq(housingListingsTable.id, entry.housingId));
  await logActivity(params.data.id, "property_shortlisted", `Property shortlisted: "${listing.title}"`);
  res.status(201).json(toJson({ ...entry, listing }));
});

router.patch("/relocations/:id/shortlists/:shortlistId", async (req, res): Promise<void> => {
  const params = UpdateHousingShortlistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateHousingShortlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [before] = await db.select().from(housingShortlistsTable).where(eq(housingShortlistsTable.id, params.data.shortlistId));
  const [entry] = await db
    .update(housingShortlistsTable)
    .set({ ...parsed.data })
    .where(and(eq(housingShortlistsTable.id, params.data.shortlistId), eq(housingShortlistsTable.relocationId, params.data.id)))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Shortlist entry not found" });
    return;
  }
  const [listing] = await db.select().from(housingListingsTable).where(eq(housingListingsTable.id, entry.housingId));
  if (before && parsed.data.status && parsed.data.status !== before.status) {
    await logActivity(params.data.id, "property_status", `"${listing.title}" status → ${parsed.data.status.replace(/_/g, " ")}`);
  }
  res.json(UpdateHousingShortlistResponse.parse(toJson({ ...entry, listing })));
});

router.delete("/relocations/:id/shortlists/:shortlistId", async (req, res): Promise<void> => {
  const params = DeleteHousingShortlistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [listing] = await db
    .select({ title: housingListingsTable.title })
    .from(housingShortlistsTable)
    .innerJoin(housingListingsTable, eq(housingShortlistsTable.housingId, housingListingsTable.id))
    .where(and(eq(housingShortlistsTable.id, params.data.shortlistId), eq(housingShortlistsTable.relocationId, params.data.id)));
  const [entry] = await db
    .delete(housingShortlistsTable)
    .where(and(eq(housingShortlistsTable.id, params.data.shortlistId), eq(housingShortlistsTable.relocationId, params.data.id)))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Shortlist entry not found" });
    return;
  }
  if (listing) await logActivity(params.data.id, "property_removed", `Property removed from shortlist: "${listing.title}"`);
  res.sendStatus(204);
});

export default router;
