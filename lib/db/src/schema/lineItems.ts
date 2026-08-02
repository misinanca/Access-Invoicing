import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { invoicesTable } from "./invoices";
import { productsTable } from "./products";

export const lineItemsTable = pgTable("line_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoicesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => productsTable.id, {
    onDelete: "set null",
  }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
});

export const insertLineItemSchema = createInsertSchema(lineItemsTable).omit({
  id: true,
});

export type InsertLineItem = z.infer<typeof insertLineItemSchema>;
export type LineItem = typeof lineItemsTable.$inferSelect;
