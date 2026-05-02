import { Router, type IRouter } from "express";
import { db, communicationLogsTable, relocationsTable, profilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { toJson } from "../lib/serialize";

const router: IRouter = Router();

// GET /followups — all pending follow-ups across every case, enriched with client name
router.get("/followups", async (_req, res) => {
  const rows = await db
    .select({
      id:            communicationLogsTable.id,
      relocationId:  communicationLogsTable.relocationId,
      type:          communicationLogsTable.type,
      direction:     communicationLogsTable.direction,
      subject:       communicationLogsTable.subject,
      body:          communicationLogsTable.body,
      outcome:       communicationLogsTable.outcome,
      contactPerson: communicationLogsTable.contactPerson,
      followUpDate:  communicationLogsTable.followUpDate,
      createdAt:     communicationLogsTable.createdAt,
      clientName:    profilesTable.fullName,
    })
    .from(communicationLogsTable)
    .innerJoin(relocationsTable, eq(relocationsTable.id, communicationLogsTable.relocationId))
    .innerJoin(profilesTable, eq(profilesTable.id, relocationsTable.profileId))
    .where(eq(communicationLogsTable.followUpRequired, true))
    .orderBy(communicationLogsTable.followUpDate);

  res.json(toJson(rows));
});

// PATCH /followups/:commId/done — clear follow-up flag
router.patch("/followups/:commId/done", async (req, res) => {
  const commId = parseInt(req.params["commId"]!);
  if (isNaN(commId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .update(communicationLogsTable)
    .set({ followUpRequired: false })
    .where(eq(communicationLogsTable.id, commId))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toJson(row));
});

export { router as followupsRouter };
