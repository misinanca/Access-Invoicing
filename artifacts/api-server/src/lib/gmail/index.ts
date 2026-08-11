import { eq } from "drizzle-orm";
import { db, gmailConnectionTable } from "@workspace/db";
import { decryptSecret, encryptSecret } from "./crypto";
import {
  exchangeCodeForTokens,
  getAuthorizedGmailClient,
  getGmailAuthUrl,
  getGmailOAuthConfig,
} from "./oauth";
import {
  buildInvoiceMimeMessage,
  decodePdfBase64,
  getInvoiceEmailBody,
  getInvoiceEmailSubject,
} from "./mime";

export async function getGmailConnectionStatus(): Promise<{
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
}> {
  const [row] = await db.select().from(gmailConnectionTable).limit(1);
  if (!row) {
    return { connected: false, email: null, connectedAt: null };
  }
  return {
    connected: true,
    email: row.email,
    connectedAt: row.connectedAt.toISOString(),
  };
}

export function buildGmailConnectUrl(): string {
  getGmailOAuthConfig();
  return getGmailAuthUrl();
}

export async function completeGmailOAuth(code: string): Promise<string> {
  const { frontendUrl } = getGmailOAuthConfig();
  const { refreshToken, email } = await exchangeCodeForTokens(code);
  const encryptedRefreshToken = encryptSecret(refreshToken);
  const now = new Date();

  const existing = await db.select({ id: gmailConnectionTable.id }).from(gmailConnectionTable).limit(1);
  if (existing[0]) {
    await db
      .update(gmailConnectionTable)
      .set({
        email,
        encryptedRefreshToken,
        connectedAt: now,
        updatedAt: now,
      })
      .where(eq(gmailConnectionTable.id, existing[0].id));
  } else {
    await db.insert(gmailConnectionTable).values({
      email,
      encryptedRefreshToken,
      connectedAt: now,
      updatedAt: now,
    });
  }

  return `${frontendUrl.replace(/\/+$/, "")}/settings?gmail=connected`;
}

export async function disconnectGmailConnection(): Promise<void> {
  await db.delete(gmailConnectionTable);
}

async function loadConnectionOrThrow(): Promise<{
  email: string;
  refreshToken: string;
}> {
  const [row] = await db.select().from(gmailConnectionTable).limit(1);
  if (!row) {
    throw new Error("Gmail is not connected");
  }
  return {
    email: row.email,
    refreshToken: decryptSecret(row.encryptedRefreshToken),
  };
}

export async function sendInvoicePdfViaGmail(input: {
  toEmail: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  notes: string | null;
  total: number;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  pdfBase64: string;
  filename?: string;
}): Promise<{ gmailMessageId: string; fromEmail: string }> {
  const connection = await loadConnectionOrThrow();
  const pdfBuffer = decodePdfBase64(input.pdfBase64);
  const filename = (input.filename?.trim() || `${input.invoiceNumber}.pdf`).replace(
    /[^\w.\-() ]+/g,
    "_",
  );
  const subject = getInvoiceEmailSubject(input.invoiceNumber);
  const bodyText = getInvoiceEmailBody({
    invoiceNumber: input.invoiceNumber,
    customerName: input.customerName,
    customerEmail: input.toEmail,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    notes: input.notes,
    total: input.total,
    lineItems: input.lineItems,
  });

  const raw = buildInvoiceMimeMessage({
    fromEmail: connection.email,
    toEmail: input.toEmail,
    subject,
    bodyText,
    pdfBuffer,
    filename,
  });

  const gmail = await getAuthorizedGmailClient(connection.refreshToken);
  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  if (!result.data.id) {
    throw new Error("Gmail did not return a message id");
  }

  return {
    gmailMessageId: result.data.id,
    fromEmail: connection.email,
  };
}
