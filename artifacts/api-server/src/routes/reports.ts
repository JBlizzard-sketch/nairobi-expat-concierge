import { Router, type IRouter } from "express";
import { eq, sum } from "drizzle-orm";
import {
  db,
  relocationsTable,
  profilesTable,
  relocationTasksTable,
  relocationDocumentsTable,
  relocationExpensesTable,
  caseNotesTable,
  schoolApplicationsTable,
  schoolsTable,
  housingShortlistsTable,
  housingListingsTable,
  caseVendorsTable,
  vendorsTable,
} from "@workspace/db";
import { GetCaseReportResponse } from "@workspace/api-zod";
import { toJson } from "../lib/serialize";

const router: IRouter = Router();

// ─── GET /reports/case/:id ──────────────────────────────────────────────────
router.get("/reports/case/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "0", 10);

  // Core relocation + profile
  const relocationRows = await db
    .select()
    .from(relocationsTable)
    .innerJoin(profilesTable, eq(relocationsTable.profileId, profilesTable.id))
    .where(eq(relocationsTable.id, id))
    .limit(1);

  if (relocationRows.length === 0) {
    res.status(404).json({ error: "Relocation not found" });
    return;
  }

  const { relocations: rel, profiles: prof } = relocationRows[0]!;

  // Parallel fetch of all sub-entities
  const [tasks, documents, expenses, expenseSum, schoolApps, housingShortlist, caseVendors, notes] =
    await Promise.all([
      db.select().from(relocationTasksTable).where(eq(relocationTasksTable.relocationId, id)),
      db.select().from(relocationDocumentsTable).where(eq(relocationDocumentsTable.relocationId, id)),
      db.select().from(relocationExpensesTable).where(eq(relocationExpensesTable.relocationId, id)),
      db
        .select({ total: sum(relocationExpensesTable.amountUsd) })
        .from(relocationExpensesTable)
        .where(eq(relocationExpensesTable.relocationId, id)),
      db
        .select({ app: schoolApplicationsTable, school: schoolsTable })
        .from(schoolApplicationsTable)
        .innerJoin(schoolsTable, eq(schoolApplicationsTable.schoolId, schoolsTable.id))
        .where(eq(schoolApplicationsTable.relocationId, id)),
      db
        .select({ shortlist: housingShortlistsTable, listing: housingListingsTable })
        .from(housingShortlistsTable)
        .innerJoin(housingListingsTable, eq(housingShortlistsTable.housingId, housingListingsTable.id))
        .where(eq(housingShortlistsTable.relocationId, id)),
      db
        .select({ cv: caseVendorsTable, vendor: vendorsTable })
        .from(caseVendorsTable)
        .innerJoin(vendorsTable, eq(caseVendorsTable.vendorId, vendorsTable.id))
        .where(eq(caseVendorsTable.relocationId, id)),
      db
        .select()
        .from(caseNotesTable)
        .where(eq(caseNotesTable.relocationId, id))
        .orderBy(caseNotesTable.createdAt),
    ]);

  const report = {
    generatedAt: new Date().toISOString(),
    relocation: {
      id: rel.id,
      status: rel.status,
      stage: rel.stage,
      assignedTo: rel.assignedTo ?? null,
      corporateAccount: rel.corporateAccount ?? null,
      packageTier: rel.packageTier,
      notes: rel.notes ?? null,
      createdAt: rel.createdAt.toISOString(),
    },
    profile: {
      id: prof.id,
      fullName: prof.fullName,
      email: prof.email,
      nationality: prof.nationality,
      employer: prof.employer,
      arrivalDate: prof.arrivalDate ?? null,
      familySize: prof.familySize,
      schoolAgeChildren: prof.schoolAgeChildren,
      budgetUsd: prof.budgetUsd ?? null,
    },
    tasks: tasks.map(t => ({
      id: t.id,
      category: t.category,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate ?? null,
    })),
    documents: documents.map(d => ({
      id: d.id,
      name: d.name,
      category: d.category,
      status: d.status,
      dueDate: d.dueDate ?? null,
    })),
    expenses: expenses.map(e => ({
      id: e.id,
      category: e.category,
      description: e.description,
      amountUsd: e.amountUsd,
      date: e.date,
    })),
    totalExpensesUsd: Number(expenseSum[0]?.total ?? 0),
    housing: housingShortlist.map(({ shortlist, listing }) => ({
      id: listing.id,
      title: listing.title,
      neighbourhood: listing.neighbourhood,
      propertyType: listing.propertyType,
      rentUsdPerMonth: listing.rentUsdPerMonth,
      status: shortlist.status,
    })),
    schools: schoolApps.map(({ app, school }) => ({
      id: school.id,
      name: school.name,
      curriculum: school.curriculum,
      neighbourhood: school.neighbourhood,
      status: app.status,
    })),
    vendors: caseVendors.map(({ cv, vendor }) => ({
      id: vendor.id,
      name: vendor.name,
      category: vendor.category,
      status: cv.status,
    })),
    notes: notes.map(n => ({
      id: n.id,
      title: n.title,
      noteType: n.noteType,
      content: n.content,
      contactPerson: n.contactPerson ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
  };

  res.json(GetCaseReportResponse.parse(toJson(report)));
});

// ─── GET /reports/export ────────────────────────────────────────────────────
router.get("/reports/export", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      rel: relocationsTable,
      prof: profilesTable,
    })
    .from(relocationsTable)
    .innerJoin(profilesTable, eq(relocationsTable.profileId, profilesTable.id))
    .orderBy(relocationsTable.createdAt);

  const headers = [
    "Case ID", "Status", "Stage", "Package Tier", "Assigned To", "Corporate Account",
    "Client Name", "Email", "Nationality", "Employer",
    "Family Size", "School Age Children", "Budget USD", "Arrival Date", "Created At",
  ].join(",");

  const csvRows = rows.map(({ rel, prof }) =>
    [
      rel.id,
      rel.status,
      rel.stage,
      rel.packageTier,
      rel.assignedTo ?? "",
      rel.corporateAccount ?? "",
      `"${prof.fullName}"`,
      prof.email,
      prof.nationality,
      `"${prof.employer}"`,
      prof.familySize,
      prof.schoolAgeChildren,
      prof.budgetUsd ?? "",
      prof.arrivalDate ?? "",
      rel.createdAt.toISOString().split("T")[0],
    ].join(",")
  );

  const csv = [headers, ...csvRows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="nairobi-concierge-cases.csv"');
  res.send(csv);
});

export default router;
