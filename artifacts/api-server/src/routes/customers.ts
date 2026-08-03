import { Router, type IRouter } from "express";
import { eq, ilike, or, desc, and } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import {
  ListCustomersQueryParams,
  ListCustomersResponse,
  CreateCustomerBody,
  CreateCustomerResponse,
  GetCustomerParams,
  GetCustomerResponse,
  UpdateCustomerParams,
  UpdateCustomerBody,
  UpdateCustomerResponse,
  DeleteCustomerParams,
  GetCustomerInvoicesParams,
  GetCustomerInvoicesResponse,
} from "@workspace/api-zod";
import { invoicesTable } from "@workspace/db";
import { getCompanyId } from "../lib/company-context";

const router: IRouter = Router();

router.get("/customers", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const query = ListCustomersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(customersTable.companyId, companyId)];
  if (query.data.search) {
    const term = `%${query.data.search}%`;
    conditions.push(or(
      ilike(customersTable.name, term),
      ilike(customersTable.email, term),
    )!);
  }
  const rows = await db
    .select()
    .from(customersTable)
    .where(and(...conditions))
    .orderBy(customersTable.name);

  res.json(
    ListCustomersResponse.parse(
      rows.map((r) => ({
        ...r,
        defaultRent: r.defaultRent == null ? null : Number(r.defaultRent),
        createdAt: r.createdAt.toISOString(),
      }))
    )
  );
});

router.post("/customers", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(customersTable)
    .values({
      ...parsed.data,
      companyId,
      defaultRent:
        parsed.data.defaultRent === undefined
          ? undefined
          : String(parsed.data.defaultRent),
    })
    .returning();

  res.status(201).json(
    CreateCustomerResponse.parse({
      ...row,
      defaultRent: row.defaultRent == null ? null : Number(row.defaultRent),
      createdAt: row.createdAt.toISOString(),
    })
  );
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(customersTable)
    .where(and(
      eq(customersTable.id, params.data.id),
      eq(customersTable.companyId, companyId),
    ));

  if (!row) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(
    GetCustomerResponse.parse({
      ...row,
      defaultRent: row.defaultRent == null ? null : Number(row.defaultRent),
      createdAt: row.createdAt.toISOString(),
    })
  );
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { defaultRent, ...customerFields } = parsed.data;
  const updateData = {
    ...customerFields,
    ...(defaultRent !== undefined
      ? {
          defaultRent:
            defaultRent == null
              ? null
              : String(defaultRent),
        }
      : {}),
  };

  const [row] = await db
    .update(customersTable)
    .set(updateData)
    .where(and(
      eq(customersTable.id, params.data.id),
      eq(customersTable.companyId, companyId),
    ))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(
    UpdateCustomerResponse.parse({
      ...row,
      defaultRent: row.defaultRent == null ? null : Number(row.defaultRent),
      createdAt: row.createdAt.toISOString(),
    })
  );
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = DeleteCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(customersTable)
    .where(and(
      eq(customersTable.id, params.data.id),
      eq(customersTable.companyId, companyId),
    ))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/customers/:id/invoices", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = GetCustomerInvoicesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      customerId: invoicesTable.customerId,
      customerName: customersTable.name,
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
      eq(invoicesTable.customerId, params.data.id),
      eq(invoicesTable.companyId, companyId),
      eq(customersTable.companyId, companyId),
    ))
    .orderBy(desc(invoicesTable.createdAt));

  res.json(
    GetCustomerInvoicesResponse.parse(
      rows.map((r) => ({
        ...r,
        subtotal: Number(r.subtotal),
        taxRate: Number(r.taxRate),
        taxAmount: Number(r.taxAmount),
        total: Number(r.total),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))
    )
  );
});

export default router;
