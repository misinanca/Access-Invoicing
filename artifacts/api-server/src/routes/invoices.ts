import { Router, type IRouter } from "express";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import {
  db,
  invoicesTable,
  customersTable,
  lineItemsTable,
  invoiceSettingsTable,
  productsTable,
} from "@workspace/db";
import {
  ListInvoicesQueryParams,
  ListInvoicesResponse,
  CreateInvoiceBody,
  CreateInvoiceResponse,
  GetInvoiceParams,
  GetInvoiceResponse,
  UpdateInvoiceParams,
  UpdateInvoiceBody,
  UpdateInvoiceResponse,
  DeleteInvoiceParams,
  UpdateInvoiceStatusParams,
  UpdateInvoiceStatusBody,
  UpdateInvoiceStatusResponse,
  GetInvoiceSummaryResponse,
  GetRecentInvoicesResponse,
  ListLineItemsParams,
  ListLineItemsResponse,
  CreateLineItemParams,
  CreateLineItemBody,
  CreateLineItemResponse,
  UpdateLineItemParams,
  UpdateLineItemBody,
  UpdateLineItemResponse,
  DeleteLineItemParams,
} from "@workspace/api-zod";
import { getCompanyId } from "../lib/company-context";

const router: IRouter = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatInvoiceRow(r: {
  id: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  status: string;
  issueDate: string;
  dueDate: string;
  notes: string | null;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...r,
    subtotal: Number(r.subtotal),
    taxRate: Number(r.taxRate),
    taxAmount: Number(r.taxAmount),
    total: Number(r.total),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function recalcInvoiceTotals(invoiceId: number, companyId?: number): Promise<void> {
  const items = await db
    .select()
    .from(lineItemsTable)
    .where(eq(lineItemsTable.invoiceId, invoiceId));

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const [inv] = await db
    .select({ taxRate: invoicesTable.taxRate })
    .from(invoicesTable)
    .where(and(
      eq(invoicesTable.id, invoiceId),
      ...(companyId === undefined ? [] : [eq(invoicesTable.companyId, companyId)]),
    ));

  const taxRate = inv ? Number(inv.taxRate) : 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  await db
    .update(invoicesTable)
    .set({
      subtotal: String(subtotal.toFixed(2)),
      taxAmount: String(taxAmount.toFixed(2)),
      total: String(total.toFixed(2)),
      updatedAt: new Date(),
    })
    .where(and(
      eq(invoicesTable.id, invoiceId),
      ...(companyId === undefined ? [] : [eq(invoicesTable.companyId, companyId)]),
    ));
}

async function invoiceBelongsToCompany(invoiceId: number, companyId: number): Promise<boolean> {
  const [invoice] = await db
    .select({ id: invoicesTable.id })
    .from(invoicesTable)
    .where(and(
      eq(invoicesTable.id, invoiceId),
      eq(invoicesTable.companyId, companyId),
    ));
  return Boolean(invoice);
}

async function customerBelongsToCompany(customerId: number, companyId: number): Promise<boolean> {
  const [customer] = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(and(
      eq(customersTable.id, customerId),
      eq(customersTable.companyId, companyId),
    ));
  return Boolean(customer);
}

async function productBelongsToCompany(productId: number | undefined, companyId: number): Promise<boolean> {
  if (productId === undefined) return true;
  const [product] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(and(
      eq(productsTable.id, productId),
      eq(productsTable.companyId, companyId),
    ));
  return Boolean(product);
}

// Generate sequential invoice number
async function nextInvoiceNumber(companyId: number): Promise<string> {
  const [last] = await db
    .select({ invoiceNumber: invoicesTable.invoiceNumber })
    .from(invoicesTable)
    .where(eq(invoicesTable.companyId, companyId))
    .orderBy(desc(invoicesTable.id))
    .limit(1);

  const [settings] = await db
    .select({ invoicePrefix: invoiceSettingsTable.invoicePrefix })
    .from(invoiceSettingsTable)
    .where(eq(invoiceSettingsTable.companyId, companyId));
  const prefix = settings?.invoicePrefix || "INV";

  if (!last) return `${prefix}-0001`;

  const match = last.invoiceNumber.match(/(\d+)$/);
  const num = match ? parseInt(match[1], 10) + 1 : 1;
  return `${prefix}-${String(num).padStart(4, "0")}`;
}

function splitInvoiceNumber(invoiceNumber: string): { prefix: string; number: string } {
  const separatorIndex = invoiceNumber.lastIndexOf("-");
  if (separatorIndex <= 0 || separatorIndex === invoiceNumber.length - 1) {
    return { prefix: "", number: invoiceNumber };
  }

  return {
    prefix: invoiceNumber.slice(0, separatorIndex),
    number: invoiceNumber.slice(separatorIndex + 1),
  };
}

// ── Invoice Summary / Dashboard ──────────────────────────────────────────────

router.get("/invoices/summary", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const [summary] = await db
    .select({
      totalInvoiced: sql<string>`COALESCE(SUM(${invoicesTable.total}), 0)`,
      totalPaid: sql<string>`COALESCE(SUM(CASE WHEN ${invoicesTable.status} = 'paid' THEN ${invoicesTable.total} ELSE 0 END), 0)`,
      totalOutstanding: sql<string>`COALESCE(SUM(CASE WHEN ${invoicesTable.status} IN ('sent', 'draft') THEN ${invoicesTable.total} ELSE 0 END), 0)`,
      totalOverdue: sql<string>`COALESCE(SUM(CASE WHEN ${invoicesTable.status} = 'overdue' THEN ${invoicesTable.total} ELSE 0 END), 0)`,
      invoiceCount: sql<number>`COUNT(*)::int`,
    })
    .from(invoicesTable)
    .where(eq(invoicesTable.companyId, companyId));

  const [{ customerCount }] = await db
    .select({ customerCount: sql<number>`COUNT(*)::int` })
    .from(customersTable)
    .where(eq(customersTable.companyId, companyId));

  res.json(
    GetInvoiceSummaryResponse.parse({
      totalInvoiced: Number(summary?.totalInvoiced ?? 0),
      totalPaid: Number(summary?.totalPaid ?? 0),
      totalOutstanding: Number(summary?.totalOutstanding ?? 0),
      totalOverdue: Number(summary?.totalOverdue ?? 0),
      invoiceCount: summary?.invoiceCount ?? 0,
      customerCount: customerCount ?? 0,
    })
  );
});

// ── Recent Invoices ───────────────────────────────────────────────────────────

router.get("/invoices/recent", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const rows = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      customerId: invoicesTable.customerId,
      customerName: customersTable.name,
      customerEmail: customersTable.email,
      status: invoicesTable.status,
      issueDate: invoicesTable.issueDate,
      dueDate: invoicesTable.dueDate,
      notes: invoicesTable.notes,
      subtotal: invoicesTable.subtotal,
      taxRate: invoicesTable.taxRate,
      taxAmount: invoicesTable.taxAmount,
      total: invoicesTable.total,
      createdAt: invoicesTable.createdAt,
      updatedAt: invoicesTable.updatedAt,
    })
    .from(invoicesTable)
    .innerJoin(customersTable, eq(invoicesTable.customerId, customersTable.id))
    .where(and(
      eq(invoicesTable.companyId, companyId),
      eq(customersTable.companyId, companyId),
    ))
    .orderBy(desc(invoicesTable.createdAt))
    .limit(10);

  res.json(GetRecentInvoicesResponse.parse(rows.map(formatInvoiceRow)));
});

