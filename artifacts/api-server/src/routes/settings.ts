import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, invoiceSettingsTable } from "@workspace/db";
import {
  GetInvoiceSettingsResponse,
  UpdateInvoiceSettingsBody,
  UpdateInvoiceSettingsResponse,
} from "@workspace/api-zod";
import { getCompanyId } from "../lib/company-context";
import type { InvoiceLayoutSection } from "@workspace/db";

const router: IRouter = Router();

const DEFAULT_SETTINGS = {
  invoicePrefix: "INV",
  invoiceTitle: "FACTURĂ DE CHIRIE",
  issuerName: "Administrare imobile",
  issuerAddress: "Adresă emitent",
  footerText: "Vă mulțumim pentru plata la termen.",
  logoUrl: null,
  customFields: [] as Array<{ label: string; text: string }>,
  layoutSections: [
    { id: "header", type: "header", label: "Antet", visible: true },
    { id: "customer", type: "customer", label: "Client și date", visible: true },
    { id: "customFields", type: "customFields", label: "Câmpuri suplimentare", visible: true },
    { id: "lineItems", type: "lineItems", label: "Poziții factură", visible: true },
    { id: "totals", type: "totals", label: "Totaluri", visible: true },
    { id: "notes", type: "notes", label: "Observații", visible: true },
    { id: "footer", type: "footer", label: "Subsol", visible: true },
  ] as InvoiceLayoutSection[],
};

const MAX_LOGO_DATA_URL_LENGTH = 3_000_000;
const LOGO_DATA_URL_PATTERN =
  /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i;

function validateLogoUrl(logoUrl: string | null | undefined): string | null {
  if (logoUrl == null || logoUrl === "") {
    return null;
  }

  if (logoUrl.startsWith("data:")) {
    if (
      logoUrl.length > MAX_LOGO_DATA_URL_LENGTH ||
      !LOGO_DATA_URL_PATTERN.test(logoUrl)
    ) {
      throw new Error("Logo-ul trebuie să fie PNG, JPG, WEBP sau SVG și să aibă maximum 2 MB");
    }
  }

  return logoUrl;
}

async function ensureSettings(companyId: number) {
  await db
    .insert(invoiceSettingsTable)
    .values({ ...DEFAULT_SETTINGS, id: companyId, companyId })
    .onConflictDoNothing({ target: invoiceSettingsTable.companyId });

  const [settings] = await db
    .select()
    .from(invoiceSettingsTable)
    .where(eq(invoiceSettingsTable.companyId, companyId));

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
    layoutSections: settings.layoutSections ?? DEFAULT_SETTINGS.layoutSections,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

router.get("/invoice-settings", async (req, res): Promise<void> => {
  const settings = await ensureSettings(getCompanyId(req));
  res.json(GetInvoiceSettingsResponse.parse(formatSettings(settings)));
});

router.patch("/invoice-settings", async (req, res): Promise<void> => {
  const companyId = getCompanyId(req);
  const parsed = UpdateInvoiceSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await ensureSettings(companyId);

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  try {
    for (const key of [
      "invoicePrefix",
      "invoiceTitle",
      "issuerName",
      "issuerAddress",
      "footerText",
      "logoUrl",
      "customFields",
      "layoutSections",
    ] as const) {
      if (parsed.data[key] !== undefined) {
        updateData[key] =
          key === "logoUrl"
            ? validateLogoUrl(parsed.data[key])
            : parsed.data[key];
      }
    }
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Logo invalid" });
    return;
  }

  const [updated] = await db
    .update(invoiceSettingsTable)
    .set(updateData)
    .where(eq(invoiceSettingsTable.companyId, companyId))
    .returning();

  res.json(UpdateInvoiceSettingsResponse.parse(formatSettings(updated)));
});

export { ensureSettings };
export default router;