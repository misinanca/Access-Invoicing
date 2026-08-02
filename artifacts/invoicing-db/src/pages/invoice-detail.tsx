import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import {
  useGetInvoice,
  useGetInvoiceSettings,
  useUpdateInvoice,
  useUpdateInvoiceStatus,
  useDeleteInvoice,
  useCreateLineItem,
  useUpdateLineItem,
  useDeleteLineItem,
  getGetInvoiceQueryKey,
  getListInvoicesQueryKey,
} from '@workspace/api-client-react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { formatDateInput } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, ArrowLeft, Save, Mail, Printer, FileText, Download } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { InvoiceStatus, LineItem } from '@workspace/api-client-react';

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

function translateInvoiceStatus(status: InvoiceStatus): string {
  return {
    draft: 'Schiță',
    sent: 'Trimisă',
    paid: 'Plătită',
    overdue: 'Restantă',
  }[status];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeDownloadPart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'factura';
}

export default function InvoiceDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invoiceId = Number(params.id);
  const { data: invoice, isLoading } = useGetInvoice(invoiceId, {
    query: { enabled: !!invoiceId, queryKey: getGetInvoiceQueryKey(invoiceId) },
  });
  const { data: invoiceSettings } = useGetInvoiceSettings();

  const updateInvoice = useUpdateInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const deleteInvoice = useDeleteInvoice();
  const createLineItem = useCreateLineItem();
  const updateLineItem = useUpdateLineItem();
  const deleteLineItem = useDeleteLineItem();

  const [editMode, setEditMode] = useState(false);
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (invoice && !editMode) {
      const separatorIndex = invoice.invoiceNumber.lastIndexOf('-');
      setInvoicePrefix(separatorIndex > 0 ? invoice.invoiceNumber.slice(0, separatorIndex) : '');
      setInvoiceNumber(
        separatorIndex > 0 ? invoice.invoiceNumber.slice(separatorIndex + 1) : invoice.invoiceNumber,
      );
      setIssueDate(formatDateInput(invoice.issueDate));
      setDueDate(formatDateInput(invoice.dueDate));
      setTaxRate(String(invoice.taxRate));
      setNotes(invoice.notes || '');
    }
  }, [invoice, editMode]);

  const handleSave = () => {
    updateInvoice.mutate(
      {
        id: invoiceId,
        data: {
          invoicePrefix,
          invoiceNumber,
          issueDate,
          dueDate,
          taxRate: Number(taxRate),
          notes: notes || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(invoiceId) });
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          toast({ title: 'Factura a fost actualizată' });
          setEditMode(false);
        },
        onError: () => {
          toast({ title: 'Failed to update invoice', variant: 'destructive' });
        },
      }
    );
  };

  const handleStatusChange = (status: InvoiceStatus) => {
    updateStatus.mutate(
      { id: invoiceId, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(invoiceId) });
          toast({ title: 'Starea facturii a fost actualizată' });
        },
      }
    );
  };

  const handleDelete = () => {
    deleteInvoice.mutate(
      { id: invoiceId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          toast({ title: 'Factura a fost ștearsă' });
          setLocation('/invoices');
        },
      }
    );
  };

  const handleAddLineItem = () => {
    createLineItem.mutate(
      {
        invoiceId,
        data: {
          description: 'New item',
          quantity: 1,
          unitPrice: 0,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(invoiceId) });
        },
      }
    );
  };

  const subtotal = invoice?.lineItems.reduce((sum, item) => sum + item.amount, 0) || 0;
  const taxAmount = subtotal * (Number(taxRate) / 100);
  const total = subtotal + taxAmount;

  const handleEmailCustomer = () => {
    if (!invoice?.customerEmail) {
      toast({
        title: 'Lipsește adresa de email',
        description: 'Adaugă o adresă de email clientului înainte de a trimite factura.',
        variant: 'destructive',
      });
      return;
    }

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

    window.location.href = `mailto:${encodeURIComponent(invoice.customerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleDownloadInvoice = () => {
    const currentInvoice = invoice;
    if (!currentInvoice) return;

    const description =
      currentInvoice.lineItems
        .map((item) => item.description.trim())
        .filter(Boolean)
        .join(' - ') || 'factura';
    const filename = `${safeDownloadPart(currentInvoice.invoiceNumber)} - ${safeDownloadPart(description)}.html`;
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
    const lineItemsHtml = currentInvoice.lineItems.length
      ? currentInvoice.lineItems
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
    const notesHtml = currentInvoice.notes
      ? `<div class="notes">${escapeHtml(currentInvoice.notes).replace(/\n/g, '<br>')}</div>`
      : '';
    const footerHtml = invoiceSettings?.footerText
      ? `<div class="footer">${escapeHtml(invoiceSettings.footerText).replace(/\n/g, '<br>')}</div>`
      : '';
    const documentHtml = `<!doctype html>
<html lang="ro">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(currentInvoice.invoiceNumber)} - ${escapeHtml(description)}</title>
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
          <h1>${escapeHtml(currentInvoice.invoiceNumber)}</h1>
        </div>
        <div class="issuer">
          <strong>${escapeHtml(invoiceSettings?.issuerName || 'InvoiceDB')}</strong>
          ${escapeHtml(invoiceSettings?.issuerAddress || 'Administrare facturi').replace(/\n/g, '<br>')}
        </div>
      </header>
      <section class="meta">
        <div>
          <div class="label">Client</div>
          <div class="customer">${escapeHtml(currentInvoice.customerName)}</div>
          <div class="muted">${escapeHtml(currentInvoice.customerEmail || 'Email necompletat')}</div>
        </div>
        <div class="dates">
          <div><span>Data emiterii</span><strong>${escapeHtml(formatInvoiceDate(currentInvoice.issueDate))}</strong></div>
          <div><span>Data scadenței</span><strong>${escapeHtml(formatInvoiceDate(currentInvoice.dueDate))}</strong></div>
          <div><span>Stare</span><strong>${escapeHtml(translateInvoiceStatus(currentInvoice.status))}</strong></div>
        </div>
      </section>
      ${customFieldsHtml}
      <table>
        <thead><tr><th>Descriere</th><th>Cant.</th><th>Preț unitar</th><th>Valoare</th></tr></thead>
        <tbody>${lineItemsHtml}</tbody>
      </table>
      <section class="totals">
        <div><span>Subtotal</span><span>${escapeHtml(formatInvoiceCurrency(subtotal))}</span></div>
        <div><span>TVA (${escapeHtml(taxRate)}%)</span><span>${escapeHtml(formatInvoiceCurrency(taxAmount))}</span></div>
        <div class="total"><span>Total de plată</span><span>${escapeHtml(formatInvoiceCurrency(total))}</span></div>
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
    toast({
      title: 'Factura a fost descărcată',
      description: filename,
    });
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Se încarcă..." />
        <div className="max-w-5xl mx-auto px-8 py-8">
          <Skeleton className="h-96 w-full" />
        </div>
      </>
    );
  }

  if (!invoice) {
    return (
      <>
        <PageHeader title="Factura nu a fost găsită" />
        <div className="max-w-5xl mx-auto px-8 py-8">
          <p>Factura nu a fost găsită.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`Client: ${invoice.customerName}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLocation('/invoices')} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Înapoi
            </Button>
            <Button variant="outline" onClick={() => window.print()} data-testid="button-print-invoice">
              <Printer className="h-4 w-4 mr-2" />
              Printează
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadInvoice}
              data-testid="button-download-invoice"
            >
              <Download className="h-4 w-4 mr-2" />
              Descarcă factura
            </Button>
            <Button
              variant="outline"
              onClick={handleEmailCustomer}
              data-testid="button-email-invoice"
            >
              <Mail className="h-4 w-4 mr-2" />
              Trimite factura
            </Button>
            {editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)}>
                  Anulează
                </Button>
                <Button onClick={handleSave} disabled={updateInvoice.isPending} data-testid="button-save">
                  <Save className="h-4 w-4 mr-2" />
                  Salvează
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditMode(true)} data-testid="button-edit">
                Editează
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-delete-invoice">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ștergi factura?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Această acțiune nu poate fi anulată. Factura și toate pozițiile sale vor fi șterse definitiv.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anulează</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete">
                    Șterge
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Document factură</h2>
            <p className="text-sm text-muted-foreground">
              Previzualizare individuală pentru {invoice.customerName}
              {invoice.customerEmail ? ` · ${invoice.customerEmail}` : ' · Nu există adresă de email'}
            </p>
          </div>
        </div>

        <article
          className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm print:border-0 print:p-0 print:shadow-none"
          data-testid="invoice-document-preview"
        >
          <div className="flex items-start justify-between gap-8 border-b-2 border-slate-900 pb-6">
            <div>
              {invoiceSettings?.logoUrl && (
                <img
                  src={invoiceSettings.logoUrl}
                  alt="Logo companie"
                  className="mb-4 max-h-14 max-w-[190px] object-contain object-left"
                />
              )}
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {invoiceSettings?.invoiceTitle || 'Document factură'}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                {invoice.invoiceNumber}
              </h1>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-slate-950">
                {invoiceSettings?.issuerName || 'InvoiceDB'}
              </p>
              <p className="mt-1 whitespace-pre-line text-slate-500">
                {invoiceSettings?.issuerAddress || 'Administrare facturi'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-200 py-6 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Client</p>
              <p className="mt-3 text-base font-semibold text-slate-950">{invoice.customerName}</p>
              <p className="mt-1 text-slate-600">{invoice.customerEmail || 'Email necompletat'}</p>
            </div>
            <div className="space-y-2 md:text-right">
              <div className="flex justify-between gap-5 md:justify-end">
                <span className="text-slate-500">Data emiterii</span>
                <span className="font-medium text-slate-950">{formatInvoiceDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between gap-5 md:justify-end">
                <span className="text-slate-500">Data scadenței</span>
                <span className="font-semibold text-slate-950">{formatInvoiceDate(invoice.dueDate)}</span>
              </div>
              <div className="flex justify-between gap-5 md:justify-end">
                <span className="text-slate-500">Stare</span>
                <span className="font-medium text-slate-950">{translateInvoiceStatus(invoice.status)}</span>
              </div>
            </div>
          </div>

          {invoiceSettings?.customFields.length ? (
            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 py-5 text-sm md:grid-cols-3">
              {invoiceSettings.customFields.map((field) => (
                <div key={`${field.label}-${field.text}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {field.label}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-slate-950">{field.text}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="py-7">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-900 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-3 font-semibold">Descriere</th>
                  <th className="w-20 pb-3 text-right font-semibold">Cant.</th>
                  <th className="w-32 pb-3 text-right font-semibold">Preț unitar</th>
                  <th className="w-32 pb-3 text-right font-semibold">Valoare</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      Nu există poziții
                    </td>
                  </tr>
                ) : (
                  invoice.lineItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200">
                      <td className="py-4 pr-4 font-medium text-slate-950">{item.description}</td>
                      <td className="py-4 text-right font-mono text-slate-700">{item.quantity}</td>
                      <td className="py-4 text-right font-mono text-slate-700">
                        {formatInvoiceCurrency(item.unitPrice)}
                      </td>
                      <td className="py-4 text-right font-mono font-semibold text-slate-950">
                        {formatInvoiceCurrency(item.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="ml-auto mt-6 max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">{formatInvoiceCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>TVA ({taxRate}%)</span>
                <span className="font-mono">{formatInvoiceCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-base font-bold text-slate-950">
                <span>Total de plată</span>
                <span className="font-mono">{formatInvoiceCurrency(total)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="border-t border-slate-200 pt-5 text-sm text-slate-600 whitespace-pre-line">
              {invoice.notes}
            </div>
          )}
          {invoiceSettings?.footerText && (
            <p className="mt-5 border-t border-slate-200 pt-5 text-xs text-slate-500 whitespace-pre-line">
              {invoiceSettings.footerText}
            </p>
          )}
        </article>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 print:hidden">
          <span>
            Butonul deschide un mesaj precompletat în aplicația ta de email. Factura nu este marcată automat ca trimisă.
          </span>
          <Button variant="outline" onClick={handleEmailCustomer} data-testid="button-email-invoice-secondary">
            <Mail className="h-4 w-4 mr-2" />
            Trimite către {invoice.customerName}
          </Button>
        </div>

        {/* Invoice Header */}
        <div className="bg-card border border-card-border rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="invoicePrefix">Prefix factură</Label>
              <Input
                id="invoicePrefix"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                disabled={!editMode}
                className="mt-2"
                placeholder="INV"
                data-testid="input-invoice-prefix"
              />
            </div>

            <div>
              <Label htmlFor="invoiceNumber">Număr factură</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                disabled={!editMode}
                className="mt-2"
                placeholder="0001"
                data-testid="input-invoice-number"
              />
            </div>

            <div>
              <Label>Stare</Label>
              <Select
                value={invoice.status}
                onValueChange={(val) => handleStatusChange(val as InvoiceStatus)}
                disabled={editMode}
              >
                <SelectTrigger className="mt-2" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Schiță</SelectItem>
                  <SelectItem value="sent">Trimisă</SelectItem>
                  <SelectItem value="paid">Plătită</SelectItem>
                  <SelectItem value="overdue">Restantă</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="issueDate">Data emiterii</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                disabled={!editMode}
                className="mt-2"
                data-testid="input-issue-date"
              />
            </div>

            <div>
              <Label htmlFor="dueDate">Data scadenței</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={!editMode}
                className="mt-2"
                data-testid="input-due-date"
              />
            </div>

            <div>
              <Label htmlFor="taxRate">Cota TVA (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                disabled={!editMode}
                className="mt-2"
                data-testid="input-tax-rate"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="notes">Observații</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!editMode}
                className="mt-2"
                rows={3}
                data-testid="input-notes"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
            <h2 className="text-lg font-semibold">Poziții factură</h2>
            <Button onClick={handleAddLineItem} size="sm" disabled={createLineItem.isPending} data-testid="button-add-line-item">
              <Plus className="h-4 w-4 mr-2" />
              Adaugă poziție
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Descriere
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Cant.
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Preț unitar
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Valoare
                  </th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoice.lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      Nu există poziții
                    </td>
                  </tr>
                ) : (
                  invoice.lineItems.map((item) => (
                    <LineItemRow
                      key={item.id}
                      item={item}
                      invoiceId={invoiceId}
                      onUpdate={() => queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(invoiceId) })}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-card-border bg-muted/20 px-6 py-4">
            <div className="max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-mono font-semibold">{formatInvoiceCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA ({taxRate}%):</span>
                <span className="font-mono font-semibold">{formatInvoiceCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg border-t border-border pt-2">
                <span className="font-semibold">Total de plată:</span>
                <span className="font-mono font-bold">{formatInvoiceCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function LineItemRow({
  item,
  invoiceId,
  onUpdate,
}: {
  item: LineItem;
  invoiceId: number;
  onUpdate: () => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [description, setDescription] = useState(item.description);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unitPrice, setUnitPrice] = useState(String(item.unitPrice));

  const updateLineItem = useUpdateLineItem();
  const deleteLineItem = useDeleteLineItem();
  const { toast } = useToast();

  const handleSave = () => {
    updateLineItem.mutate(
      {
        invoiceId,
        id: item.id,
        data: {
          description,
          quantity: Number(quantity),
          unitPrice: Number(unitPrice),
        },
      },
      {
        onSuccess: () => {
          onUpdate();
          setEditMode(false);
          toast({ title: 'Poziția a fost actualizată' });
        },
      }
    );
  };

  const handleDelete = () => {
    deleteLineItem.mutate(
      { invoiceId, id: item.id },
      {
        onSuccess: () => {
          onUpdate();
          toast({ title: 'Poziția a fost ștearsă' });
        },
      }
    );
  };

  if (editMode) {
    return (
      <tr data-testid={`row-line-item-${item.id}`}>
        <td className="px-6 py-3">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            data-testid={`input-description-${item.id}`}
          />
        </td>
        <td className="px-6 py-3">
          <Input
            type="number"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="text-right"
            data-testid={`input-quantity-${item.id}`}
          />
        </td>
        <td className="px-6 py-3">
          <Input
            type="number"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="text-right"
            data-testid={`input-unit-price-${item.id}`}
          />
        </td>
        <td className="px-6 py-3 text-right font-mono">
          {formatInvoiceCurrency(Number(quantity) * Number(unitPrice))}
        </td>
        <td className="px-6 py-3">
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleSave} data-testid={`button-save-${item.id}`}>
              Salvează
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>
              Anulează
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-muted/30" data-testid={`row-line-item-${item.id}`}>
      <td className="px-6 py-4">{item.description}</td>
      <td className="px-6 py-4 text-right font-mono">{item.quantity}</td>
      <td className="px-6 py-4 text-right font-mono">{formatInvoiceCurrency(item.unitPrice)}</td>
      <td className="px-6 py-4 text-right font-mono font-semibold">{formatInvoiceCurrency(item.amount)}</td>
      <td className="px-6 py-4">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditMode(true)}
            data-testid={`button-edit-line-item-${item.id}`}
          >
            Editează
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            data-testid={`button-delete-line-item-${item.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
