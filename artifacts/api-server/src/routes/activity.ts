import { Router, type IRouter } from "express";
import { db, activityLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { toJson } from "../lib/serialize";

const router: IRouter = Router();

// GET /relocations/:id/activity
router.get("/relocations/:id/activity", async (req, res) => {
  const id = parseInt(req.params["id"]!);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const logs = await db
    .select()
    .from(activityLogsTable)
    .where(eq(activityLogsTable.relocationId, id))
    .orderBy(desc(activityLogsTable.createdAt));

  res.json(toJson(logs));
});

export { router as activityRouter };
