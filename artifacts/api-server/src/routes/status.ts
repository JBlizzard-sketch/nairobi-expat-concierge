import { Router } from "express";
import { db } from "@workspace/db";
import {
  relocationsTable, profilesTable, relocationTasksTable,
  housingShortlistsTable, schoolApplicationsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { toJson } from "../lib/serialize";
import { randomUUID } from "crypto";

export const statusRouter = Router();

// POST /relocations/:id/share-token — generate / regenerate
statusRouter.post("/relocations/:id/share-token", async (req, res) => {
  const id = parseInt(req.params["id"]!);
  const token = randomUUID();

  await db.update(relocationsTable)
    .set({ shareToken: token })
    .where(eq(relocationsTable.id, id));

  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0] ?? "localhost:80";
  const shareUrl = `https://${domain}/status/${token}`;
  res.json({ token, shareUrl });
});

// DELETE /relocations/:id/share-token — revoke
statusRouter.delete("/relocations/:id/share-token", async (req, res) => {
  const id = parseInt(req.params["id"]!);
  await db.update(relocationsTable)
    .set({ shareToken: null })
    .where(eq(relocationsTable.id, id));
  res.status(204).end();
});

// GET /status/:token — public, no auth
statusRouter.get("/status/:token", async (req, res) => {
  const token = req.params["token"]!;

  const [row] = await db
    .select({
      relocation: relocationsTable,
      profile: profilesTable,
    })
    .from(relocationsTable)
    .leftJoin(profilesTable, eq(relocationsTable.profileId, profilesTable.id))
    .where(eq(relocationsTable.shareToken, token))
    .limit(1);

  if (!row?.profile) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { relocation, profile } = row;

  const tasks = await db
    .select()
    .from(relocationTasksTable)
    .where(eq(relocationTasksTable.relocationId, relocation.id));

  const housing = await db
    .select()
    .from(housingShortlistsTable)
    .where(eq(housingShortlistsTable.relocationId, relocation.id));

  const schools = await db
    .select()
    .from(schoolApplicationsTable)
    .where(eq(schoolApplicationsTable.relocationId, relocation.id));

  const tasksTotal = tasks.length;
  const tasksCompleted = tasks.filter(t => t.status === "completed").length;
  const progressPct = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  const STAGES = [
    "profile_complete",
    "housing_shortlisted",
    "school_applied",
    "services_arranged",
    "settled",
  ];

  const STAGE_LABELS: Record<string, string> = {
    profile_complete: "Profile Complete",
    housing_shortlisted: "Housing Shortlisted",
    school_applied: "School Applications Submitted",
    services_arranged: "Services Arranged",
    settled: "Settled In Nairobi",
  };

  const currentStageIdx = STAGES.indexOf(relocation.stage);
  const milestones = STAGES.map((s, i) => ({
    label: STAGE_LABELS[s] ?? s,
    completed: i <= currentStageIdx,
    date: null as string | null,
  }));

  const clientTasks = tasks.map(t => ({
    id: t.id,
    category: t.category,
    title: t.title,
    status: t.status,
    dueDate: t.dueDate ?? null,
  }));

  const view = {
    clientName: profile.fullName,
    nationality: profile.nationality,
    arrivalDate: profile.arrivalDate,
    packageTier: relocation.packageTier,
    status: relocation.status,
    stage: relocation.stage,
    assignedTo: relocation.assignedTo ?? null,
    progressPct,
    tasksTotal,
    tasksCompleted,
    tasks: clientTasks,
    milestones,
    housingCount: housing.length,
    schoolCount: schools.length,
    updatedAt: relocation.updatedAt.toISOString(),
  };

  res.json(toJson(view));
});
