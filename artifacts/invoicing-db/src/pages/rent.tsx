import { useMemo, useState } from 'react';
import {
  getListCustomersQueryKey,
  getGetInvoiceSummaryQueryKey,
  getGetRecentInvoicesQueryKey,
  getListInvoicesQueryKey,
  useCreateInvoice,
  useCreateLineItem,
  useListCustomers,
  useUpdateCustomer,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Search, ArrowRightLeft, Save, RotateCcw, House, FilePlus2, Check, Settings2, Printer } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_RATE = 4.97;

function formatMoney(value: number, currency: 'EUR' | 'RON') {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function Rent() {
  const [search, setSearch] = useState('');
  const [rate, setRate] = useState(() => {
    const saved = window.localStorage.getItem('eur-ron-rate');
    return saved || String(DEFAULT_RATE);
  });
  const { data: customers, isLoading } = useListCustomers({
    search: search || undefined,
  });
  const numericRate = Number(rate) > 0 ? Number(rate) : DEFAULT_RATE;

  const totalEur = useMemo(
    () =>
      (customers ?? []).reduce(
        (sum, customer) => sum + Number(customer.defaultRent ?? 0),
        0,
      ),
    [customers],
  );

  const saveRate = (value: string) => {
    setRate(value);
    if (Number(value) > 0) {
      window.localStorage.setItem('eur-ron-rate', value);
    }
  };

  return (
    <>
      <PageHeader
        title="Default Rent"
        description="Manage monthly rent by customer and flat"
      />

      <div className="max-w-7xl mx-auto px-8 py-8">
        <Tabs defaultValue="rent">
          <TabsList className="mb-6">
            <TabsTrigger value="rent" data-testid="tab-default-rent">
              <House className="h-4 w-4 mr-2" />
              Default rent
            </TabsTrigger>
            <TabsTrigger value="generate" data-testid="tab-generate-rent-invoices">
              <FilePlus2 className="h-4 w-4 mr-2" />
              Generate rent invoices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rent" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-5">
          <div className="bg-card border border-card-border rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-primary/15 text-primary">
                <House className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Monthly rent register</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Default rent is stored per customer in EUR and converted to RON for the current rate.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 mt-6 pt-5 border-t border-border">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Customers shown</p>
                <p className="font-mono text-xl font-semibold mt-1">{customers?.length ?? 0}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Total monthly rent</p>
                <p className="font-mono text-xl font-semibold mt-1">{formatMoney(totalEur, 'EUR')}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Converted total</p>
                <p className="font-mono text-xl font-semibold mt-1 text-primary">
                  {formatMoney(totalEur * numericRate, 'RON')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              <Label htmlFor="exchange-rate" className="font-semibold">
                Currency exchange
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              1 EUR equals how many RON?
            </p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">1 EUR =</span>
              <Input
                id="exchange-rate"
                type="number"
                min="0.01"
                step="0.01"
                value={rate}
                onChange={(event) => saveRate(event.target.value)}
                className="font-mono text-right"
                data-testid="input-exchange-rate"
              />
              <span className="font-mono text-sm font-semibold">RON</span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">Saved in this browser</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => saveRate(String(DEFAULT_RATE))}
                data-testid="button-reset-exchange-rate"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-10"
              data-testid="input-search-rent"
            />
          </div>
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            Rate: <span className="font-mono font-semibold text-foreground">1 EUR = {numericRate.toFixed(2)} RON</span>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : !customers || customers.length === 0 ? (
            <div className="p-12 text-center">
              <House className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {search ? 'No customers match your search' : 'Add customers to start tracking rent'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flat number</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default rent (EUR)</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rent (RON)</th>
                    <th className="w-28"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((customer) => (
                    <RentRow
                      key={customer.id}
                      customer={customer}
                      rate={numericRate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </TabsContent>
          <TabsContent value="generate">
            <GenerateRentInvoices
              customers={customers ?? []}
              isLoading={isLoading}
              rate={numericRate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function RentRow({
  customer,
  rate,
}: {
  customer: {
    id: number;
    name: string;
    flatNumber?: string | null;
    defaultRent?: number | null;
  };
  rate: number;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateCustomer = useUpdateCustomer();
  const [flatNumber, setFlatNumber] = useState(customer.flatNumber ?? '');
  const [rent, setRent] = useState(
    customer.defaultRent == null ? '' : String(customer.defaultRent),
  );
  const rentValue = Number(rent) || 0;
  const hasChanges =
    flatNumber !== (customer.flatNumber ?? '') ||
    rentValue !== Number(customer.defaultRent ?? 0);

  const handleSave = () => {
    updateCustomer.mutate(
      {
        id: customer.id,
        data: {
          flatNumber: flatNumber || undefined,
          defaultRent: rentValue,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          toast({ title: 'Rent details saved' });
        },
        onError: () => {
          toast({ title: 'Failed to save rent details', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <tr className="hover:bg-muted/30 transition-colors" data-testid={`row-rent-${customer.id}`}>
      <td className="px-6 py-3.5">
        <div className="font-medium">{customer.name}</div>
      </td>
      <td className="px-6 py-3.5">
        <Input
          value={flatNumber}
          onChange={(event) => setFlatNumber(event.target.value)}
          placeholder="—"
          className="h-9 max-w-32 font-mono"
          data-testid={`input-flat-${customer.id}`}
        />
      </td>
      <td className="px-6 py-3.5">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={rent}
          onChange={(event) => setRent(event.target.value)}
          placeholder="0.00"
          className="h-9 ml-auto max-w-40 text-right font-mono"
          data-testid={`input-rent-${customer.id}`}
        />
      </td>
      <td className="px-6 py-3.5 text-right font-mono font-semibold text-primary">
        {formatMoney(rentValue * rate, 'RON')}
      </td>
      <td className="px-6 py-3.5 text-right">
        <Button
          size="sm"
          variant={hasChanges ? 'default' : 'ghost'}
          onClick={handleSave}
          disabled={!hasChanges || updateCustomer.isPending}
          data-testid={`button-save-rent-${customer.id}`}
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Save
        </Button>
      </td>
    </tr>
  );
}

type InvoiceLayout = {
  issuerName: string;
  issuerAddress: string;
  title: string;
  footer: string;
};

const defaultLayout: InvoiceLayout = {
  issuerName: 'Administrare imobile',
  issuerAddress: 'Adresă emitent',
  title: 'FACTURĂ DE CHIRIE',
  footer: 'Vă mulțumim pentru plata la termen.',
};

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getRomanianMonth(month: string) {
  const months = [
    'ianuarie',
    'februarie',
    'martie',
    'aprilie',
    'mai',
    'iunie',
    'iulie',
    'august',
    'septembrie',
    'octombrie',
    'noiembrie',
    'decembrie',
  ];
  const [year, monthNumber] = month.split('-');
  return `${months[Math.max(0, Number(monthNumber) - 1)]} ${year}`;
}

function GenerateRentInvoices({
  customers,
  isLoading,
  rate,
}: {
  customers: Array<{
    id: number;
    name: string;
    flatNumber?: string | null;
    defaultRent?: number | null;
  }>;
  isLoading: boolean;
  rate: number;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createInvoice = useCreateInvoice();
  const createLineItem = useCreateLineItem();
  const [invoiceDate, setInvoiceDate] = useState(getToday);
  const [dueDate, setDueDate] = useState(getDefaultDueDate);
  const [rentMonth, setRentMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [layout, setLayout] = useState<InvoiceLayout>(() => {
    try {
      return {
        ...defaultLayout,
        ...JSON.parse(window.localStorage.getItem('rent-invoice-layout') || '{}'),
      };
    } catch {
      return defaultLayout;
    }
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [generatedCount, setGeneratedCount] = useState(0);

  const customersWithRent = customers.filter((customer) => Number(customer.defaultRent ?? 0) > 0);
  const selectedCustomers = customersWithRent.filter((customer) =>
    selectedIds.includes(customer.id),
  );
  const totalRon = selectedCustomers.reduce(
    (sum, customer) => sum + Number(customer.defaultRent ?? 0) * rate,
    0,
  );
  const allSelected =
    customersWithRent.length > 0 && selectedCustomers.length === customersWithRent.length;

  const updateLayout = (key: keyof InvoiceLayout, value: string) => {
    const next = { ...layout, [key]: value };
    setLayout(next);
    window.localStorage.setItem('rent-invoice-layout', JSON.stringify(next));
  };

  const toggleCustomer = (id: number, checked: boolean | 'indeterminate') => {
    setSelectedIds((current) =>
      checked === true
        ? [...new Set([...current, id])]
        : current.filter((selectedId) => selectedId !== id),
    );
  };

  const toggleAll = (checked: boolean | 'indeterminate') => {
    setSelectedIds(checked === true ? customersWithRent.map((customer) => customer.id) : []);
  };

  const generateInvoices = async () => {
    if (!selectedCustomers.length || !invoiceDate || !dueDate || !rentMonth) {
      toast({
        title: 'Completează datele facturii',
        description: 'Selectează cel puțin un client și verifică datele.',
        variant: 'destructive',
      });
      return;
    }

    try {
      let completed = 0;
      for (const customer of selectedCustomers) {
        const rentEur = Number(customer.defaultRent ?? 0);
        const rentRon = Number((rentEur * rate).toFixed(2));
        const flatLabel = customer.flatNumber
          ? `Apartament nr. ${customer.flatNumber}`
          : 'Apartament fără număr';
        const description = `Chirie pentru luna ${getRomanianMonth(rentMonth)} — ${flatLabel}`;
        const notes = [
          `${layout.title}`,
          `Emitent: ${layout.issuerName}`,
          `Adresă emitent: ${layout.issuerAddress}`,
          `Client: ${customer.name}`,
          `Monedă: RON (calculat la cursul 1 EUR = ${rate.toFixed(4)} RON)`,
          layout.footer,
        ].join('\n');

        const invoice = await createInvoice.mutateAsync({
          data: {
            customerId: customer.id,
            issueDate: invoiceDate,
            dueDate,
            notes,
            taxRate: 0,
            status: 'draft',
          },
        });
        await createLineItem.mutateAsync({
          invoiceId: invoice.id,
          data: {
            description,
            quantity: 1,
            unitPrice: rentRon,
          },
        });
        completed += 1;
        setGeneratedCount(completed);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetRecentInvoicesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetInvoiceSummaryQueryKey() }),
      ]);
      toast({
        title: `${completed} factur${completed === 1 ? 'ă' : 'i'} de chirie generate`,
        description: 'Facturile au fost create ca schițe și sunt disponibile în Invoices.',
      });
      setSelectedIds([]);
    } catch {
      toast({
        title: 'Generarea facturilor a eșuat',
        description: 'Verifică datele și încearcă din nou.',
        variant: 'destructive',
      });
    }
  };

  const isGenerating = createInvoice.isPending || createLineItem.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Generează facturi de chirie</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Creează câte o factură în limba română pentru fiecare client selectat.
          </p>
        </div>
        {generatedCount > 0 && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 flex items-center gap-2">
            <Check className="h-4 w-4" />
            {generatedCount} generate în această sesiune
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-6">
        <div className="space-y-6">
          <div className="bg-card border border-card-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-5">
              <FilePlus2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Date factură</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="rent-invoice-date">Data emiterii</Label>
                <Input
                  id="rent-invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(event) => setInvoiceDate(event.target.value)}
                  className="mt-2"
                  data-testid="input-rent-invoice-date"
                />
              </div>
              <div>
                <Label htmlFor="rent-invoice-due-date">Data scadenței</Label>
                <Input
                  id="rent-invoice-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="mt-2"
                  data-testid="input-rent-invoice-due-date"
                />
              </div>
              <div>
                <Label htmlFor="rent-invoice-month">Luna chiriei</Label>
                <Input
                  id="rent-invoice-month"
                  type="month"
                  value={rentMonth}
                  onChange={(event) => setRentMonth(event.target.value)}
                  className="mt-2"
                  data-testid="input-rent-invoice-month"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Data scadenței este editabilă și se aplică tuturor facturilor generate acum.
            </p>
          </div>

          <div className="bg-card border border-card-border rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Clienți cu chirie implicită</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Curs utilizat: 1 EUR = {rate.toFixed(4)} RON
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                Selectează tot
              </label>
            </div>
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : customersWithRent.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                Nu există clienți cu o chirie implicită. Completează datele în fila Default rent.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {customersWithRent.map((customer) => {
                  const rentRon = Number(customer.defaultRent ?? 0) * rate;
                  return (
                    <label
                      key={customer.id}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 cursor-pointer"
                      data-testid={`row-generate-rent-${customer.id}`}
                    >
                      <Checkbox
                        checked={selectedIds.includes(customer.id)}
                        onCheckedChange={(checked) => toggleCustomer(customer.id, checked)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.flatNumber
                            ? `Apartament nr. ${customer.flatNumber}`
                            : 'Apartament fără număr'}
                        </p>
                      </div>
                      <div className="text-right font-mono">
                        <p className="font-semibold">{formatMoney(rentRon, 'RON')}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(Number(customer.defaultRent ?? 0), 'EUR')}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="px-6 py-4 bg-muted/20 border-t border-card-border flex items-center justify-between gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Selectate:</span>{' '}
                <span className="font-semibold">{selectedCustomers.length}</span>
                <span className="text-muted-foreground ml-4">Total:</span>{' '}
                <span className="font-mono font-semibold">{formatMoney(totalRon, 'RON')}</span>
              </div>
              <Button
                onClick={generateInvoices}
                disabled={isGenerating || !selectedCustomers.length}
                data-testid="button-generate-rent-invoices"
              >
                <FilePlus2 className="h-4 w-4 mr-2" />
                {isGenerating ? 'Se generează...' : 'Generează facturile'}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-card-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-5">
              <Settings2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Personalizează aspectul</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="layout-title">Titlu factură</Label>
                <Input
                  id="layout-title"
                  value={layout.title}
                  onChange={(event) => updateLayout('title', event.target.value)}
                  className="mt-2"
                  data-testid="input-layout-title"
                />
              </div>
              <div>
                <Label htmlFor="layout-issuer">Nume emitent</Label>
                <Input
                  id="layout-issuer"
                  value={layout.issuerName}
                  onChange={(event) => updateLayout('issuerName', event.target.value)}
                  className="mt-2"
                  data-testid="input-layout-issuer"
                />
              </div>
              <div>
                <Label htmlFor="layout-address">Adresă emitent</Label>
                <Textarea
                  id="layout-address"
                  value={layout.issuerAddress}
                  onChange={(event) => updateLayout('issuerAddress', event.target.value)}
                  className="mt-2"
                  rows={2}
                  data-testid="input-layout-address"
                />
              </div>
              <div>
                <Label htmlFor="layout-footer">Text de subsol</Label>
                <Textarea
                  id="layout-footer"
                  value={layout.footer}
                  onChange={(event) => updateLayout('footer', event.target.value)}
                  className="mt-2"
                  rows={2}
                  data-testid="input-layout-footer"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-card-border rounded-lg p-6 shadow-sm print:shadow-none">
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Previzualizare</p>
                <h3 className="text-xl font-bold mt-1">{layout.title || 'FACTURĂ DE CHIRIE'}</h3>
              </div>
              <Printer className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-border text-sm">
              <div>
                <p className="font-semibold">{layout.issuerName || '—'}</p>
                <p className="text-muted-foreground whitespace-pre-line mt-1">{layout.issuerAddress || '—'}</p>
              </div>
              <div className="text-right">
                <p>Data: {invoiceDate || '—'}</p>
                <p>Scadență: <span className="font-semibold">{dueDate || '—'}</span></p>
              </div>
            </div>
            <div className="py-4 text-sm">
              <p className="text-muted-foreground">Descriere</p>
              <p className="font-medium mt-2">
                Chirie pentru luna {getRomanianMonth(rentMonth)} — Apartament nr. 14B
              </p>
              <div className="flex justify-between border-t border-border mt-4 pt-3">
                <span>Total de plată</span>
                <span className="font-mono font-bold">{formatMoney(rate * 850, 'RON')}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground border-t border-border pt-3 whitespace-pre-line">
              {layout.footer || '—'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-4">
              Exemplul se actualizează după alegerea clienților și se aplică pentru fiecare factură generată.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}