// ── Invoice List ──────────────────────────────────────────────────────────────

router.get("/invoices", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const query = ListInvoicesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [
    eq(invoicesTable.companyId, companyId),
    eq(customersTable.companyId, companyId),
  ];
  if (query.data.status) {
    conditions.push(eq(invoicesTable.status, query.data.status));
  }
  if (query.data.customerId) {
    conditions.push(eq(invoicesTable.customerId, query.data.customerId));
  }
  if (query.data.search) {
    const term = `%${query.data.search}%`;
    conditions.push(
      ilike(invoicesTable.invoiceNumber, term)
    );
  }

  const rows = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      customerId: invoicesTable.customerId,
      customerName: customersTable.name,
      customerEmail: customersTable.email,
      status: invoicesTable.status,
      issueDate: invoicesTable.issueDate,
      dueDate: invoicesTable.dueDate,
      notes: invoicesTable.notes,
      subtotal: invoicesTable.subtotal,
      taxRate: invoicesTable.taxRate,
      taxAmount: invoicesTable.taxAmount,
      total: invoicesTable.total,
      createdAt: invoicesTable.createdAt,
      updatedAt: invoicesTable.updatedAt,
    })
    .from(invoicesTable)
    .innerJoin(customersTable, eq(invoicesTable.customerId, customersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(invoicesTable.createdAt));

  res.json(ListInvoicesResponse.parse(rows.map(formatInvoiceRow)));
});

// ── Create Invoice ────────────────────────────────────────────────────────────

