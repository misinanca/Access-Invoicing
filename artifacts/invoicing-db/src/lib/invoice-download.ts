import type { InvoiceDetail, InvoiceSettings } from '@workspace/api-client-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getInvoiceLayout } from '@/lib/invoice-layout';

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

type GeneratedInvoicePdf = {
  filename: string;
  blob: Blob;
};

export async function generateInvoicePdf(
  invoice: InvoiceDetail,
  invoiceSettings?: InvoiceSettings | null,
): Promise<GeneratedInvoicePdf> {
  const description =
    invoice.lineItems
      .map((item) => item.description.trim())
      .filter(Boolean)
      .join(' - ') || 'factura';
  const filename = `${safeDownloadPart(invoice.invoiceNumber)} - ${safeDownloadPart(description)}.pdf`;
  const customFields = invoiceSettings?.customFields ?? [];
  const customFieldsContentHtml = customFields.length
    ? customFields
        .map(
          (field) => `
            <div>
              <div class="label">${escapeHtml(field.label)}</div>
              <div>${escapeHtml(field.text).replace(/\n/g, '<br>')}</div>
            </div>`,
        )
        .join('')
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
  const headerHtml = (section: { label: string }) => `
    <header class="header">
      <div>
        ${logoHtml}
        <div class="eyebrow">${escapeHtml(invoiceSettings?.invoiceTitle || section.label)}</div>
        <h1>${escapeHtml(invoice.invoiceNumber)}</h1>
      </div>
      <div class="issuer">
        <strong>${escapeHtml(invoiceSettings?.issuerName || 'InvoiceDB')}</strong>
        ${escapeHtml(invoiceSettings?.issuerAddress || 'Administrare facturi').replace(/\n/g, '<br>')}
      </div>
    </header>`;
  const customerHtml = (section: { label: string }) => `
    <section class="meta">
      <div>
        <div class="label">${escapeHtml(section.label)}</div>
        <div class="customer">${escapeHtml(invoice.customerName)}</div>
        <div class="muted">${escapeHtml(invoice.customerEmail || 'Email necompletat')}</div>
      </div>
      <div class="dates">
        <div><span>Data emiterii</span><strong>${escapeHtml(formatInvoiceDate(invoice.issueDate))}</strong></div>
        <div><span>Data scadenței</span><strong>${escapeHtml(formatInvoiceDate(invoice.dueDate))}</strong></div>
        <div><span>Stare</span><strong>${escapeHtml(translateInvoiceStatus(invoice.status))}</strong></div>
      </div>
    </section>`;
  const customFieldsHtml = (section: { label: string }) =>
    customFieldsContentHtml
      ? `<section class="custom-fields"><div class="section-label">${escapeHtml(section.label)}</div>${customFieldsContentHtml}</section>`
      : '';
  const lineItemsSectionHtml = (section: { label: string }) => `
    <section class="line-items">
      <div class="section-label">${escapeHtml(section.label)}</div>
      <table>
        <thead><tr><th>Descriere</th><th>Cant.</th><th>Preț unitar</th><th>Valoare</th></tr></thead>
        <tbody>${lineItemsHtml}</tbody>
      </table>
    </section>`;
  const totalsSectionHtml = (section: { label: string }) => `
    <section class="totals-section">
      <div class="section-label">${escapeHtml(section.label)}</div>
      <div class="totals">
        <div><span>Subtotal</span><span>${escapeHtml(formatInvoiceCurrency(invoice.subtotal))}</span></div>
        <div><span>TVA (${escapeHtml(String(invoice.taxRate))}%)</span><span>${escapeHtml(formatInvoiceCurrency(invoice.taxAmount))}</span></div>
        <div class="total"><span>Total de plată</span><span>${escapeHtml(formatInvoiceCurrency(invoice.total))}</span></div>
      </div>
    </section>`;
  const notesSectionHtml = (section: { label: string }) =>
    notesHtml
      ? `<section class="notes"><div class="section-label">${escapeHtml(section.label)}</div>${escapeHtml(invoice.notes || '').replace(/\n/g, '<br>')}</section>`
      : '';
  const footerSectionHtml = (section: { label: string }) =>
    invoiceSettings?.footerText
      ? `<footer class="footer"><div class="section-label">${escapeHtml(section.label)}</div>${escapeHtml(invoiceSettings.footerText).replace(/\n/g, '<br>')}</footer>`
      : '';
  const layoutHtml = getInvoiceLayout(invoiceSettings)
    .filter((section) => section.visible)
    .map((section) => {
      switch (section.type) {
        case 'header':
          return headerHtml(section);
        case 'customer':
          return customerHtml(section);
        case 'customFields':
          return customFieldsHtml(section);
        case 'lineItems':
          return lineItemsSectionHtml(section);
        case 'totals':
          return totalsSectionHtml(section);
        case 'notes':
          return notesSectionHtml(section);
        case 'footer':
          return footerSectionHtml(section);
        case 'custom':
          return section.content
            ? `<section class="custom-section"><div class="section-label">${escapeHtml(section.label)}</div>${escapeHtml(section.content).replace(/\n/g, '<br>')}</section>`
            : '';
      }
    })
    .join('');
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
      .logo { display: block; max-width: 950px; max-height: 280px; object-fit: contain; object-position: left; margin-bottom: 16px; }
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
       .section-label { margin-bottom: 12px; color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
       .custom-fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; border-bottom: 1px solid #e2e8f0; padding: 20px 0; font-size: 14px; }
      .custom-fields .label { margin-bottom: 5px; }
       .line-items { padding: 28px 0 0; }
       table { width: 100%; border-collapse: collapse; font-size: 14px; }
      th { border-bottom: 2px solid #0f172a; padding: 0 0 12px; color: #64748b; font-size: 11px; letter-spacing: .1em; text-align: left; text-transform: uppercase; }
      th:nth-child(n+2), td.number { text-align: right; }
      td { border-bottom: 1px solid #e2e8f0; padding: 16px 0; }
      td:first-child { padding-right: 16px; font-weight: 700; }
      .strong { color: #0f172a; font-weight: 700; }
      .empty { color: #64748b; padding: 24px 0; text-align: center; }
       .totals-section { border-top: 1px solid #e2e8f0; padding: 20px 0 0; }
       .totals { width: 280px; margin: 0 0 0 auto; font-size: 14px; }
      .totals div { display: flex; justify-content: space-between; gap: 20px; padding: 5px 0; }
      .total { border-top: 2px solid #0f172a; margin-top: 6px; padding-top: 12px !important; font-size: 16px; font-weight: 700; }
       .notes, .footer, .custom-section { border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 20px; color: #475569; font-size: 13px; white-space: pre-line; }
       .footer { color: #64748b; font-size: 12px; }
      @media print { body { padding: 0; background: white; } .document { max-width: none; padding: 0; } }
      @media (max-width: 640px) { body { padding: 16px; } .document { padding: 24px; } .header, .meta { grid-template-columns: 1fr; display: grid; } .issuer, .dates { text-align: left; } .dates div { justify-content: space-between; } .custom-fields { grid-template-columns: 1fr 1fr; } }
    </style>
  </head>
  <body>
    <main class="document">
       ${layoutHtml}
    </main>
  </body>
</html>`;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Generare PDF factură');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '900px';
  iframe.style.height = '1200px';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  try {
    const iframeDocument = iframe.contentDocument;
    if (!iframeDocument) {
      throw new Error('Nu s-a putut pregăti documentul PDF');
    }

    iframeDocument.open();
    iframeDocument.write(documentHtml);
    iframeDocument.close();
    await new Promise<void>((resolve) => {
      if (iframeDocument.readyState === 'complete') {
        resolve();
        return;
      }
      iframe.addEventListener('load', () => resolve(), { once: true });
    });

    await Promise.all(
      Array.from(iframeDocument.images)
        .filter((image) => !image.complete)
        .map(
          (image) =>
            new Promise<void>((resolve) => {
              image.addEventListener('load', () => resolve(), { once: true });
              image.addEventListener('error', () => resolve(), { once: true });
            }),
        ),
    );

    const documentElement = iframeDocument.querySelector<HTMLElement>('.document');
    if (!documentElement) {
      throw new Error('Documentul PDF nu a putut fi randat');
    }

    const canvas = await html2canvas(documentElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageHeight = (canvas.height * pageWidth) / canvas.width;
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    let remainingHeight = imageHeight;
    let offsetY = 0;

    while (remainingHeight > 0) {
      if (offsetY !== 0) {
        pdf.addPage();
      }
      pdf.addImage(imageData, 'JPEG', 0, offsetY, pageWidth, imageHeight);
      remainingHeight -= pageHeight;
      offsetY -= pageHeight;
    }

    return {
      filename,
      blob: pdf.output('blob'),
    };
  } finally {
    iframe.remove();
  }
}

export async function downloadInvoiceFile(
  invoice: InvoiceDetail,
  invoiceSettings?: InvoiceSettings | null,
): Promise<string> {
  const generated = await generateInvoicePdf(invoice, invoiceSettings);
  const url = URL.createObjectURL(generated.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = generated.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return generated.filename;
}

function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(files: Array<{ filename: string; bytes: Uint8Array }>): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.filename);
    const checksum = crc32(file.bytes);
    const localHeader = new Uint8Array(30 + name.length);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint32(localView, 14, checksum);
    writeUint32(localView, 18, file.bytes.length);
    writeUint32(localView, 22, file.bytes.length);
    writeUint16(localView, 26, name.length);
    localHeader.set(name, 30);
    localParts.push(localHeader, file.bytes);

    const centralHeader = new Uint8Array(46 + name.length);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint32(centralView, 16, checksum);
    writeUint32(centralView, 20, file.bytes.length);
    writeUint32(centralView, 24, file.bytes.length);
    writeUint16(centralView, 28, name.length);
    writeUint32(centralView, 42, offset);
    centralHeader.set(name, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + file.bytes.length;
  }

  const centralDirectory = centralParts.reduce((size, part) => size + part.length, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralDirectory);
  writeUint32(endView, 16, offset);

  const allParts = [...localParts, ...centralParts, endRecord];
  const totalSize = allParts.reduce((size, part) => size + part.byteLength, 0);
  const archive = new Uint8Array(totalSize);
  let archiveOffset = 0;
  for (const part of allParts) {
    archive.set(part, archiveOffset);
    archiveOffset += part.byteLength;
  }

  return new Blob([archive.buffer as ArrayBuffer], {
    type: 'application/zip',
  });
}

export async function downloadInvoiceFilesAsZip(
  invoices: InvoiceDetail[],
  invoiceSettings?: InvoiceSettings | null,
): Promise<string> {
  const generatedFiles: Array<{ filename: string; bytes: Uint8Array }> = [];
  for (const invoice of invoices) {
    const generated = await generateInvoicePdf(invoice, invoiceSettings);
    generatedFiles.push({
      filename: generated.filename,
      bytes: new Uint8Array(await generated.blob.arrayBuffer()),
    });
  }

  const filename = 'facturi-selectate.zip';
  const zipBlob = createZip(generatedFiles);
  const url = URL.createObjectURL(zipBlob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}