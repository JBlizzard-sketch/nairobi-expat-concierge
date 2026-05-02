import { Router, type IRouter } from "express";
import { eq, and, sum } from "drizzle-orm";
import { db, relocationExpensesTable, activityLogsTable } from "@workspace/db";
import {
  ListRelocationExpensesParams,
  ListRelocationExpensesResponse,
  CreateRelocationExpenseParams,
  CreateRelocationExpenseBody,
  UpdateRelocationExpenseResponse as CreateRelocationExpenseResponse,
  UpdateRelocationExpenseParams,
  UpdateRelocationExpenseBody,
  UpdateRelocationExpenseResponse,
  DeleteRelocationExpenseParams,
  GetRelocationExpenseSummaryParams,
  GetRelocationExpenseSummaryResponse,
} from "@workspace/api-zod";
import { toJson } from "../lib/serialize";

const router: IRouter = Router();

async function logActivity(relocationId: number, eventType: string, description: string) {
  await db.insert(activityLogsTable).values({ relocationId, eventType, description });
}

// GET /relocations/:id/expenses/summary  (must come before /:id/expenses to avoid param conflict)
router.get("/relocations/:id/expenses/summary", async (req, res) => {
  const { id } = GetRelocationExpenseSummaryParams.parse(toJson(req.params));
  const rows = await db
    .select({
      category: relocationExpensesTable.category,
      total: sum(relocationExpensesTable.amountUsd),
    })
    .from(relocationExpensesTable)
    .where(eq(relocationExpensesTable.relocationId, id))
    .groupBy(relocationExpensesTable.category);

  const byCategory = rows.map(r => ({
    category: r.category,
    totalUsd: Number(r.total ?? 0),
  }));
  const totalUsd = byCategory.reduce((acc, r) => acc + r.totalUsd, 0);
  res.json(GetRelocationExpenseSummaryResponse.parse({ totalUsd, byCategory }));
});

// GET /relocations/:id/expenses
router.get("/relocations/:id/expenses", async (req, res) => {
  const { id } = ListRelocationExpensesParams.parse(toJson(req.params));
  const expenses = await db
    .select()
    .from(relocationExpensesTable)
    .where(eq(relocationExpensesTable.relocationId, id))
    .orderBy(relocationExpensesTable.date);
  res.json(ListRelocationExpensesResponse.parse(toJson(expenses)));
});

// POST /relocations/:id/expenses
router.post("/relocations/:id/expenses", async (req, res) => {
  const { id } = CreateRelocationExpenseParams.parse(toJson(req.params));
  const body = CreateRelocationExpenseBody.parse(req.body);
  const [expense] = await db
    .insert(relocationExpensesTable)
    .values({ relocationId: id, ...body })
    .returning();
  await logActivity(id, "expense_added", `Expense logged: "${body.description}" — $${body.amountUsd.toLocaleString()}`);
  res.status(201).json(CreateRelocationExpenseResponse.parse(toJson(expense)));
});

// PATCH /relocations/:id/expenses/:expenseId
router.patch("/relocations/:id/expenses/:expenseId", async (req, res) => {
  const { id, expenseId } = UpdateRelocationExpenseParams.parse(toJson(req.params));
  const body = UpdateRelocationExpenseBody.parse(req.body);
  const [expense] = await db
    .update(relocationExpensesTable)
    .set(body)
    .where(and(eq(relocationExpensesTable.id, expenseId), eq(relocationExpensesTable.relocationId, id)))
    .returning();
  if (!expense) { res.status(404).json({ error: "Expense not found" }); return; }
  await logActivity(id, "expense_updated", `Expense updated: "${expense.description}"`);
  res.json(UpdateRelocationExpenseResponse.parse(toJson(expense)));
});

// DELETE /relocations/:id/expenses/:expenseId
router.delete("/relocations/:id/expenses/:expenseId", async (req, res) => {
  const { id, expenseId } = DeleteRelocationExpenseParams.parse(toJson(req.params));
  const [expense] = await db
    .delete(relocationExpensesTable)
    .where(and(eq(relocationExpensesTable.id, expenseId), eq(relocationExpensesTable.relocationId, id)))
    .returning();
  if (!expense) { res.status(404).json({ error: "Expense not found" }); return; }
  await logActivity(id, "expense_removed", `Expense removed: "${expense.description}" — $${expense.amountUsd.toLocaleString()}`);
  res.status(204).send();
});

export default router;
