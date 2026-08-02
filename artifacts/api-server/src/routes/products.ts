import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
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

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let rows;
  if (query.data.search) {
    const term = `%${query.data.search}%`;
    rows = await db
      .select()
      .from(productsTable)
      .where(ilike(productsTable.name, term))
      .orderBy(productsTable.name);
  } else {
    rows = await db
      .select()
      .from(productsTable)
      .orderBy(productsTable.name);
  }

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
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(productsTable)
    .values({ ...parsed.data, unitPrice: String(parsed.data.unitPrice) })
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
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

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
    .where(eq(productsTable.id, params.data.id))
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
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
