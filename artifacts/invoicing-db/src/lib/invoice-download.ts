import type { InvoiceDetail, InvoiceSettings } from '@workspace/api-client-react';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeDownloadPart(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'factura'
  );
}

function formatInvoiceCurrency(amount: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatInvoiceDate(date: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

function translateInvoiceStatus(status: InvoiceDetail['status']): string {
  return {
    draft: 'Schiță',
    sent: 'Trimisă',
    paid: 'Plătită',
    overdue: 'Restantă',
  }[status];
}

export function downloadInvoiceFile(
  invoice: InvoiceDetail,
  invoiceSettings?: InvoiceSettings | null,
): string {
  const description =
    invoice.lineItems
      .map((item) => item.description.trim())
      .filter(Boolean)
      .join(' - ') || 'factura';
  const filename = `${safeDownloadPart(invoice.invoiceNumber)} - ${safeDownloadPart(description)}.html`;
  const customFields = invoiceSettings?.customFields ?? [];
  const customFieldsHtml = customFields.length
    ? `
        <section class="custom-fields">
          ${customFields
            .map(
              (field) => `
                <div>
                  <div class="label">${escapeHtml(field.label)}</div>
                  <div>${escapeHtml(field.text).replace(/\n/g, '<br>')}</div>
                </div>`,
            )
            .join('')}
        </section>`
    : '';
  const lineItemsHtml = invoice.lineItems.length
    ? invoice.lineItems
        .map(
          (item) => `
              <tr>
                <td>${escapeHtml(item.description)}</td>
                <td class="number">${item.quantity}</td>
                <td class="number">${escapeHtml(formatInvoiceCurrency(item.unitPrice))}</td>
                <td class="number strong">${escapeHtml(formatInvoiceCurrency(item.amount))}</td>
              </tr>`,
        )
        .join('')
    : '<tr><td colspan="4" class="empty">Nu există poziții</td></tr>';
  const logoHtml = invoiceSettings?.logoUrl
    ? `<img class="logo" src="${escapeHtml(invoiceSettings.logoUrl)}" alt="Logo companie">`
    : '';
  const notesHtml = invoice.notes
    ? `<div class="notes">${escapeHtml(invoice.notes).replace(/\n/g, '<br>')}</div>`
    : '';
  const footerHtml = invoiceSettings?.footerText
    ? `<div class="footer">${escapeHtml(invoiceSettings.footerText).replace(/\n/g, '<br>')}</div>`
    : '';
  const documentHtml = `<!doctype html>
<html lang="ro">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(invoice.invoiceNumber)} - ${escapeHtml(description)}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 40px; background: #f4f5f7; color: #0f172a; font-family: Arial, sans-serif; }
      .document { max-width: 820px; margin: 0 auto; padding: 42px; background: white; }
      .header { display: flex; justify-content: space-between; gap: 32px; border-bottom: 2px solid #0f172a; padding-bottom: 24px; }
      .logo { display: block; max-width: 190px; max-height: 56px; object-fit: contain; object-position: left; margin-bottom: 16px; }
      .eyebrow, .label { color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
      h1 { margin: 8px 0 0; font-size: 30px; letter-spacing: -.03em; }
      .issuer { max-width: 250px; color: #64748b; font-size: 14px; text-align: right; white-space: pre-line; }
      .issuer strong { display: block; margin-bottom: 4px; color: #0f172a; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; border-bottom: 1px solid #e2e8f0; padding: 24px 0; font-size: 14px; }
      .customer { margin-top: 12px; font-size: 16px; font-weight: 700; }
      .muted { color: #475569; margin-top: 4px; }
      .dates { display: grid; gap: 8px; text-align: right; }
      .dates div { display: flex; justify-content: flex-end; gap: 20px; }
      .dates span:first-child { color: #64748b; }
      .custom-fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; border-bottom: 1px solid #e2e8f0; padding: 20px 0; font-size: 14px; }
      .custom-fields .label { margin-bottom: 5px; }
      table { width: 100%; border-collapse: collapse; margin-top: 28px; font-size: 14px; }
      th { border-bottom: 2px solid #0f172a; padding: 0 0 12px; color: #64748b; font-size: 11px; letter-spacing: .1em; text-align: left; text-transform: uppercase; }
      th:nth-child(n+2), td.number { text-align: right; }
      td { border-bottom: 1px solid #e2e8f0; padding: 16px 0; }
      td:first-child { padding-right: 16px; font-weight: 700; }
      .strong { color: #0f172a; font-weight: 700; }
      .empty { color: #64748b; padding: 24px 0; text-align: center; }
      .totals { width: 280px; margin: 24px 0 0 auto; font-size: 14px; }
      .totals div { display: flex; justify-content: space-between; gap: 20px; padding: 5px 0; }
      .total { border-top: 2px solid #0f172a; margin-top: 6px; padding-top: 12px !important; font-size: 16px; font-weight: 700; }
      .notes, .footer { border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 20px; color: #475569; font-size: 13px; white-space: pre-line; }
      .footer { color: #64748b; font-size: 12px; }
      @media print { body { padding: 0; background: white; } .document { max-width: none; padding: 0; } }
      @media (max-width: 640px) { body { padding: 16px; } .document { padding: 24px; } .header, .meta { grid-template-columns: 1fr; display: grid; } .issuer, .dates { text-align: left; } .dates div { justify-content: space-between; } .custom-fields { grid-template-columns: 1fr 1fr; } }
    </style>
  </head>
  <body>
    <main class="document">
      <header class="header">
        <div>
          ${logoHtml}
          <div class="eyebrow">${escapeHtml(invoiceSettings?.invoiceTitle || 'Document factură')}</div>
          <h1>${escapeHtml(invoice.invoiceNumber)}</h1>
        </div>
        <div class="issuer">
          <strong>${escapeHtml(invoiceSettings?.issuerName || 'InvoiceDB')}</strong>
          ${escapeHtml(invoiceSettings?.issuerAddress || 'Administrare facturi').replace(/\n/g, '<br>')}
        </div>
      </header>
      <section class="meta">
        <div>
          <div class="label">Client</div>
          <div class="customer">${escapeHtml(invoice.customerName)}</div>
          <div class="muted">${escapeHtml(invoice.customerEmail || 'Email necompletat')}</div>
        </div>
        <div class="dates">
          <div><span>Data emiterii</span><strong>${escapeHtml(formatInvoiceDate(invoice.issueDate))}</strong></div>
          <div><span>Data scadenței</span><strong>${escapeHtml(formatInvoiceDate(invoice.dueDate))}</strong></div>
          <div><span>Stare</span><strong>${escapeHtml(translateInvoiceStatus(invoice.status))}</strong></div>
        </div>
      </section>
      ${customFieldsHtml}
      <table>
        <thead><tr><th>Descriere</th><th>Cant.</th><th>Preț unitar</th><th>Valoare</th></tr></thead>
        <tbody>${lineItemsHtml}</tbody>
      </table>
      <section class="totals">
        <div><span>Subtotal</span><span>${escapeHtml(formatInvoiceCurrency(invoice.subtotal))}</span></div>
        <div><span>TVA (${escapeHtml(String(invoice.taxRate))}%)</span><span>${escapeHtml(formatInvoiceCurrency(invoice.taxAmount))}</span></div>
        <div class="total"><span>Total de plată</span><span>${escapeHtml(formatInvoiceCurrency(invoice.total))}</span></div>
      </section>
      ${notesHtml}
      ${footerHtml}
    </main>
  </body>
</html>`;
  const blob = new Blob([documentHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return filename;
}