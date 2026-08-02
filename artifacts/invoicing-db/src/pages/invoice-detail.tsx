import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import {
  useGetInvoice,
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
import { formatCurrency, formatDate, formatDateInput } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, ArrowLeft, Save, Mail, Printer, FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { InvoiceStatus, LineItem } from '@workspace/api-client-react';

export default function InvoiceDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invoiceId = Number(params.id);
  const { data: invoice, isLoading } = useGetInvoice(invoiceId, {
    query: { enabled: !!invoiceId, queryKey: getGetInvoiceQueryKey(invoiceId) },
  });

  const updateInvoice = useUpdateInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const deleteInvoice = useDeleteInvoice();
  const createLineItem = useCreateLineItem();
  const updateLineItem = useUpdateLineItem();
  const deleteLineItem = useDeleteLineItem();

  const [editMode, setEditMode] = useState(false);
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (invoice && !editMode) {
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
          issueDate,
          dueDate,
          taxRate: Number(taxRate),
          notes: notes || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(invoiceId) });
          toast({ title: 'Invoice updated' });
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
          toast({ title: 'Status updated' });
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
          toast({ title: 'Invoice deleted' });
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
        title: 'Customer email is missing',
        description: 'Add an email address to this customer before emailing the invoice.',
        variant: 'destructive',
      });
      return;
    }

    const lineItemsText = invoice.lineItems
      .map(
        (item) =>
          `- ${item.description} | ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.amount)}`,
      )
      .join('\n');
    const subject = `Factură ${invoice.invoiceNumber}`;
    const body = [
      `Bună ziua, ${invoice.customerName},`,
      '',
      `Vă transmitem factura ${invoice.invoiceNumber}.`,
      `Data emiterii: ${formatDate(invoice.issueDate)}`,
      `Data scadenței: ${formatDate(invoice.dueDate)}`,
      '',
      'Detalii:',
      lineItemsText || '- Fără articole',
      '',
      `Total de plată: ${formatCurrency(invoice.total)}`,
      '',
      invoice.notes || '',
      '',
      'Vă mulțumim.',
    ]
      .filter((line, index, lines) => !(line === '' && lines[index - 1] === ''))
      .join('\n');

    window.location.href = `mailto:${encodeURIComponent(invoice.customerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." />
        <div className="max-w-5xl mx-auto px-8 py-8">
          <Skeleton className="h-96 w-full" />
        </div>
      </>
    );
  }

  if (!invoice) {
    return (
      <>
        <PageHeader title="Invoice Not Found" />
        <div className="max-w-5xl mx-auto px-8 py-8">
          <p>Invoice not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`Customer: ${invoice.customerName}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLocation('/invoices')} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" onClick={() => window.print()} data-testid="button-print-invoice">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={handleEmailCustomer}
              data-testid="button-email-invoice"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email customer
            </Button>
            {editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateInvoice.isPending} data-testid="button-save">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditMode(true)} data-testid="button-edit">
                Edit
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
                  <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the invoice and all its line items.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete">
                    Delete
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
            <h2 className="text-lg font-semibold">Invoice document</h2>
            <p className="text-sm text-muted-foreground">
              Individual preview for {invoice.customerName}
              {invoice.customerEmail ? ` · ${invoice.customerEmail}` : ' · No email address saved'}
            </p>
          </div>
        </div>

        <article
          className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm print:border-0 print:p-0 print:shadow-none"
          data-testid="invoice-document-preview"
        >
          <div className="flex items-start justify-between gap-8 border-b-2 border-slate-900 pb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Invoice document</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                {invoice.invoiceNumber}
              </h1>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-slate-950">InvoiceDB</p>
              <p className="mt-1 text-slate-500">Invoice management</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-200 py-6 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bill to</p>
              <p className="mt-3 text-base font-semibold text-slate-950">{invoice.customerName}</p>
              <p className="mt-1 text-slate-600">{invoice.customerEmail || 'Email not provided'}</p>
            </div>
            <div className="space-y-2 md:text-right">
              <div className="flex justify-between gap-5 md:justify-end">
                <span className="text-slate-500">Issue date</span>
                <span className="font-medium text-slate-950">{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between gap-5 md:justify-end">
                <span className="text-slate-500">Due date</span>
                <span className="font-semibold text-slate-950">{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="flex justify-between gap-5 md:justify-end">
                <span className="text-slate-500">Status</span>
                <span className="font-medium capitalize text-slate-950">{invoice.status}</span>
              </div>
            </div>
          </div>

          <div className="py-7">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-900 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-3 font-semibold">Description</th>
                  <th className="w-20 pb-3 text-right font-semibold">Qty</th>
                  <th className="w-32 pb-3 text-right font-semibold">Unit price</th>
                  <th className="w-32 pb-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      No line items
                    </td>
                  </tr>
                ) : (
                  invoice.lineItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200">
                      <td className="py-4 pr-4 font-medium text-slate-950">{item.description}</td>
                      <td className="py-4 text-right font-mono text-slate-700">{item.quantity}</td>
                      <td className="py-4 text-right font-mono text-slate-700">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-4 text-right font-mono font-semibold text-slate-950">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="ml-auto mt-6 max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax ({taxRate}%)</span>
                <span className="font-mono">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-base font-bold text-slate-950">
                <span>Total</span>
                <span className="font-mono">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="border-t border-slate-200 pt-5 text-sm text-slate-600 whitespace-pre-line">
              {invoice.notes}
            </div>
          )}
        </article>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 print:hidden">
          <span>
            Email customer opens a prefilled message in your mail application. The invoice is not marked as sent automatically.
          </span>
          <Button variant="outline" onClick={handleEmailCustomer} data-testid="button-email-invoice-secondary">
            <Mail className="h-4 w-4 mr-2" />
            Email {invoice.customerName}
          </Button>
        </div>

        {/* Invoice Header */}
        <div className="bg-card border border-card-border rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Status</Label>
              <Select
                value={invoice.status}
                onValueChange={(val) => handleStatusChange(val as InvoiceStatus)}
                disabled={editMode}
              >
                <SelectTrigger className="mt-2" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="issueDate">Issue Date</Label>
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
              <Label htmlFor="dueDate">Due Date</Label>
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
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
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
              <Label htmlFor="notes">Notes</Label>
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
            <h2 className="text-lg font-semibold">Line Items</h2>
            <Button onClick={handleAddLineItem} size="sm" disabled={createLineItem.isPending} data-testid="button-add-line-item">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoice.lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No line items yet
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
                <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({taxRate}%):</span>
                <span className="font-mono font-semibold">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg border-t border-border pt-2">
                <span className="font-semibold">Total:</span>
                <span className="font-mono font-bold">{formatCurrency(total)}</span>
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
          toast({ title: 'Line item updated' });
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
          toast({ title: 'Line item deleted' });
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
          {formatCurrency(Number(quantity) * Number(unitPrice))}
        </td>
        <td className="px-6 py-3">
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleSave} data-testid={`button-save-${item.id}`}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>
              Cancel
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
      <td className="px-6 py-4 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
      <td className="px-6 py-4 text-right font-mono font-semibold">{formatCurrency(item.amount)}</td>
      <td className="px-6 py-4">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditMode(true)}
            data-testid={`button-edit-line-item-${item.id}`}
          >
            Edit
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
