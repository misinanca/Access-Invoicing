import { useState } from 'react';
import { useListCustomers, useCreateCustomer, useDeleteCustomer, getListCustomersQueryKey } from '@workspace/api-client-react';
import { PageHeader } from '@/components/page-header';
import { Link } from 'wouter';
import { Plus, Search, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function Customers() {
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const params = { search: search || undefined };
  const { data: customers, isLoading } = useListCustomers(params);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage customer records and contacts"
        actions={
          <CreateCustomerDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
        }
      />

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-customers"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !customers || customers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {search ? 'No customers match your search' : 'No customers yet'}
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-customer">
                <Plus className="h-4 w-4 mr-2" />
                Create Customer
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Location
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Flat
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Default rent
                    </th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((customer) => (
                    <CustomerRow key={customer.id} customer={customer} />
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

function CustomerRow({ customer }: { customer: any }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteCustomer = useDeleteCustomer();

  const handleDelete = () => {
    deleteCustomer.mutate(
      { id: customer.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          toast({ title: 'Customer deleted' });
        },
        onError: () => {
          toast({ title: 'Failed to delete customer', variant: 'destructive' });
        },
      }
    );
  };

  const location = [customer.city, customer.state]
    .filter(Boolean)
    .join(', ') || '—';

  return (
    <tr className="hover:bg-muted/30 transition-colors" data-testid={`row-customer-${customer.id}`}>
      <td className="px-6 py-4">
        <Link
          href={`/customers/${customer.id}`}
          className="font-medium text-foreground hover:text-primary hover:underline"
          data-testid={`link-customer-${customer.id}`}
        >
          {customer.name}
        </Link>
      </td>
      <td className="px-6 py-4 text-sm text-muted-foreground">
        {customer.email || '—'}
      </td>
      <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
        {customer.phone || '—'}
      </td>
      <td className="px-6 py-4 text-sm text-muted-foreground">
        {location}
      </td>
      <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
        {customer.flatNumber || '—'}
      </td>
      <td className="px-6 py-4 text-right text-sm font-mono">
        {customer.defaultRent != null ? `€${Number(customer.defaultRent).toFixed(2)}` : '—'}
      </td>
      <td className="px-6 py-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" data-testid={`button-delete-customer-${customer.id}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete {customer.name}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} data-testid={`button-confirm-delete-${customer.id}`}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </td>
    </tr>
  );
}

function CreateCustomerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createCustomer = useCreateCustomer();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [defaultRent, setDefaultRent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createCustomer.mutate(
      {
        data: {
          name,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          zip: zip || undefined,
          country: country || undefined,
          flatNumber: flatNumber || undefined,
          defaultRent: defaultRent ? Number(defaultRent) : undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          toast({ title: 'Customer created successfully' });
          onOpenChange(false);
          setName('');
          setEmail('');
          setPhone('');
          setAddress('');
          setCity('');
          setState('');
          setZip('');
          setCountry('');
          setFlatNumber('');
          setDefaultRent('');
        },
        onError: () => {
          toast({ title: 'Failed to create customer', variant: 'destructive' });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-customer">
          <Plus className="h-4 w-4 mr-2" />
          Create Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="input-name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-email"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                data-testid="input-phone"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                data-testid="input-address"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                data-testid="input-city"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                data-testid="input-state"
              />
            </div>
            <div>
              <Label htmlFor="zip">ZIP</Label>
              <Input
                id="zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                data-testid="input-zip"
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                data-testid="input-country"
              />
            </div>
            <div>
              <Label htmlFor="flatNumber">Flat number</Label>
              <Input
                id="flatNumber"
                value={flatNumber}
                onChange={(e) => setFlatNumber(e.target.value)}
                placeholder="e.g. 14B"
                data-testid="input-flat-number"
              />
            </div>
            <div>
              <Label htmlFor="defaultRent">Default rent (EUR)</Label>
              <Input
                id="defaultRent"
                type="number"
                min="0"
                step="0.01"
                value={defaultRent}
                onChange={(e) => setDefaultRent(e.target.value)}
                placeholder="0.00"
                data-testid="input-default-rent"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCustomer.isPending} data-testid="button-submit-customer">
              {createCustomer.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
