import { Router, type IRouter } from "express";
import { db, communicationLogsTable, activityLogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreateCommunicationLogBody, UpdateCommunicationLogBody } from "@workspace/api-zod";
import { toJson } from "../lib/serialize";

const router: IRouter = Router();

const TYPE_LABELS: Record<string, string> = {
  email: "Email",
  call: "Phone Call",
  whatsapp: "WhatsApp",
  meeting: "Meeting",
  video_call: "Video Call",
  sms: "SMS",
};

// GET /relocations/:id/comms
router.get("/relocations/:id/comms", async (req, res) => {
  const relocationId = parseInt(req.params["id"]!);
  if (isNaN(relocationId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select()
    .from(communicationLogsTable)
    .where(eq(communicationLogsTable.relocationId, relocationId))
    .orderBy(desc(communicationLogsTable.createdAt));

  res.json(toJson(rows));
});

// POST /relocations/:id/comms
router.post("/relocations/:id/comms", async (req, res) => {
  const relocationId = parseInt(req.params["id"]!);
  if (isNaN(relocationId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = CreateCommunicationLogBody.parse(req.body);

  const [row] = await db.insert(communicationLogsTable).values({
    relocationId,
    type: body.type ?? "email",
    direction: body.direction ?? "outbound",
    subject: body.subject,
    body: body.body ?? null,
    durationMinutes: body.durationMinutes ?? null,
    followUpRequired: body.followUpRequired ?? false,
    followUpDate: body.followUpDate ?? null,
    outcome: body.outcome ?? null,
    contactPerson: body.contactPerson ?? null,
  }).returning();

  const typeLabel = TYPE_LABELS[body.type ?? "email"] ?? body.type ?? "email";
  const dirLabel = (body.direction ?? "outbound") === "inbound" ? "Received" : "Sent";
  await db.insert(activityLogsTable).values({
    relocationId,
    eventType: "comm_logged",
    description: `${dirLabel} ${typeLabel}: "${body.subject}"${body.contactPerson ? ` (${body.contactPerson})` : ""}`,
  });

  res.status(201).json(toJson(row!));
});

// PUT /relocations/:id/comms/:commId
router.put("/relocations/:id/comms/:commId", async (req, res) => {
  const relocationId = parseInt(req.params["id"]!);
  const commId = parseInt(req.params["commId"]!);
  if (isNaN(relocationId) || isNaN(commId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = UpdateCommunicationLogBody.parse(req.body);

  const [row] = await db
    .update(communicationLogsTable)
    .set({
      ...(body.type !== undefined && { type: body.type }),
      ...(body.direction !== undefined && { direction: body.direction }),
      ...(body.subject !== undefined && { subject: body.subject }),
      ...(body.body !== undefined && { body: body.body ?? null }),
      ...(body.durationMinutes !== undefined && { durationMinutes: body.durationMinutes ?? null }),
      ...(body.followUpRequired !== undefined && { followUpRequired: body.followUpRequired }),
      ...(body.followUpDate !== undefined && { followUpDate: body.followUpDate ?? null }),
      ...(body.outcome !== undefined && { outcome: body.outcome ?? null }),
      ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson ?? null }),
    })
    .where(and(eq(communicationLogsTable.id, commId), eq(communicationLogsTable.relocationId, relocationId)))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toJson(row));
});

// DELETE /relocations/:id/comms/:commId
router.delete("/relocations/:id/comms/:commId", async (req, res) => {
  const relocationId = parseInt(req.params["id"]!);
  const commId = parseInt(req.params["commId"]!);
  if (isNaN(relocationId) || isNaN(commId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db
    .delete(communicationLogsTable)
    .where(and(eq(communicationLogsTable.id, commId), eq(communicationLogsTable.relocationId, relocationId)));

  res.status(204).end();
});

export { router as commsRouter };
