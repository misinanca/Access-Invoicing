import { Router, type IRouter } from "express";
import { asc } from "drizzle-orm";
import { db, companiesTable } from "@workspace/db";
import { ListCompaniesResponse } from "@workspace/api-zod";
import { ensureCompanies } from "../lib/company-context";

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

export default router;