import type { InvoiceLayoutSection, InvoiceSettings } from '@workspace/api-client-react';

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