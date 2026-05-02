import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, caseNotesTable, activityLogsTable } from "@workspace/db";
import {
  ListCaseNotesParams,
  ListCaseNotesResponse,
  CreateCaseNoteParams,
  CreateCaseNoteBody,
  UpdateCaseNoteResponse as CreateCaseNoteResponse,
  UpdateCaseNoteParams,
  UpdateCaseNoteBody,
  UpdateCaseNoteResponse,
  DeleteCaseNoteParams,
} from "@workspace/api-zod";
import { toJson } from "../lib/serialize";

const router: IRouter = Router();

async function logActivity(relocationId: number, eventType: string, description: string) {
  await db.insert(activityLogsTable).values({ relocationId, eventType, description });
}

// GET /relocations/:id/notes
router.get("/relocations/:id/notes", async (req, res) => {
  const { id } = ListCaseNotesParams.parse(toJson(req.params));
  const notes = await db
    .select()
    .from(caseNotesTable)
    .where(eq(caseNotesTable.relocationId, id))
    .orderBy(desc(caseNotesTable.createdAt));
  res.json(ListCaseNotesResponse.parse(notes.map(toJson)));
});

// POST /relocations/:id/notes
router.post("/relocations/:id/notes", async (req, res) => {
  const { id } = CreateCaseNoteParams.parse(toJson(req.params));
  const body = CreateCaseNoteBody.parse(req.body);
  const [note] = await db
    .insert(caseNotesTable)
    .values({ relocationId: id, ...body })
    .returning();
  await logActivity(id, "note_added", `${body.noteType.toUpperCase()}: ${body.title}`);
  res.status(201).json(CreateCaseNoteResponse.parse(toJson(note)));
});

// PUT /relocations/:id/notes/:noteId
router.put("/relocations/:id/notes/:noteId", async (req, res) => {
  const { id, noteId } = UpdateCaseNoteParams.parse(toJson(req.params));
  const body = UpdateCaseNoteBody.parse(req.body);
  const [note] = await db
    .update(caseNotesTable)
    .set(body)
    .where(and(eq(caseNotesTable.id, noteId), eq(caseNotesTable.relocationId, id)))
    .returning();
  await logActivity(id, "note_updated", `Note updated: ${note?.title ?? ""}`);
  res.json(UpdateCaseNoteResponse.parse(toJson(note)));
});

// DELETE /relocations/:id/notes/:noteId
router.delete("/relocations/:id/notes/:noteId", async (req, res) => {
  const { id, noteId } = DeleteCaseNoteParams.parse(toJson(req.params));
  const [deleted] = await db
    .delete(caseNotesTable)
    .where(and(eq(caseNotesTable.id, noteId), eq(caseNotesTable.relocationId, id)))
    .returning();
  await logActivity(id, "note_deleted", `Note removed: ${deleted?.title ?? ""}`);
  res.status(204).send();
});

export default router;
