import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { GlobalSearchResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const q = (req.query["q"] as string | undefined)?.trim() ?? "";

  if (!q || q.length < 2) {
    res.json(GlobalSearchResponse.parse({
      query: q,
      total: 0,
      profiles: [],
      relocations: [],
      vendors: [],
      housing: [],
      schools: [],
    }));
    return;
  }

  const term = `%${q.toLowerCase()}%`;

  const [profileRows, relocationRows, vendorRows, housingRows, schoolRows] = await Promise.all([
    // Profiles
    db.execute(sql`
      SELECT id, full_name, email, employer, nationality
      FROM profiles
      WHERE LOWER(full_name) LIKE ${term}
         OR LOWER(email) LIKE ${term}
         OR LOWER(employer) LIKE ${term}
         OR LOWER(nationality) LIKE ${term}
      LIMIT 8
    `),
    // Relocations (via profile join)
    db.execute(sql`
      SELECT r.id, p.full_name, r.status, r.stage, r.corporate_account, r.assigned_to
      FROM relocations r
      JOIN profiles p ON r.profile_id = p.id
      WHERE LOWER(p.full_name) LIKE ${term}
         OR LOWER(r.status) LIKE ${term}
         OR LOWER(r.stage) LIKE ${term}
         OR LOWER(COALESCE(r.corporate_account, '')) LIKE ${term}
         OR LOWER(COALESCE(r.assigned_to, '')) LIKE ${term}
      LIMIT 8
    `),
    // Vendors
    db.execute(sql`
      SELECT id, name, category, rating
      FROM vendors
      WHERE LOWER(name) LIKE ${term}
         OR LOWER(COALESCE(category, '')) LIKE ${term}
      LIMIT 8
    `),
    // Housing
    db.execute(sql`
      SELECT id, title, neighbourhood, property_type, rent_usd_per_month
      FROM housing_listings
      WHERE LOWER(title) LIKE ${term}
         OR LOWER(COALESCE(neighbourhood, '')) LIKE ${term}
         OR LOWER(COALESCE(property_type, '')) LIKE ${term}
      LIMIT 8
    `),
    // Schools
    db.execute(sql`
      SELECT id, name, curriculum, neighbourhood
      FROM schools
      WHERE LOWER(name) LIKE ${term}
         OR LOWER(COALESCE(curriculum, '')) LIKE ${term}
         OR LOWER(COALESCE(neighbourhood, '')) LIKE ${term}
      LIMIT 8
    `),
  ]);

  const profiles = profileRows.rows.map(r => ({
    id: r.id as number,
    type: "profile",
    title: r.full_name as string,
    subtitle: [r.employer, r.nationality].filter(Boolean).join(" · "),
    href: `/profiles/${r.id}`,
  }));

  const relocations = relocationRows.rows.map(r => ({
    id: r.id as number,
    type: "relocation",
    title: r.full_name as string,
    subtitle: [r.status, r.stage, r.corporate_account].filter(Boolean).join(" · ").replace(/_/g, " "),
    href: `/relocations/${r.id}`,
  }));

  const vendors = vendorRows.rows.map(r => ({
    id: r.id as number,
    type: "vendor",
    title: r.name as string,
    subtitle: [r.category, r.rating ? `★ ${r.rating}` : null].filter(Boolean).join(" · "),
    href: `/vendors/${r.id}`,
  }));

  const housing = housingRows.rows.map(r => ({
    id: r.id as number,
    type: "housing",
    title: r.title as string,
    subtitle: [r.property_type, r.neighbourhood, r.rent_usd_per_month ? `$${r.rent_usd_per_month}/mo` : null].filter(Boolean).join(" · "),
    href: `/housing/${r.id}`,
  }));

  const schools = schoolRows.rows.map(r => ({
    id: r.id as number,
    type: "school",
    title: r.name as string,
    subtitle: [r.curriculum, r.neighbourhood].filter(Boolean).join(" · "),
    href: `/schools/${r.id}`,
  }));

  const total = profiles.length + relocations.length + vendors.length + housing.length + schools.length;

  res.json(GlobalSearchResponse.parse({ query: q, total, profiles, relocations, vendors, housing, schools }));
});

export default router;
