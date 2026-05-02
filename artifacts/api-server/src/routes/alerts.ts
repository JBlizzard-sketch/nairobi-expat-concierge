import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { GetAlertsResponse, GetAlertCountResponse } from "@workspace/api-zod";
import { toJson } from "../lib/serialize";

const router: IRouter = Router();

function today(): string {
  return new Date().toISOString().split("T")[0]!;
}

function daysOverdue(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function taskSeverity(daysOver: number): string {
  if (daysOver >= 14) return "high";
  if (daysOver >= 7) return "medium";
  return "low";
}

router.get("/alerts", async (_req, res): Promise<void> => {
  const t = today();
  const alerts: {
    id: string;
    alertType: string;
    severity: string;
    title: string;
    description: string;
    relocationId: number;
    clientName: string;
    dueDate: string | null;
  }[] = [];

  // 1. Overdue tasks
  const overdueTasks = await db.execute(sql`
    SELECT rt.id, rt.title, rt.due_date, rt.category, r.id AS relocation_id, p.full_name
    FROM relocation_tasks rt
    JOIN relocations r ON rt.relocation_id = r.id
    JOIN profiles p ON r.profile_id = p.id
    WHERE rt.status != 'completed'
      AND rt.due_date IS NOT NULL
      AND rt.due_date < ${t}
    ORDER BY rt.due_date ASC
    LIMIT 30
  `);
  for (const row of overdueTasks.rows) {
    const over = daysOverdue(row.due_date as string);
    alerts.push({
      id: `task-${row.id}`,
      alertType: "overdue_task",
      severity: taskSeverity(over),
      title: `Overdue Task: ${row.title}`,
      description: `"${row.category}" task was due ${row.due_date} — ${over} day${over === 1 ? "" : "s"} overdue.`,
      relocationId: row.relocation_id as number,
      clientName: row.full_name as string,
      dueDate: row.due_date as string,
    });
  }

  // 2. Overdue documents
  const overdueDocs = await db.execute(sql`
    SELECT rd.id, rd.name, rd.due_date, rd.category, r.id AS relocation_id, p.full_name
    FROM relocation_documents rd
    JOIN relocations r ON rd.relocation_id = r.id
    JOIN profiles p ON r.profile_id = p.id
    WHERE rd.status NOT IN ('received', 'approved', 'complete')
      AND rd.due_date IS NOT NULL
      AND rd.due_date < ${t}
    ORDER BY rd.due_date ASC
    LIMIT 30
  `);
  for (const row of overdueDocs.rows) {
    const over = daysOverdue(row.due_date as string);
    alerts.push({
      id: `doc-${row.id}`,
      alertType: "overdue_document",
      severity: taskSeverity(over),
      title: `Overdue Document: ${row.name}`,
      description: `${row.category} document was due ${row.due_date} — ${over} day${over === 1 ? "" : "s"} overdue.`,
      relocationId: row.relocation_id as number,
      clientName: row.full_name as string,
      dueDate: row.due_date as string,
    });
  }

  // 3. Overdue follow-ups from consultation notes
  const overdueFollowups = await db.execute(sql`
    SELECT cn.id, cn.title, cn.follow_up_date, r.id AS relocation_id, p.full_name
    FROM case_notes cn
    JOIN relocations r ON cn.relocation_id = r.id
    JOIN profiles p ON r.profile_id = p.id
    WHERE cn.follow_up_date IS NOT NULL
      AND cn.follow_up_date < ${t}
    ORDER BY cn.follow_up_date ASC
    LIMIT 20
  `);
  for (const row of overdueFollowups.rows) {
    const over = daysOverdue(row.follow_up_date as string);
    alerts.push({
      id: `followup-${row.id}`,
      alertType: "overdue_followup",
      severity: over >= 7 ? "high" : "medium",
      title: `Overdue Follow-up: ${row.title}`,
      description: `Follow-up was due ${row.follow_up_date} — ${over} day${over === 1 ? "" : "s"} overdue.`,
      relocationId: row.relocation_id as number,
      clientName: row.full_name as string,
      dueDate: row.follow_up_date as string,
    });
  }

  // 4. Over-budget cases
  const overBudget = await db.execute(sql`
    SELECT r.id AS relocation_id, p.full_name, p.budget_usd,
           COALESCE(SUM(re.amount_usd), 0) AS total_spent
    FROM relocations r
    JOIN profiles p ON r.profile_id = p.id
    LEFT JOIN relocation_expenses re ON re.relocation_id = r.id
    WHERE p.budget_usd IS NOT NULL AND r.status NOT IN ('completed')
    GROUP BY r.id, p.full_name, p.budget_usd
    HAVING COALESCE(SUM(re.amount_usd), 0) > p.budget_usd
    LIMIT 20
  `);
  for (const row of overBudget.rows) {
    const overage = (row.total_spent as number) - (row.budget_usd as number);
    const pct = Math.round((overage / (row.budget_usd as number)) * 100);
    alerts.push({
      id: `budget-${row.relocation_id}`,
      alertType: "over_budget",
      severity: pct >= 50 ? "high" : pct >= 20 ? "medium" : "low",
      title: `Over Budget: ${row.full_name}`,
      description: `Total expenses $${row.total_spent} exceed monthly budget of $${row.budget_usd} by $${overage} (${pct}% over).`,
      relocationId: row.relocation_id as number,
      clientName: row.full_name as string,
      dueDate: null,
    });
  }

  // 5. Stale active cases (no activity in 7+ days)
  const staleCases = await db.execute(sql`
    SELECT r.id AS relocation_id, p.full_name,
           MAX(al.created_at) AS last_activity
    FROM relocations r
    JOIN profiles p ON r.profile_id = p.id
    LEFT JOIN activity_logs al ON al.relocation_id = r.id
    WHERE r.status = 'active'
    GROUP BY r.id, p.full_name
    HAVING MAX(al.created_at) < NOW() - INTERVAL '7 days'
        OR MAX(al.created_at) IS NULL
    LIMIT 20
  `);
  for (const row of staleCases.rows) {
    const lastActivity = row.last_activity ? new Date(row.last_activity as string) : null;
    const daysAgo = lastActivity
      ? Math.floor((Date.now() - lastActivity.getTime()) / 86_400_000)
      : null;
    alerts.push({
      id: `stale-${row.relocation_id}`,
      alertType: "stale_case",
      severity: daysAgo === null || daysAgo >= 14 ? "high" : "medium",
      title: `Stale Case: ${row.full_name}`,
      description: daysAgo !== null
        ? `No activity logged in ${daysAgo} day${daysAgo === 1 ? "" : "s"}. Check-in recommended.`
        : `No activity logged yet for this active case.`,
      relocationId: row.relocation_id as number,
      clientName: row.full_name as string,
      dueDate: null,
    });
  }

  // Sort: high → medium → low, then by dueDate
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => {
    const sv = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
    if (sv !== 0) return sv;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    return 0;
  });

  res.json(GetAlertsResponse.parse(alerts.map(toJson)));
});

