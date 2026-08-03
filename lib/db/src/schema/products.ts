import { pgTable, serial, text, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .default(1)
    .references(() => companiesTable.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  description: text("description"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  unit: text("unit").notNull().default("each"), // each, hour, day, month, flat
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
