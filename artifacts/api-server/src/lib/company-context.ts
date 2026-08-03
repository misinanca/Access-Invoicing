import type { Request } from "express";
import { db, companiesTable } from "@workspace/db";

export const DEFAULT_COMPANY_ID = 1;

export const DEFAULT_COMPANIES = [
  { id: 1, name: "Compania 1" },
  { id: 2, name: "Compania 2" },
  { id: 3, name: "Compania 3" },
  { id: 4, name: "Compania 4" },
] as const;

export async function ensureCompanies(): Promise<void> {
  await db
    .insert(companiesTable)
    .values([...DEFAULT_COMPANIES])
    .onConflictDoNothing({ target: companiesTable.id });
}

export function getCompanyId(req: Request): number {
  const value = Number(req.header("x-company-id"));
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_COMPANY_ID;
}