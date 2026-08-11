import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { invoicesTable } from "./invoices";

export const invoiceEmailLogTable = pgTable("invoice_email_log", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoicesTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "restrict" }),
  toEmail: text("to_email").notNull(),
  gmailMessageId: text("gmail_message_id"),
  status: text("status").notNull(), // sent | failed
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvoiceEmailLogSchema = createInsertSchema(invoiceEmailLogTable).omit({
  id: true,
  createdAt: true,
});

export type InsertInvoiceEmailLog = z.infer<typeof insertInvoiceEmailLogSchema>;
export type InvoiceEmailLog = typeof invoiceEmailLogTable.$inferSelect;
