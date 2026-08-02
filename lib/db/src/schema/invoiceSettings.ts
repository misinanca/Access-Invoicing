import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoiceSettingsTable = pgTable("invoice_settings", {
  id: integer("id").primaryKey().default(1),
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
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInvoiceSettingsSchema = createInsertSchema(invoiceSettingsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertInvoiceSettings = z.infer<typeof insertInvoiceSettingsSchema>;
export type InvoiceSettings = typeof invoiceSettingsTable.$inferSelect;