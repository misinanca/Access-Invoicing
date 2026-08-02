import { Link, useRoute } from 'wouter';
import { LayoutDashboard, FileText, Users, Package, House, Settings } from 'lucide-react';
import { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isDashboard] = useRoute('/');
  const [isInvoices] = useRoute('/invoices');
  const [isInvoicesDetail] = useRoute('/invoices/:id');
  const [isCustomers] = useRoute('/customers');
  const [isCustomersDetail] = useRoute('/customers/:id');
  const [isProducts] = useRoute('/products');
  const [isRent] = useRoute('/rent');
  const [isSettings] = useRoute('/settings');

  const isInvoicesActive = isInvoices || isInvoicesDetail;
  const isCustomersActive = isCustomers || isCustomersDetail;

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">
            InvoiceDB
          </h1>
          <p className="text-xs text-sidebar-foreground/60 mt-0.5 uppercase tracking-wider">
            Ledger System
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isDashboard
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            }`}
            data-testid="link-dashboard"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          <Link
            href="/rent"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isRent
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            }`}
            data-testid="link-rent"
          >
            <House className="h-4 w-4" />
            Default Rent
          </Link>

          <Link
            href="/invoices"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isInvoicesActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            }`}
            data-testid="link-invoices"
          >
            <FileText className="h-4 w-4" />
            Invoices
          </Link>

          <Link
            href="/customers"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isCustomersActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            }`}
            data-testid="link-customers"
          >
            <Users className="h-4 w-4" />
            Customers
          </Link>

          <Link
            href="/products"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isProducts
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            }`}
            data-testid="link-products"
          >
            <Package className="h-4 w-4" />
            Products
          </Link>

          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isSettings
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            }`}
            data-testid="link-settings"
          >
            <Settings className="h-4 w-4" />
            Setări
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
