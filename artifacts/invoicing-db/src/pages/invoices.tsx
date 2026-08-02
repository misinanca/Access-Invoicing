import { useState } from 'react';
import {
  useListInvoices,
  useCreateInvoice,
  useDeleteInvoice,
  getListInvoicesQueryKey,
} from '@workspace/api-client-react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Link } from 'wouter';
import { Plus, Search, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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

  const params = {
    search: search || undefined,
    status: statusFilter !== 'all' ? (statusFilter as InvoiceStatus) : undefined,
  };

  const { data: invoices, isLoading } = useListInvoices(params);

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
