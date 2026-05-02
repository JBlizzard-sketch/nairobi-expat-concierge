import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, relocationDocumentsTable, activityLogsTable, relocationsTable } from "@workspace/db";
import {
  ListRelocationDocumentsParams,
  ListRelocationDocumentsResponse,
  CreateRelocationDocumentParams,
  CreateRelocationDocumentBody,
  UpdateRelocationDocumentResponse as CreateRelocationDocumentResponse,
  UpdateRelocationDocumentParams,
  UpdateRelocationDocumentBody,
  UpdateRelocationDocumentResponse,
  DeleteRelocationDocumentParams,
} from "@workspace/api-zod";
import { toJson } from "../lib/serialize";

const router: IRouter = Router();

async function logActivity(relocationId: number, eventType: string, description: string) {
  await db.insert(activityLogsTable).values({ relocationId, eventType, description });
}

// GET /relocations/:id/documents
router.get("/relocations/:id/documents", async (req, res) => {
  const { id } = ListRelocationDocumentsParams.parse(toJson(req.params));
  const docs = await db
    .select()
    .from(relocationDocumentsTable)
    .where(eq(relocationDocumentsTable.relocationId, id))
    .orderBy(relocationDocumentsTable.createdAt);
  res.json(ListRelocationDocumentsResponse.parse(toJson(docs)));
});

// POST /relocations/:id/documents
router.post("/relocations/:id/documents", async (req, res) => {
  const { id } = CreateRelocationDocumentParams.parse(toJson(req.params));
  const body = CreateRelocationDocumentBody.parse(req.body);
  const [doc] = await db
    .insert(relocationDocumentsTable)
    .values({ relocationId: id, ...body })
    .returning();
  await logActivity(id, "document_added", `Document added: "${body.name}" (${body.category})`);
  res.status(201).json(CreateRelocationDocumentResponse.parse(toJson(doc)));
});

// PATCH /relocations/:id/documents/:docId
router.patch("/relocations/:id/documents/:docId", async (req, res) => {
  const { id, docId } = UpdateRelocationDocumentParams.parse(toJson(req.params));
  const body = UpdateRelocationDocumentBody.parse(req.body);
  const [doc] = await db
    .update(relocationDocumentsTable)
    .set(body)
    .where(and(eq(relocationDocumentsTable.id, docId), eq(relocationDocumentsTable.relocationId, id)))
    .returning();
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  if (body.status) {
    await logActivity(id, "document_status_changed", `"${doc.name}" marked ${body.status}`);
  } else {
    await logActivity(id, "document_updated", `Document updated: "${doc.name}"`);
  }
  res.json(UpdateRelocationDocumentResponse.parse(toJson(doc)));
});

// DELETE /relocations/:id/documents/:docId
router.delete("/relocations/:id/documents/:docId", async (req, res) => {
  const { id, docId } = DeleteRelocationDocumentParams.parse(toJson(req.params));
  const [doc] = await db
    .delete(relocationDocumentsTable)
    .where(and(eq(relocationDocumentsTable.id, docId), eq(relocationDocumentsTable.relocationId, id)))
    .returning();
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  await logActivity(id, "document_removed", `Document removed: "${doc.name}"`);
  res.status(204).send();
});

export default router;
