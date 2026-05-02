import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, relocationsTable, profilesTable, relocationTasksTable, activityLogsTable } from "@workspace/db";
import {
  GetTemplateSetsResponse,
  GetTemplateSetDetailResponse,
  ApplyTemplateSetResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── Template Data ──────────────────────────────────────────────────────────

type TemplateTaskDef = { title: string; category: string; daysFromArrival: number };

const NAIROBI_TEMPLATES: Record<string, {
  id: string; name: string; tier: string; description: string; tasks: TemplateTaskDef[];
}> = {
  standard: {
    id: "standard",
    name: "Standard Onboarding",
    tier: "individual",
    description: "Core 15-task checklist for individual expat relocations covering immigration, housing, settling-in and logistics.",
    tasks: [
      // Immigration (before arrival)
      { title: "Gather passport copies and background documents", category: "Immigration", daysFromArrival: -60 },
      { title: "Apply for Kenya Work Permit (Class G)", category: "Immigration", daysFromArrival: -45 },
      { title: "Apply for Dependent Pass for family members", category: "Immigration", daysFromArrival: -45 },
      { title: "Obtain KRA PIN Certificate", category: "Immigration", daysFromArrival: -14 },
      // Housing
      { title: "Research preferred neighbourhoods (Karen, Westlands, Lavington)", category: "Housing", daysFromArrival: -30 },
      { title: "Shortlist 3–5 properties with agent", category: "Housing", daysFromArrival: -21 },
      { title: "Sign lease agreement and pay deposit", category: "Housing", daysFromArrival: -7 },
      { title: "Arrange move-in inspection and inventory check", category: "Housing", daysFromArrival: 2 },
      // Banking & Finance
      { title: "Open local bank account (Equity / KCB / NCBA)", category: "Banking & Finance", daysFromArrival: 7 },
      { title: "Register for NHIF (National Health Insurance)", category: "Banking & Finance", daysFromArrival: 14 },
      // Settling In
      { title: "Register with home country embassy in Nairobi", category: "Settling In", daysFromArrival: 14 },
      { title: "Obtain Kenyan driving licence or convert foreign licence", category: "Settling In", daysFromArrival: 21 },
      { title: "Set up M-Pesa mobile money account", category: "Settling In", daysFromArrival: 3 },
      // Logistics
      { title: "Arrange customs clearance for personal effects shipment", category: "Logistics", daysFromArrival: -14 },
      { title: "Set up utilities (electricity, water, fibre internet)", category: "Logistics", daysFromArrival: 1 },
    ],
  },
  premium: {
    id: "premium",
    name: "Premium Onboarding",
    tier: "premium",
    description: "Comprehensive 22-task checklist for premium-tier clients including school enrolment, vehicle import and club membership.",
    tasks: [
      // Immigration
      { title: "Gather passport copies and background documents", category: "Immigration", daysFromArrival: -60 },
      { title: "Apply for Kenya Work Permit (Class G)", category: "Immigration", daysFromArrival: -45 },
      { title: "Apply for Dependent Pass for family members", category: "Immigration", daysFromArrival: -45 },
      { title: "Obtain KRA PIN Certificate", category: "Immigration", daysFromArrival: -14 },
      { title: "Register alien card at Department of Immigration", category: "Immigration", daysFromArrival: 30 },
      // Housing
      { title: "Research preferred neighbourhoods with security briefing", category: "Housing", daysFromArrival: -30 },
      { title: "Shortlist 5–8 properties with agent", category: "Housing", daysFromArrival: -21 },
      { title: "Conduct property viewings and security assessments", category: "Housing", daysFromArrival: -14 },
      { title: "Sign lease agreement and pay deposit", category: "Housing", daysFromArrival: -7 },
      { title: "Arrange move-in inspection and inventory check", category: "Housing", daysFromArrival: 2 },
      // Schools
      { title: "Research international schools (ISN, GEMS, Brookhouse)", category: "Schools", daysFromArrival: -60 },
      { title: "Submit school applications with transcripts", category: "Schools", daysFromArrival: -45 },
      { title: "Attend school interviews and assessments", category: "Schools", daysFromArrival: -21 },
      { title: "Confirm school placement and pay term fees", category: "Schools", daysFromArrival: -7 },
      // Vehicle
      { title: "Source right-hand-drive vehicle (purchase or lease)", category: "Vehicle", daysFromArrival: -14 },
      { title: "Process vehicle import duty and KRA valuation", category: "Vehicle", daysFromArrival: 7 },
      { title: "Register vehicle with NTSA and obtain insurance", category: "Vehicle", daysFromArrival: 21 },
      // Banking & Finance
      { title: "Open local bank account (Equity / KCB / NCBA)", category: "Banking & Finance", daysFromArrival: 7 },
      { title: "Register for NHIF (National Health Insurance)", category: "Banking & Finance", daysFromArrival: 14 },
      { title: "Set up M-Pesa mobile money account", category: "Settling In", daysFromArrival: 3 },
      // Settling In
      { title: "Register with home country embassy in Nairobi", category: "Settling In", daysFromArrival: 14 },
      { title: "Arrange memberships: Muthaiga, KGSA or Nairobi Club", category: "Settling In", daysFromArrival: 30 },
    ],
  },
  corporate_elite: {
    id: "corporate_elite",
    name: "Corporate Elite Onboarding",
    tier: "corporate_premium",
    description: "Full 28-task white-glove checklist for corporate-sponsored executives including spouse employment support and VIP services.",
    tasks: [
      // Immigration
      { title: "Gather passport copies and background documents", category: "Immigration", daysFromArrival: -60 },
      { title: "Apply for Kenya Work Permit (Class G)", category: "Immigration", daysFromArrival: -45 },
      { title: "Apply for Dependent Pass for spouse and children", category: "Immigration", daysFromArrival: -45 },
      { title: "Obtain KRA PIN Certificate", category: "Immigration", daysFromArrival: -14 },
      { title: "Register alien card at Department of Immigration", category: "Immigration", daysFromArrival: 30 },
      { title: "Explore spouse work permit or business permit options", category: "Immigration", daysFromArrival: -30 },
      // Housing
      { title: "Security briefing with concierge team on Nairobi zones", category: "Housing", daysFromArrival: -45 },
      { title: "Shortlist 6–10 executive properties with agent", category: "Housing", daysFromArrival: -30 },
      { title: "Conduct property viewings with security and infrastructure audit", category: "Housing", daysFromArrival: -21 },
      { title: "Review lease with legal counsel and negotiate terms", category: "Housing", daysFromArrival: -14 },
      { title: "Sign lease agreement and pay deposit", category: "Housing", daysFromArrival: -7 },
      { title: "Furnishing and interior setup consultation", category: "Housing", daysFromArrival: 0 },
      { title: "Hire household staff (housekeeper, guard, driver)", category: "Housing", daysFromArrival: 7 },
      // Schools
      { title: "Research international schools (ISN, GEMS, Brookhouse, KICS)", category: "Schools", daysFromArrival: -60 },
      { title: "Submit school applications with full transcripts", category: "Schools", daysFromArrival: -45 },
      { title: "Attend school interviews and assessments", category: "Schools", daysFromArrival: -21 },
      { title: "Confirm school placement and pay term fees", category: "Schools", daysFromArrival: -7 },
      // Vehicle
      { title: "Source 2 executive vehicles (CEO + family SUV)", category: "Vehicle", daysFromArrival: -21 },
      { title: "Process vehicle import duty and KRA valuation", category: "Vehicle", daysFromArrival: 7 },
      { title: "Register vehicles with NTSA and comprehensive insurance", category: "Vehicle", daysFromArrival: 21 },
      // Banking & Finance
      { title: "Open Premier/Private Banking account", category: "Banking & Finance", daysFromArrival: 7 },
      { title: "Register for NHIF and arrange top-up medical cover", category: "Banking & Finance", daysFromArrival: 14 },
      { title: "Set up M-Pesa Paybill and corporate expense management", category: "Banking & Finance", daysFromArrival: 7 },
      // Settling In
      { title: "Register with home country embassy in Nairobi", category: "Settling In", daysFromArrival: 14 },
      { title: "Arrange executive club memberships (Muthaiga, KGSA, ION)", category: "Settling In", daysFromArrival: 30 },
      { title: "Spouse integration programme — networking events", category: "Settling In", daysFromArrival: 21 },
      { title: "Nairobi orientation tour with concierge team", category: "Settling In", daysFromArrival: 1 },
      // Logistics
      { title: "Arrange priority customs clearance for personal effects", category: "Logistics", daysFromArrival: -14 },
    ],
  },
  visa_only: {
    id: "visa_only",
    name: "Visa & Immigration Track",
    tier: "any",
    description: "Focused 8-task checklist for clients who need immigration support only — permits, KRA PIN and alien registration.",
    tasks: [
      { title: "Collect all required identity documents", category: "Immigration", daysFromArrival: -60 },
      { title: "Apply for Kenya Work Permit (Class G or appropriate class)", category: "Immigration", daysFromArrival: -50 },
      { title: "Apply for Dependent Pass for family members", category: "Immigration", daysFromArrival: -45 },
      { title: "Track permit application status with Department of Immigration", category: "Immigration", daysFromArrival: -30 },
      { title: "Obtain KRA PIN Certificate", category: "Immigration", daysFromArrival: -14 },
      { title: "Collect work permit booklet on arrival", category: "Immigration", daysFromArrival: 3 },
      { title: "Register alien card at Department of Immigration", category: "Immigration", daysFromArrival: 30 },
      { title: "Set up NHIF registration using work permit", category: "Immigration", daysFromArrival: 45 },
    ],
  },
};

function addDays(baseDate: Date, days: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/task-templates/sets", async (_req, res): Promise<void> => {
  const sets = Object.values(NAIROBI_TEMPLATES).map(s => ({
    id: s.id,
    name: s.name,
    tier: s.tier,
    description: s.description,
    taskCount: s.tasks.length,
    categories: [...new Set(s.tasks.map(t => t.category))],
  }));
  res.json(GetTemplateSetsResponse.parse(sets));
});

