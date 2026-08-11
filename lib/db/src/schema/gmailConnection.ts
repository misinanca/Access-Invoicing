import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Singleton app-wide Gmail OAuth connection (one personal mailbox). */
export const gmailConnectionTable = pgTable("gmail_connection", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGmailConnectionSchema = createInsertSchema(gmailConnectionTable).omit({
  id: true,
  connectedAt: true,
  updatedAt: true,
});

export type InsertGmailConnection = z.infer<typeof insertGmailConnectionSchema>;
export type GmailConnection = typeof gmailConnectionTable.$inferSelect;
