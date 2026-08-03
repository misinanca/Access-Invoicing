import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  ListProductsResponse,
  CreateProductBody,
  CreateProductResponse,
  GetProductParams,
  GetProductResponse,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
} from "@workspace/api-zod";
import { getCompanyId } from "../lib/company-context";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(productsTable.companyId, companyId)];
  if (query.data.search) {
    const term = `%${query.data.search}%`;
    conditions.push(ilike(productsTable.name, term));
  }
  const rows = await db
    .select()
    .from(productsTable)
    .where(and(...conditions))
    .orderBy(productsTable.name);

  res.json(
    ListProductsResponse.parse(
      rows.map((r) => ({
        ...r,
        unitPrice: Number(r.unitPrice),
        createdAt: r.createdAt.toISOString(),
      }))
    )
  );
});

router.post("/products", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(productsTable)
    .values({ ...parsed.data, companyId, unitPrice: String(parsed.data.unitPrice) })
    .returning();

  res.status(201).json(
    CreateProductResponse.parse({
      ...row,
      unitPrice: Number(row.unitPrice),
      createdAt: row.createdAt.toISOString(),
    })
  );
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(productsTable)
    .where(and(
      eq(productsTable.id, params.data.id),
      eq(productsTable.companyId, companyId),
    ));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(
    GetProductResponse.parse({
      ...row,
      unitPrice: Number(row.unitPrice),
      createdAt: row.createdAt.toISOString(),
    })
  );
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.unitPrice !== undefined) {
    updateData.unitPrice = String(parsed.data.unitPrice);
  }

  const [row] = await db
    .update(productsTable)
    .set(updateData)
    .where(and(
      eq(productsTable.id, params.data.id),
      eq(productsTable.companyId, companyId),
    ))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(
    UpdateProductResponse.parse({
      ...row,
      unitPrice: Number(row.unitPrice),
      createdAt: row.createdAt.toISOString(),
    })
  );
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(productsTable)
    .where(and(
      eq(productsTable.id, params.data.id),
      eq(productsTable.companyId, companyId),
    ))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