router.get("/task-templates/sets/:id", async (req, res): Promise<void> => {
  const set = NAIROBI_TEMPLATES[req.params["id"] ?? ""];
  if (!set) { res.status(404).json({ error: "Template set not found" }); return; }
  res.json(GetTemplateSetDetailResponse.parse({
    id: set.id,
    name: set.name,
    tier: set.tier,
    description: set.description,
    tasks: set.tasks,
  }));
});

router.post("/relocations/:id/apply-template-set", async (req, res): Promise<void> => {
  const relocationId = parseInt(req.params["id"] ?? "0", 10);
  const { setId, skipExisting = true } = req.body as { setId: string; skipExisting?: boolean };

  const set = NAIROBI_TEMPLATES[setId];
  if (!set) { res.status(404).json({ error: "Template set not found" }); return; }

  // Load relocation + profile for arrival date
  const rows = await db
    .select({ rel: relocationsTable, prof: profilesTable })
    .from(relocationsTable)
    .innerJoin(profilesTable, eq(relocationsTable.profileId, profilesTable.id))
    .where(eq(relocationsTable.id, relocationId))
    .limit(1);

  if (rows.length === 0) { res.status(404).json({ error: "Relocation not found" }); return; }

  const { prof } = rows[0]!;
  const baseDate = prof.arrivalDate ? new Date(prof.arrivalDate) : new Date();

  // Optionally skip tasks that already exist (by title)
  let existingTitles: Set<string> = new Set();
  if (skipExisting) {
    const existing = await db
      .select({ title: relocationTasksTable.title })
      .from(relocationTasksTable)
      .where(eq(relocationTasksTable.relocationId, relocationId));
    existingTitles = new Set(existing.map(r => r.title));
  }

  const toInsert = set.tasks
    .filter(t => !existingTitles.has(t.title))
    .map(t => ({
      relocationId,
      category: t.category,
      title: t.title,
      status: "pending" as const,
      dueDate: addDays(baseDate, t.daysFromArrival),
    }));

  if (toInsert.length > 0) {
    await db.insert(relocationTasksTable).values(toInsert);
  }

  // Activity log
  await db.insert(activityLogsTable).values({
    relocationId,
    eventType: "template_applied",
    description: `Applied template set "${set.name}" — ${toInsert.length} task${toInsert.length !== 1 ? "s" : ""} created`,
  });

  const skipped = set.tasks.length - toInsert.length;
  res.json(ApplyTemplateSetResponse.parse({ tasksCreated: toInsert.length, skipped, setName: set.name }));
});

export default router;
