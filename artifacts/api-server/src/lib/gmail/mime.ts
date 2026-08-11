type InvoiceEmailContentInput = {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
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
};

function formatInvoiceCurrency(amount: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatInvoiceDate(date: string): string {
  return new Intl.DateTimeFormat("ro-RO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function getInvoiceEmailSubject(invoiceNumber: string): string {
  return `Factură ${invoiceNumber}`;
}

export function getInvoiceEmailBody(invoice: InvoiceEmailContentInput): string {
  const lineItemsText = invoice.lineItems
    .map(
      (item) =>
        `- ${item.description} | ${item.quantity} x ${formatInvoiceCurrency(item.unitPrice)} = ${formatInvoiceCurrency(item.amount)}`,
    )
    .join("\n");

  return [
    `Bună ziua, ${invoice.customerName},`,
    "",
    `Vă transmitem factura ${invoice.invoiceNumber}.`,
    `Data emiterii: ${formatInvoiceDate(invoice.issueDate)}`,
    `Data scadenței: ${formatInvoiceDate(invoice.dueDate)}`,
    "",
    "Detalii:",
    lineItemsText || "- Fără articole",
    "",
    `Total de plată: ${formatInvoiceCurrency(invoice.total)}`,
    "",
    invoice.notes || "",
    "",
    "Vă mulțumim.",
  ]
    .filter((line, index, lines) => !(line === "" && lines[index - 1] === ""))
    .join("\n");
}

function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

function toBase64Url(value: Buffer | string): string {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function buildInvoiceMimeMessage(input: {
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  pdfBuffer: Buffer;
  filename: string;
}): string {
  const boundary = `invoice_boundary_${Date.now()}`;
  const pdfBase64 = input.pdfBuffer.toString("base64");

  const mime = [
    `From: ${input.fromEmail}`,
    `To: ${input.toEmail}`,
    `Subject: ${encodeSubject(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    input.bodyText,
    "",
    `--${boundary}`,
    `Content-Type: application/pdf; name="${input.filename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${input.filename}"`,
    "",
    pdfBase64,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return toBase64Url(mime);
}

export function decodePdfBase64(pdfBase64: string): Buffer {
  const cleaned = pdfBase64.includes(",")
    ? pdfBase64.slice(pdfBase64.indexOf(",") + 1)
    : pdfBase64;
  const buffer = Buffer.from(cleaned.replace(/\s/g, ""), "base64");
  if (buffer.length === 0) {
    throw new Error("PDF attachment is empty");
  }
  return buffer;
}