router.post("/invoices", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!(await customerBelongsToCompany(parsed.data.customerId, companyId))) {
    res.status(400).json({ error: "Customer does not belong to the selected company" });
    return;
  }

  const invoiceNumber = await nextInvoiceNumber(companyId);
  const taxRate = parsed.data.taxRate ?? 0;

  const [row] = await db
    .insert(invoicesTable)
    .values({
      companyId,
      invoiceNumber,
      customerId: parsed.data.customerId,
      status: parsed.data.status ?? "draft",
      issueDate: parsed.data.issueDate,
      dueDate: parsed.data.dueDate,
      notes: parsed.data.notes ?? null,
      taxRate: String(taxRate),
      subtotal: "0",
      taxAmount: "0",
      total: "0",
    })
    .returning();

  res.status(201).json(
    CreateInvoiceResponse.parse({
      ...row,
      subtotal: Number(row.subtotal),
      taxRate: Number(row.taxRate),
      taxAmount: Number(row.taxAmount),
      total: Number(row.total),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })
  );
});

// ── Get Invoice Detail ────────────────────────────────────────────────────────

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      customerId: invoicesTable.customerId,
      customerName: customersTable.name,
      customerEmail: customersTable.email,
      status: invoicesTable.status,
      issueDate: invoicesTable.issueDate,
      dueDate: invoicesTable.dueDate,
      notes: invoicesTable.notes,
      subtotal: invoicesTable.subtotal,
      taxRate: invoicesTable.taxRate,
      taxAmount: invoicesTable.taxAmount,
      total: invoicesTable.total,
      createdAt: invoicesTable.createdAt,
      updatedAt: invoicesTable.updatedAt,
    })
    .from(invoicesTable)
    .innerJoin(customersTable, eq(invoicesTable.customerId, customersTable.id))
    .where(and(
      eq(invoicesTable.id, params.data.id),
      eq(invoicesTable.companyId, companyId),
      eq(customersTable.companyId, companyId),
    ));

  if (!row) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const lineItems = await db
    .select()
    .from(lineItemsTable)
    .where(eq(lineItemsTable.invoiceId, params.data.id));

  res.json(
    GetInvoiceResponse.parse({
      ...formatInvoiceRow(row),
      lineItems: lineItems.map((li) => ({
        ...li,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        amount: Number(li.amount),
      })),
    })
  );
});

// ── Update Invoice ────────────────────────────────────────────────────────────

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.invoicePrefix !== undefined || parsed.data.invoiceNumber !== undefined) {
    const [current] = await db
      .select({ invoiceNumber: invoicesTable.invoiceNumber })
      .from(invoicesTable)
      .where(and(
        eq(invoicesTable.id, params.data.id),
        eq(invoicesTable.companyId, companyId),
      ));

    if (!current) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    const currentParts = splitInvoiceNumber(current.invoiceNumber);
    const prefix = (parsed.data.invoicePrefix ?? currentParts.prefix).trim();
    const number = (parsed.data.invoiceNumber ?? currentParts.number).trim();

    if (!prefix || !number) {
      res.status(400).json({ error: "Invoice prefix and number are required" });
      return;
    }

    updateData.invoiceNumber = `${prefix}-${number}`;
  }
  if (parsed.data.customerId !== undefined) {
    if (!(await customerBelongsToCompany(parsed.data.customerId, companyId))) {
      res.status(400).json({ error: "Customer does not belong to the selected company" });
      return;
    }
    updateData.customerId = parsed.data.customerId;
  }
  if (parsed.data.issueDate !== undefined) updateData.issueDate = parsed.data.issueDate;
  if (parsed.data.dueDate !== undefined) updateData.dueDate = parsed.data.dueDate;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.taxRate !== undefined) {
    updateData.taxRate = String(parsed.data.taxRate);
  }

  const [updated] = await db
    .update(invoicesTable)
    .set(updateData)
    .where(and(
      eq(invoicesTable.id, params.data.id),
      eq(invoicesTable.companyId, companyId),
    ))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  if (parsed.data.taxRate !== undefined) {
    await recalcInvoiceTotals(params.data.id, companyId);
  }

  const [row] = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      customerId: invoicesTable.customerId,
      status: invoicesTable.status,
      issueDate: invoicesTable.issueDate,
      dueDate: invoicesTable.dueDate,
      notes: invoicesTable.notes,
      subtotal: invoicesTable.subtotal,
      taxRate: invoicesTable.taxRate,
      taxAmount: invoicesTable.taxAmount,
      total: invoicesTable.total,
      createdAt: invoicesTable.createdAt,
      updatedAt: invoicesTable.updatedAt,
    })
    .from(invoicesTable)
    .where(and(
      eq(invoicesTable.id, params.data.id),
      eq(invoicesTable.companyId, companyId),
    ));

  res.json(
    UpdateInvoiceResponse.parse({
      ...row,
      subtotal: Number(row!.subtotal),
      taxRate: Number(row!.taxRate),
      taxAmount: Number(row!.taxAmount),
      total: Number(row!.total),
      createdAt: row!.createdAt.toISOString(),
      updatedAt: row!.updatedAt.toISOString(),
    })
  );
});

