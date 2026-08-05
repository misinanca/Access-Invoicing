import type { InvoiceLabels, InvoiceLayoutSection, InvoiceSettings } from '@workspace/api-client-react';

export const DEFAULT_INVOICE_LABELS: InvoiceLabels = {
  customer: 'Client și date',
  email: 'Email',
  issueDate: 'Data emiterii',
  dueDate: 'Data scadenței',
  status: 'Stare',
  description: 'Descriere',
  quantity: 'Cant.',
  unitPrice: 'Preț unitar',
  amount: 'Valoare',
  subtotal: 'Subtotal',
  tax: 'TVA',
  total: 'Total de plată',
};

export const DEFAULT_INVOICE_LAYOUT: InvoiceLayoutSection[] = [
  { id: 'header', type: 'header', label: 'Antet', visible: true },
  { id: 'customer', type: 'customer', label: 'Client și date', visible: true },
  { id: 'customFields', type: 'customFields', label: 'Câmpuri suplimentare', visible: true },
  { id: 'lineItems', type: 'lineItems', label: 'Poziții factură', visible: true },
  { id: 'totals', type: 'totals', label: 'Totaluri', visible: true },
  { id: 'notes', type: 'notes', label: 'Observații', visible: true },
  { id: 'footer', type: 'footer', label: 'Subsol', visible: true },
];

export function getInvoiceLayout(settings?: InvoiceSettings | null): InvoiceLayoutSection[] {
  const sections = settings?.layoutSections;
  return sections?.length ? sections : DEFAULT_INVOICE_LAYOUT;
}

export function getInvoiceLabels(settings?: InvoiceSettings | null): InvoiceLabels {
  return {
    ...DEFAULT_INVOICE_LABELS,
    ...(settings?.invoiceLabels ?? {}),
  };
}