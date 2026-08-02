import { Badge } from '@/components/ui/badge';
import type { InvoiceStatus } from '@workspace/api-client-react';

interface StatusBadgeProps {
  status: InvoiceStatus | 'draft' | 'sent' | 'paid' | 'overdue';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variants = {
    draft: 'bg-muted text-muted-foreground border-muted-foreground/20',
    sent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    paid: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
    overdue: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  };

  const labels = {
    draft: 'Draft',
    sent: 'Sent',
    paid: 'Paid',
    overdue: 'Overdue',
  };

  return (
    <Badge
      variant="outline"
      className={`${variants[status]} font-medium uppercase text-xs tracking-wide ${className}`}
    >
      {labels[status]}
    </Badge>
  );
}