// ── Update Invoice Status ─────────────────────────────────────────────────────

router.patch("/invoices/:id/status", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = UpdateInvoiceStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateInvoiceStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .update(invoicesTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(and(
      eq(invoicesTable.id, params.data.id),
      eq(invoicesTable.companyId, companyId),
    ))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.json(
    UpdateInvoiceStatusResponse.parse({
      ...row,
      subtotal: Number(row.subtotal),
      taxRate: Number(row.taxRate),
      taxAmount: Number(row.taxAmount),
      total: Number(row.total),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })
  );
});

// ── Delete Invoice ────────────────────────────────────────────────────────────

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(invoicesTable)
    .where(and(
      eq(invoicesTable.id, params.data.id),
      eq(invoicesTable.companyId, companyId),
    ))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.sendStatus(204);
});

// ── Line Items ────────────────────────────────────────────────────────────────

router.get("/invoices/:invoiceId/line-items", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = ListLineItemsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await invoiceBelongsToCompany(params.data.invoiceId, companyId))) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const rows = await db
    .select()
    .from(lineItemsTable)
    .where(eq(lineItemsTable.invoiceId, params.data.invoiceId));

  res.json(
    ListLineItemsResponse.parse(
      rows.map((r) => ({
        ...r,
        quantity: Number(r.quantity),
        unitPrice: Number(r.unitPrice),
        amount: Number(r.amount),
      }))
    )
  );
});

router.post("/invoices/:invoiceId/line-items", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = CreateLineItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await invoiceBelongsToCompany(params.data.invoiceId, companyId))) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const parsed = CreateLineItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!(await productBelongsToCompany(parsed.data.productId, companyId))) {
    res.status(400).json({ error: "Product does not belong to the selected company" });
    return;
  }

  const amount = parsed.data.quantity * parsed.data.unitPrice;

  const [row] = await db
    .insert(lineItemsTable)
    .values({
      invoiceId: params.data.invoiceId,
      productId: parsed.data.productId ?? null,
      description: parsed.data.description,
      quantity: String(parsed.data.quantity),
      unitPrice: String(parsed.data.unitPrice),
      amount: String(amount.toFixed(2)),
    })
    .returning();

  await recalcInvoiceTotals(params.data.invoiceId, companyId);

  res.status(201).json(
    CreateLineItemResponse.parse({
      ...row,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unitPrice),
      amount: Number(row.amount),
    })
  );
});

router.patch("/invoices/:invoiceId/line-items/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = UpdateLineItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await invoiceBelongsToCompany(params.data.invoiceId, companyId))) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const parsed = UpdateLineItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!(await productBelongsToCompany(parsed.data.productId, companyId))) {
    res.status(400).json({ error: "Product does not belong to the selected company" });
    return;
  }

  // Fetch current values to compute amount
  const [current] = await db
    .select()
    .from(lineItemsTable)
    .where(
      and(
        eq(lineItemsTable.id, params.data.id),
        eq(lineItemsTable.invoiceId, params.data.invoiceId)
      )
    );

  if (!current) {
    res.status(404).json({ error: "Line item not found" });
    return;
  }

  const newQty = parsed.data.quantity ?? Number(current.quantity);
  const newPrice = parsed.data.unitPrice ?? Number(current.unitPrice);
  const amount = newQty * newPrice;

  const updateData: Record<string, unknown> = {
    quantity: String(newQty),
    unitPrice: String(newPrice),
    amount: String(amount.toFixed(2)),
  };
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.productId !== undefined) updateData.productId = parsed.data.productId;

  const [row] = await db
    .update(lineItemsTable)
    .set(updateData)
    .where(
      and(
        eq(lineItemsTable.id, params.data.id),
        eq(lineItemsTable.invoiceId, params.data.invoiceId)
      )
    )
    .returning();

  await recalcInvoiceTotals(params.data.invoiceId, companyId);

  res.json(
    UpdateLineItemResponse.parse({
      ...row,
      quantity: Number(row!.quantity),
      unitPrice: Number(row!.unitPrice),
      amount: Number(row!.amount),
    })
  );
});

router.delete("/invoices/:invoiceId/line-items/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = DeleteLineItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!(await invoiceBelongsToCompany(params.data.invoiceId, companyId))) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const [row] = await db
    .delete(lineItemsTable)
    .where(
      and(
        eq(lineItemsTable.id, params.data.id),
        eq(lineItemsTable.invoiceId, params.data.invoiceId)
      )
    )
    .returning();

  if (!row) {
    res.status(404).json({ error: "Line item not found" });
    return;
  }

  await recalcInvoiceTotals(params.data.invoiceId, companyId);
  res.sendStatus(204);
});

export default router;
