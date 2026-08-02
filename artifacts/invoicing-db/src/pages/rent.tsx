import { useMemo, useState } from 'react';
import {
  getListCustomersQueryKey,
  useListCustomers,
  useUpdateCustomer,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Search, ArrowRightLeft, Save, RotateCcw, House } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
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

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
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