router.get("/alerts/count", async (_req, res): Promise<void> => {
  const t = today();

  const taskRes = await db.execute(sql`
    SELECT COUNT(*) AS cnt FROM relocation_tasks
    WHERE status != 'completed' AND due_date IS NOT NULL AND due_date < ${t}
  `);
  const docRes = await db.execute(sql`
    SELECT COUNT(*) AS cnt FROM relocation_documents
    WHERE status NOT IN ('received','approved','complete') AND due_date IS NOT NULL AND due_date < ${t}
  `);
  const followupRes = await db.execute(sql`
    SELECT COUNT(*) AS cnt FROM case_notes
    WHERE follow_up_date IS NOT NULL AND follow_up_date < ${t}
  `);
  const budgetRes = await db.execute(sql`
    SELECT COUNT(*) AS cnt FROM (
      SELECT r.id FROM relocations r
      JOIN profiles p ON r.profile_id = p.id
      LEFT JOIN relocation_expenses re ON re.relocation_id = r.id
      WHERE p.budget_usd IS NOT NULL AND r.status NOT IN ('completed')
      GROUP BY r.id, p.budget_usd
      HAVING COALESCE(SUM(re.amount_usd),0) > p.budget_usd
    ) sub
  `);
  const staleRes = await db.execute(sql`
    SELECT COUNT(*) AS cnt FROM (
      SELECT r.id FROM relocations r
      LEFT JOIN activity_logs al ON al.relocation_id = r.id
      WHERE r.status = 'active'
      GROUP BY r.id
      HAVING MAX(al.created_at) < NOW() - INTERVAL '7 days' OR MAX(al.created_at) IS NULL
    ) sub
  `);

  const byType: Record<string, number> = {
    overdue_task: Number((taskRes.rows[0] as {cnt: string}).cnt),
    overdue_document: Number((docRes.rows[0] as {cnt: string}).cnt),
    overdue_followup: Number((followupRes.rows[0] as {cnt: string}).cnt),
    over_budget: Number((budgetRes.rows[0] as {cnt: string}).cnt),
    stale_case: Number((staleRes.rows[0] as {cnt: string}).cnt),
  };

  res.json(GetAlertCountResponse.parse({
    count: Object.values(byType).reduce((a, b) => a + b, 0),
    byType,
  }));
});

export default router;
