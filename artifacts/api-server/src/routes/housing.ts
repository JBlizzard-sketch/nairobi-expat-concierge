import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, housingListingsTable } from "@workspace/db";
import {
  CreateHousingListingBody,
  GetHousingListingParams,
  GetHousingListingResponse,
  UpdateHousingListingParams,
  UpdateHousingListingBody,
  UpdateHousingListingResponse,
  DeleteHousingListingParams,
  ListHousingResponse,
} from "@workspace/api-zod";
import { toJson } from "../lib/serialize";

const router: IRouter = Router();

router.get("/housing", async (_req, res): Promise<void> => {
  const listings = await db.select().from(housingListingsTable).orderBy(housingListingsTable.createdAt);
  res.json(ListHousingResponse.parse(toJson(listings)));
});

router.post("/housing", async (req, res): Promise<void> => {
  const parsed = CreateHousingListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [listing] = await db.insert(housingListingsTable).values(parsed.data).returning();
  res.status(201).json(GetHousingListingResponse.parse(toJson(listing)));
});

router.get("/housing/:id", async (req, res): Promise<void> => {
  const params = GetHousingListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [listing] = await db.select().from(housingListingsTable).where(eq(housingListingsTable.id, params.data.id));
  if (!listing) {
    res.status(404).json({ error: "Housing listing not found" });
    return;
  }
  res.json(GetHousingListingResponse.parse(toJson(listing)));
});

router.patch("/housing/:id", async (req, res): Promise<void> => {
  const params = UpdateHousingListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateHousingListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [listing] = await db
    .update(housingListingsTable)
    .set(parsed.data)
    .where(eq(housingListingsTable.id, params.data.id))
    .returning();
  if (!listing) {
    res.status(404).json({ error: "Housing listing not found" });
    return;
  }
  res.json(UpdateHousingListingResponse.parse(toJson(listing)));
});

router.delete("/housing/:id", async (req, res): Promise<void> => {
  const params = DeleteHousingListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [listing] = await db
    .delete(housingListingsTable)
    .where(eq(housingListingsTable.id, params.data.id))
    .returning();
  if (!listing) {
    res.status(404).json({ error: "Housing listing not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
