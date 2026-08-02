import { useGetInvoiceSummary, useGetRecentInvoices } from '@workspace/api-client-react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Link } from 'wouter';
import { TrendingUp, DollarSign, FileText, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetInvoiceSummary();
  const { data: recentInvoices, isLoading: invoicesLoading } = useGetRecentInvoices();

  return (
    <>
      <PageHeader title="Dashboard" description="Financial overview and recent activity" />

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            icon={DollarSign}
            label="Total Invoiced"
            value={formatCurrency(summary?.totalInvoiced ?? 0)}
            loading={summaryLoading}
            color="text-primary"
          />
          <SummaryCard
            icon={TrendingUp}
            label="Total Paid"
            value={formatCurrency(summary?.totalPaid ?? 0)}
            loading={summaryLoading}
            color="text-green-600"
          />
          <SummaryCard
            icon={FileText}
            label="Outstanding"
            value={formatCurrency(summary?.totalOutstanding ?? 0)}
            loading={summaryLoading}
            color="text-blue-600"
          />
          <SummaryCard
            icon={Clock}
            label="Overdue"
            value={formatCurrency(summary?.totalOverdue ?? 0)}
            loading={summaryLoading}
            color="text-red-600"
          />
        </div>

        {/* Meta Stats */}
        {!summaryLoading && summary && (
          <div className="flex gap-6 mb-8 text-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-muted-foreground">Total Invoices:</span>
              <span className="font-mono font-semibold">{summary.invoiceCount}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-muted-foreground">Total Customers:</span>
              <span className="font-mono font-semibold">{summary.customerCount}</span>
            </div>
          </div>
        )}

        {/* Recent Invoices Table */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-card-border">
            <h2 className="text-lg font-semibold">Recent Invoices</h2>
          </div>

          {invoicesLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !recentInvoices || recentInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No invoices yet</p>
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
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentInvoices.map((invoice) => (
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

interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  loading: boolean;
  color: string;
}

function SummaryCard({ icon: Icon, label, value, loading, color }: SummaryCardProps) {
  return (
    <div className="bg-card border border-card-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${color} opacity-80`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
          {label}
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <div className="text-3xl font-bold font-mono tracking-tight">{value}</div>
      )}
    </div>
  );
}
