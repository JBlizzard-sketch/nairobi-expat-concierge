import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profilesTable, relocationsTable, relocationTasksTable } from "@workspace/db";
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
  { category: "car", title: "Arrange temporary car hire on arrival" },
  { category: "internet", title: "Order fibre/broadband installation" },
  { category: "domestic_help", title: "Screen and interview domestic staff candidates" },
  { category: "banking", title: "Open local bank account" },
  { category: "orientation", title: "Deliver pre-arrival welcome pack" },
  { category: "orientation", title: "Complete Nairobi orientation session" },
];

router.get("/relocations", async (_req, res): Promise<void> => {
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

  // Auto-create default task checklist
  const tasks = DEFAULT_TASKS.map(t => ({
    relocationId: relocation.id,
    category: t.category,
    title: t.title,
    status: "pending" as const,
  }));
  await db.insert(relocationTasksTable).values(tasks);

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
  res.json(UpdateRelocationTaskResponse.parse(toJson(task)));
});

export default router;
