import { Router, type IRouter } from "express";
import { db, vendorReviewsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreateVendorReviewBody } from "@workspace/api-zod";
import { toJson } from "../lib/serialize";

const router: IRouter = Router();

// GET /vendors/:id/reviews
router.get("/vendors/:id/reviews", async (req, res) => {
  const vendorId = parseInt(req.params["id"]!);
  if (isNaN(vendorId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select()
    .from(vendorReviewsTable)
    .where(eq(vendorReviewsTable.vendorId, vendorId))
    .orderBy(desc(vendorReviewsTable.createdAt));

  res.json(toJson(rows));
});

// POST /vendors/:id/reviews
router.post("/vendors/:id/reviews", async (req, res) => {
  const vendorId = parseInt(req.params["id"]!);
  if (isNaN(vendorId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = CreateVendorReviewBody.parse(req.body);

  if (body.rating < 1 || body.rating > 5) {
    res.status(400).json({ error: "Rating must be 1–5" }); return;
  }

  const [row] = await db.insert(vendorReviewsTable).values({
    vendorId,
    relocationId: body.relocationId ?? null,
    rating: body.rating,
    title: body.title,
    review: body.review ?? null,
    pros: body.pros ?? null,
    cons: body.cons ?? null,
    wouldRecommend: body.wouldRecommend ?? true,
    reviewedBy: body.reviewedBy ?? null,
  }).returning();

  res.status(201).json(toJson(row!));
});

// DELETE /vendors/:id/reviews/:reviewId
router.delete("/vendors/:id/reviews/:reviewId", async (req, res) => {
  const vendorId = parseInt(req.params["id"]!);
  const reviewId = parseInt(req.params["reviewId"]!);
  if (isNaN(vendorId) || isNaN(reviewId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db
    .delete(vendorReviewsTable)
    .where(and(eq(vendorReviewsTable.id, reviewId), eq(vendorReviewsTable.vendorId, vendorId)));

  res.status(204).end();
});

export { router as vendorReviewsRouter };
