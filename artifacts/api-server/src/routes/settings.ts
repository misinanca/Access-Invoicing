import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, invoiceSettingsTable } from "@workspace/db";
import {
  GetInvoiceSettingsResponse,
  UpdateInvoiceSettingsBody,
  UpdateInvoiceSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_SETTINGS = {
  id: 1,
  invoicePrefix: "INV",
  invoiceTitle: "FACTURĂ DE CHIRIE",
  issuerName: "Administrare imobile",
  issuerAddress: "Adresă emitent",
  footerText: "Vă mulțumim pentru plata la termen.",
  logoUrl: null,
  customFields: [] as Array<{ label: string; text: string }>,
};

async function ensureSettings() {
  await db
    .insert(invoiceSettingsTable)
    .values(DEFAULT_SETTINGS)
    .onConflictDoNothing({ target: invoiceSettingsTable.id });

  const [settings] = await db
    .select()
    .from(invoiceSettingsTable)
    .where(eq(invoiceSettingsTable.id, 1));

  if (!settings) {
    throw new Error("Invoice settings could not be initialized");
  }

  return settings;
}

function formatSettings(settings: typeof invoiceSettingsTable.$inferSelect) {
  return {
    ...settings,
    logoUrl: settings.logoUrl ?? null,
    customFields: settings.customFields ?? [],
    updatedAt: settings.updatedAt.toISOString(),
  };
}

router.get("/invoice-settings", async (_req, res): Promise<void> => {
  const settings = await ensureSettings();
  res.json(GetInvoiceSettingsResponse.parse(formatSettings(settings)));
});

router.patch("/invoice-settings", async (req, res): Promise<void> => {
  const parsed = UpdateInvoiceSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await ensureSettings();

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  for (const key of [
    "invoicePrefix",
    "invoiceTitle",
    "issuerName",
    "issuerAddress",
    "footerText",
    "logoUrl",
    "customFields",
  ] as const) {
    if (parsed.data[key] !== undefined) {
      updateData[key] = parsed.data[key];
    }
  }

  const [updated] = await db
    .update(invoiceSettingsTable)
    .set(updateData)
    .where(eq(invoiceSettingsTable.id, 1))
    .returning();

  res.json(UpdateInvoiceSettingsResponse.parse(formatSettings(updated)));
});

export { ensureSettings };
export default router;