import {
  pgTable,
  serial,
  text,
  numeric,
  timestamp,
  integer,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { companiesTable } from "./companies";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .default(1)
    .references(() => companiesTable.id, { onDelete: "restrict" }),
  invoiceNumber: text("invoice_number").notNull(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("draft"), // draft, sent, paid, overdue
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  notes: text("notes"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  companyInvoiceNumberUnique: uniqueIndex("invoices_company_invoice_number_unique").on(
    table.companyId,
    table.invoiceNumber,
  ),
}));

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
