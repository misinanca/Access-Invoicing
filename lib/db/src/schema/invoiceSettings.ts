import { integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type InvoiceLayoutSection = {
  id: string;
  type:
    | "header"
    | "customer"
    | "customFields"
    | "lineItems"
    | "totals"
    | "notes"
    | "footer"
    | "custom";
  label: string;
  visible: boolean;
  content?: string;
};

export type InvoiceLabels = {
  customer: string;
  email: string;
  issueDate: string;
  dueDate: string;
  status: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  subtotal: string;
  tax: string;
  total: string;
};

export const invoiceSettingsTable = pgTable("invoice_settings", {
  id: integer("id").primaryKey().default(1),
  companyId: integer("company_id")
    .notNull()
    .default(1)
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  invoiceTitle: text("invoice_title").notNull().default("FACTURĂ DE CHIRIE"),
  issuerName: text("issuer_name").notNull().default("Administrare imobile"),
  issuerAddress: text("issuer_address").notNull().default("Adresă emitent"),
  footerText: text("footer_text").notNull().default("Vă mulțumim pentru plata la termen."),
  logoUrl: text("logo_url"),
  customFields: jsonb("custom_fields")
    .$type<Array<{ label: string; text: string }>>()
    .notNull()
    .default([]),
  layoutSections: jsonb("layout_sections")
    .$type<InvoiceLayoutSection[]>()
    .notNull()
    .default([]),
  invoiceLabels: jsonb("invoice_labels")
    .$type<InvoiceLabels>()
    .notNull()
    .default({
      customer: "Client și date",
      email: "Email",
      issueDate: "Data emiterii",
      dueDate: "Data scadenței",
      status: "Stare",
      description: "Descriere",
      quantity: "Cant.",
      unitPrice: "Preț unitar",
      amount: "Valoare",
      subtotal: "Subtotal",
      tax: "TVA",
      total: "Total de plată",
    }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  companyIdUnique: uniqueIndex("invoice_settings_company_id_unique").on(table.companyId),
}));

export const insertInvoiceSettingsSchema = createInsertSchema(invoiceSettingsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertInvoiceSettings = z.infer<typeof insertInvoiceSettingsSchema>;
export type InvoiceSettings = typeof invoiceSettingsTable.$inferSelect;