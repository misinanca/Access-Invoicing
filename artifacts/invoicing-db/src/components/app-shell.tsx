import { Link, useRoute } from 'wouter';
import { LayoutDashboard, FileText, Users, Package, House, Settings, Pencil } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { useListCompanies, useUpdateCompany } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const queryClient = useQueryClient();
  const { data: companies } = useListCompanies();
  const updateCompany = useUpdateCompany();
  const { toast } = useToast();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState(() => {
    if (typeof window === 'undefined') return '1';
    return window.localStorage.getItem('invoice-db-company-id') ?? '1';
  });
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
  const selectedCompany = companies?.find(
    (company) => String(company.id) === selectedCompanyId,
  );

  useEffect(() => {
    if (!companies?.length) return;
    const savedId = window.localStorage.getItem('invoice-db-company-id');
    const isValid = savedId && companies.some((company) => String(company.id) === savedId);
    if (!isValid) {
      const firstCompanyId = String(companies[0].id);
      window.localStorage.setItem('invoice-db-company-id', firstCompanyId);
      setSelectedCompanyId(firstCompanyId);
    }
  }, [companies]);

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    window.localStorage.setItem('invoice-db-company-id', companyId);
    queryClient.clear();
  };

  const openRenameDialog = () => {
    if (!selectedCompany) return;
    setCompanyName(selectedCompany.name);
    setRenameDialogOpen(true);
  };

  const handleRenameCompany = () => {
    const name = companyName.trim();
    if (!selectedCompany || !name) return;

    updateCompany.mutate(
      { id: selectedCompany.id, data: { name } },
      {
        onSuccess: (updatedCompany) => {
          queryClient.setQueryData(
            ['/api/companies'],
            (currentCompanies: typeof companies | undefined) =>
              currentCompanies?.map((company) =>
                company.id === updatedCompany.id ? updatedCompany : company,
              ),
          );
          setRenameDialogOpen(false);
          toast({
            title: 'Compania a fost redenumită',
            description: `Noul nume este „${updatedCompany.name}”.`,
          });
        },
        onError: (error) => {
          toast({
            title: 'Redenumirea a eșuat',
            description: error instanceof Error ? error.message : 'Încearcă din nou.',
            variant: 'destructive',
          });
        },
      },
    );
  };

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
          <div className="mt-5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
              Companie activă
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              <select
                value={selectedCompanyId}
                onChange={(event) => handleCompanyChange(event.target.value)}
                className="min-w-0 flex-1 rounded-md border border-sidebar-border bg-sidebar-accent px-2.5 py-2 text-sm text-sidebar-accent-foreground outline-none focus:ring-2 focus:ring-sidebar-ring"
                aria-label="Selectează compania"
                data-testid="select-company"
                disabled={!companies?.length}
              >
                {(companies ?? []).map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
                onClick={openRenameDialog}
                disabled={!selectedCompany || updateCompany.isPending}
                aria-label="Redenumește compania activă"
                title="Redenumește compania"
                data-testid="button-rename-company"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
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

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redenumește compania</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="company-name" className="text-sm font-medium">
              Numele companiei
            </label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              maxLength={120}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleRenameCompany();
              }}
              data-testid="input-company-name"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Anulează
            </Button>
            <Button
              type="button"
              onClick={handleRenameCompany}
              disabled={!companyName.trim() || updateCompany.isPending}
              data-testid="button-save-company-name"
            >
              {updateCompany.isPending ? 'Se salvează...' : 'Salvează'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
