import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, companiesTable } from "@workspace/db";
import {
  ListCompaniesResponse,
  UpdateCompanyBody,
  UpdateCompanyParams,
  UpdateCompanyResponse,
} from "@workspace/api-zod";
import { ensureCompanies, getCompanyId } from "../lib/company-context";

const router: IRouter = Router();

router.get("/companies", async (_req, res): Promise<void> => {
  await ensureCompanies();
  const companies = await db.select().from(companiesTable).orderBy(asc(companiesTable.id));
  res.json(
    ListCompaniesResponse.parse(
      companies.map((company) => ({
        ...company,
        createdAt: company.createdAt.toISOString(),
      })),
    ),
  );
});

router.patch("/companies/:id", async (req, res): Promise<void> => {
  const params = UpdateCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const selectedCompanyId = getCompanyId(req);
  if (params.data.id !== selectedCompanyId) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const name = parsed.data.name.trim();
  if (!name) {
    res.status(400).json({ error: "Company name is required" });
    return;
  }

  const [company] = await db
    .update(companiesTable)
    .set({ name })
    .where(and(
      eq(companiesTable.id, params.data.id),
      eq(companiesTable.id, selectedCompanyId),
    ))
    .returning();

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  res.json(
    UpdateCompanyResponse.parse({
      ...company,
      createdAt: company.createdAt.toISOString(),
    }),
  );
});

export default router;