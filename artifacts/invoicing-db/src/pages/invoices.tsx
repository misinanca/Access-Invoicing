import { useEffect, useState } from 'react';
import {
  useListInvoices,
  getInvoice,
  getInvoiceSettings,
  useCreateInvoice,
  useDeleteInvoice,
  useGetGmailStatus,
  sendInvoiceEmail,
  getListInvoicesQueryKey,
} from '@workspace/api-client-react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { downloadInvoiceFile, downloadInvoiceFilesAsZip, generateInvoicePdf } from '@/lib/invoice-download';
import { blobToBase64 } from '@/lib/invoice-email';
import { Link } from 'wouter';
import { Plus, Search, FileText, Trash2, Download, Archive, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { InvoiceStatus } from '@workspace/api-client-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Invoices() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<number>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkEmailProgress, setBulkEmailProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const params = {
    search: search || undefined,
    status: statusFilter !== 'all' ? (statusFilter as InvoiceStatus) : undefined,
  };

  const { data: invoices, isLoading } = useListInvoices(params);
  const { data: gmailStatus } = useGetGmailStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const visibleInvoices = invoices ?? [];
  const selectedVisibleInvoices = visibleInvoices.filter((invoice) => selectedInvoiceIds.has(invoice.id));
  const allVisibleSelected =
    visibleInvoices.length > 0 && selectedVisibleInvoices.length === visibleInvoices.length;
  const someVisibleSelected =
    selectedVisibleInvoices.length > 0 && !allVisibleSelected;

  useEffect(() => {
    setSelectedInvoiceIds((current) => {
      const visibleIds = new Set(visibleInvoices.map((invoice) => invoice.id));
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [invoices]);

  const toggleInvoiceSelection = (invoiceId: number) => {
    setSelectedInvoiceIds((current) => {
      const next = new Set(current);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  const toggleAllVisibleInvoices = () => {
    setSelectedInvoiceIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visibleInvoices.forEach((invoice) => next.delete(invoice.id));
      } else {
        visibleInvoices.forEach((invoice) => next.add(invoice.id));
      }
      return next;
    });
  };

  const handleBulkDownload = async () => {
    if (selectedVisibleInvoices.length === 0) return;
    setIsBulkDownloading(true);
    try {
      const [details, invoiceSettings] = await Promise.all([
        Promise.all(selectedVisibleInvoices.map((invoice) => getInvoice(invoice.id))),
        getInvoiceSettings(),
      ]);
      const filename = await downloadInvoiceFilesAsZip(details, invoiceSettings);
      toast({
        title: 'Facturile au fost descărcate',
        description: `${selectedVisibleInvoices.length} facturi în ${filename}`,
      });
    } catch {
      toast({
        title: 'Facturile nu au putut fi descărcate',
        variant: 'destructive',
      });
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleBulkEmail = async () => {
    if (selectedVisibleInvoices.length === 0) return;

    if (!gmailStatus?.connected) {
      toast({
        title: 'Gmail nu este conectat',
        description: 'Conectează un cont Gmail din Setări înainte de a trimite facturi.',
        variant: 'destructive',
      });
      return;
    }

    const withEmail = selectedVisibleInvoices.filter((invoice) => invoice.customerEmail);
    const missingEmail = selectedVisibleInvoices.length - withEmail.length;
    if (withEmail.length === 0) {
      toast({
        title: 'Nicio factură nu are email',
        description: 'Adaugă adrese de email clienților selectați.',
        variant: 'destructive',
      });
      return;
    }

    setBulkEmailProgress({ current: 0, total: withEmail.length });
    let sent = 0;
    const failures: string[] = [];

    try {
      const invoiceSettings = await getInvoiceSettings();
      for (let index = 0; index < withEmail.length; index += 1) {
        const selected = withEmail[index];
        setBulkEmailProgress({ current: index + 1, total: withEmail.length });
        try {
          const invoice = await getInvoice(selected.id);
          const { blob, filename } = await generateInvoicePdf(invoice, invoiceSettings);
          const pdfBase64 = await blobToBase64(blob);
          await sendInvoiceEmail(invoice.id, { pdfBase64, filename });
          sent += 1;
        } catch {
          failures.push(selected.invoiceNumber);
        }
      }
    } finally {
      setBulkEmailProgress(null);
      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
    }

    const parts = [`${sent} trimise`];
    if (missingEmail > 0) parts.push(`${missingEmail} fără email`);
    if (failures.length > 0) parts.push(`${failures.length} eșuate (${failures.join(', ')})`);

    toast({
      title: sent > 0 ? 'Trimitere în masă finalizată' : 'Trimiterea în masă a eșuat',
      description: parts.join(' · '),
      variant: failures.length > 0 || missingEmail > 0 ? 'destructive' : undefined,
    });
  };

  const isBulkEmailing = bulkEmailProgress != null;

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Manage all invoices and transactions"
        actions={
          <CreateInvoiceDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
        }
      />

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-invoices"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedVisibleInvoices.length > 0 && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm text-foreground">
              {selectedVisibleInvoices.length} invoice{selectedVisibleInvoices.length === 1 ? '' : 's'} selected
              {isBulkEmailing
                ? ` · trimitere ${bulkEmailProgress.current}/${bulkEmailProgress.total}`
                : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={handleBulkEmail}
                disabled={isBulkDownloading || isBulkEmailing}
                data-testid="button-email-selected-invoices"
              >
                <Mail className="mr-2 h-4 w-4" />
                {isBulkEmailing
                  ? `Se trimite ${bulkEmailProgress.current}/${bulkEmailProgress.total}...`
                  : 'Trimite selectate'}
              </Button>
              <Button
                onClick={handleBulkDownload}
                disabled={isBulkDownloading || isBulkEmailing}
                data-testid="button-download-selected-invoices"
              >
                <Archive className="mr-2 h-4 w-4" />
                {isBulkDownloading ? 'Preparing ZIP...' : 'Download selected PDFs'}
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {search || statusFilter !== 'all' ? 'No invoices match your filters' : 'No invoices yet'}
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-invoice">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                        <th className="w-14 px-6 py-3">
                          <Checkbox
                            checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                            onCheckedChange={toggleAllVisibleInvoices}
                            aria-label="Select all visible invoices"
                            data-testid="checkbox-select-all-invoices"
                          />
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Issue Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Total
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      PDF
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="w-16 px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-muted/30 transition-colors"
                      data-testid={`row-invoice-${invoice.id}`}
                    >
                      <td className="px-6 py-4">
                        <Checkbox
                          checked={selectedInvoiceIds.has(invoice.id)}
                          onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                          aria-label={`Select invoice ${invoice.invoiceNumber}`}
                          data-testid={`checkbox-invoice-${invoice.id}`}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-mono font-medium text-primary hover:underline"
                          data-testid={`link-invoice-${invoice.id}`}
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/customers/${invoice.customerId}`}
                          className="text-foreground hover:text-primary hover:underline"
                          data-testid={`link-customer-${invoice.customerId}`}
                        >
                          {invoice.customerName}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-semibold">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DownloadInvoiceButton
                          invoiceId={invoice.id}
                          invoiceNumber={invoice.invoiceNumber}
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <EmailInvoiceButton
                          invoiceId={invoice.id}
                          invoiceNumber={invoice.invoiceNumber}
                          customerName={invoice.customerName}
                          customerEmail={invoice.customerEmail}
                          gmailConnected={Boolean(gmailStatus?.connected)}
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DeleteInvoiceButton
                          invoiceId={invoice.id}
                          invoiceNumber={invoice.invoiceNumber}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DownloadInvoiceButton({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: number;
  invoiceNumber: string;
}) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const [invoice, invoiceSettings] = await Promise.all([
        getInvoice(invoiceId),
        getInvoiceSettings(),
      ]);
      const filename = await downloadInvoiceFile(invoice, invoiceSettings);
      toast({
        title: 'Factura a fost descărcată',
        description: filename,
      });
    } catch {
      toast({
        title: 'Factura nu a putut fi descărcată',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={handleDownload}
      disabled={isDownloading}
      className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
      aria-label={`Descarcă factura ${invoiceNumber}`}
      data-testid={`button-download-invoice-${invoiceId}`}
    >
      <Download className="h-4 w-4" />
    </Button>
  );
}

function EmailInvoiceButton({
  invoiceId,
  invoiceNumber,
  customerName,
  customerEmail,
  gmailConnected,
}: {
  invoiceId: number;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  gmailConnected: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleEmail = async () => {
    if (!customerEmail) {
      toast({
        title: 'Lipsește adresa de email',
        description: `Adaugă o adresă de email pentru ${customerName} înainte de a trimite factura.`,
        variant: 'destructive',
      });
      return;
    }

    if (!gmailConnected) {
      toast({
        title: 'Gmail nu este conectat',
        description: 'Conectează un cont Gmail din Setări înainte de a trimite facturi.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const [invoice, invoiceSettings] = await Promise.all([
        getInvoice(invoiceId),
        getInvoiceSettings(),
      ]);
      const { blob, filename } = await generateInvoicePdf(invoice, invoiceSettings);
      const pdfBase64 = await blobToBase64(blob);
      await sendInvoiceEmail(invoice.id, { pdfBase64, filename });
      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      toast({
        title: 'Factura a fost trimisă',
        description: `Email trimis către ${customerEmail}`,
      });
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Încearcă din nou.';
      toast({
        title: 'Factura nu a putut fi trimisă',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={handleEmail}
      disabled={isLoading}
      className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
      aria-label={`Trimite factura ${invoiceNumber} prin email către ${customerName}`}
      title={customerEmail ? `Trimite către ${customerEmail}` : 'Clientul nu are adresă de email'}
      data-testid={`button-email-invoice-${invoiceId}`}
    >
      <Mail className="h-4 w-4" />
    </Button>
  );
}

function DeleteInvoiceButton({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: number;
  invoiceNumber: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteInvoice = useDeleteInvoice();

  const handleDelete = () => {
    deleteInvoice.mutate(
      { id: invoiceId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          toast({ title: 'Factura a fost ștearsă' });
        },
        onError: () => {
          toast({
            title: 'Factura nu a putut fi ștearsă',
            variant: 'destructive',
          });
        },
      },
    );
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Șterge factura ${invoiceNumber}`}
          data-testid={`button-delete-invoice-${invoiceId}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ștergi factura {invoiceNumber}?</AlertDialogTitle>
          <AlertDialogDescription>
            Această acțiune nu poate fi anulată. Factura și toate pozițiile sale vor fi șterse definitiv.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anulează</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteInvoice.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid={`button-confirm-delete-invoice-${invoiceId}`}
          >
            {deleteInvoice.isPending ? 'Se șterge...' : 'Șterge factura'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CreateInvoiceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createInvoice = useCreateInvoice();
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createInvoice.mutate(
      {
        data: {
          customerId: Number(customerId),
          issueDate,
          dueDate,
          status: 'draft',
          taxRate: 0,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          toast({ title: 'Invoice created successfully' });
          onOpenChange(false);
          setCustomerId('');
          setIssueDate('');
          setDueDate('');
        },
        onError: () => {
          toast({ title: 'Failed to create invoice', variant: 'destructive' });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-invoice">
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="customerId">Customer ID</Label>
            <Input
              id="customerId"
              type="number"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              data-testid="input-customer-id"
            />
          </div>
          <div>
            <Label htmlFor="issueDate">Issue Date</Label>
            <Input
              id="issueDate"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
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
              required
              data-testid="input-due-date"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoice.isPending} data-testid="button-submit-invoice">
              {createInvoice.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
