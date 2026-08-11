import type { InvoiceDetail } from '@workspace/api-client-react';

export function formatInvoiceCurrency(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatInvoiceDate(date: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function getInvoiceEmailSubject(invoice: Pick<InvoiceDetail, 'invoiceNumber'>): string {
  return `Factură ${invoice.invoiceNumber}`;
}

export function getInvoiceEmailBody(invoice: InvoiceDetail): string {
  const lineItemsText = invoice.lineItems
    .map(
      (item) =>
        `- ${item.description} | ${item.quantity} x ${formatInvoiceCurrency(item.unitPrice)} = ${formatInvoiceCurrency(item.amount)}`,
    )
    .join('\n');

  return [
    `Bună ziua, ${invoice.customerName},`,
    '',
    `Vă transmitem factura ${invoice.invoiceNumber}.`,
    `Data emiterii: ${formatInvoiceDate(invoice.issueDate)}`,
    `Data scadenței: ${formatInvoiceDate(invoice.dueDate)}`,
    '',
    'Detalii:',
    lineItemsText || '- Fără articole',
    '',
    `Total de plată: ${formatInvoiceCurrency(invoice.total)}`,
    '',
    invoice.notes || '',
    '',
    'Vă mulțumim.',
  ]
    .filter((line, index, lines) => !(line === '' && lines[index - 1] === ''))
    .join('\n');
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
