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

export function getInvoiceEmailUrl(invoice: InvoiceDetail): string | null {
  if (!invoice.customerEmail) return null;

  const lineItemsText = invoice.lineItems
    .map(
      (item) =>
        `- ${item.description} | ${item.quantity} x ${formatInvoiceCurrency(item.unitPrice)} = ${formatInvoiceCurrency(item.amount)}`,
    )
    .join('\n');
  const subject = `Factură ${invoice.invoiceNumber}`;
  const body = [
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

  return `mailto:${encodeURIComponent(invoice.customerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}