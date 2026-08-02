import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import {
  useGetCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useGetCustomerInvoices,
  getGetCustomerQueryKey,
  getListCustomersQueryKey,
} from '@workspace/api-client-react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, ArrowLeft, Save, FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Link } from 'wouter';

export default function CustomerDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const customerId = Number(params.id);
  const { data: customer, isLoading } = useGetCustomer(customerId);
  const { data: invoices, isLoading: invoicesLoading } = useGetCustomerInvoices(customerId);

  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');
  const [notes, setNotes] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [defaultRent, setDefaultRent] = useState('');

  useEffect(() => {
    if (customer && !editMode) {
      setName(customer.name);
      setEmail(customer.email || '');
      setPhone(customer.phone || '');
      setAddress(customer.address || '');
      setCity(customer.city || '');
      setState(customer.state || '');
      setZip(customer.zip || '');
      setCountry(customer.country || '');
      setNotes(customer.notes || '');
      setFlatNumber(customer.flatNumber || '');
      setDefaultRent(customer.defaultRent == null ? '' : String(customer.defaultRent));
    }
  }, [customer, editMode]);

  const handleSave = () => {
    updateCustomer.mutate(
      {
        id: customerId,
        data: {
          name,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          zip: zip || undefined,
          country: country || undefined,
          notes: notes || undefined,
          flatNumber: flatNumber || undefined,
          defaultRent: defaultRent ? Number(defaultRent) : undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCustomerQueryKey(customerId) });
          toast({ title: 'Customer updated' });
          setEditMode(false);
        },
        onError: () => {
          toast({ title: 'Failed to update customer', variant: 'destructive' });
        },
      }
    );
  };

  const handleDelete = () => {
    deleteCustomer.mutate(
      { id: customerId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          toast({ title: 'Customer deleted' });
          setLocation('/customers');
        },
      }
    );
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

  if (!customer) {
    return (
      <>
        <PageHeader title="Customer Not Found" />
        <div className="max-w-5xl mx-auto px-8 py-8">
          <p>Customer not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={customer.name}
        description={`Customer since ${formatDate(customer.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLocation('/customers')} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateCustomer.isPending} data-testid="button-save">
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
                <Button variant="destructive" data-testid="button-delete-customer">
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
        {/* Customer Details */}
        <div className="bg-card border border-card-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!editMode}
                className="mt-2"
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
                disabled={!editMode}
                className="mt-2"
                data-testid="input-email"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!editMode}
                className="mt-2"
                data-testid="input-phone"
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!editMode}
                className="mt-2"
                data-testid="input-address"
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!editMode}
                className="mt-2"
                data-testid="input-city"
              />
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={!editMode}
                className="mt-2"
                data-testid="input-state"
              />
            </div>

            <div>
              <Label htmlFor="zip">ZIP</Label>
              <Input
                id="zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                disabled={!editMode}
                className="mt-2"
                data-testid="input-zip"
              />
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={!editMode}
                className="mt-2"
                data-testid="input-country"
              />
            </div>

            <div>
              <Label htmlFor="flatNumber">Flat number</Label>
              <Input
                id="flatNumber"
                value={flatNumber}
                onChange={(e) => setFlatNumber(e.target.value)}
                disabled={!editMode}
                className="mt-2"
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
                disabled={!editMode}
                className="mt-2"
                placeholder="0.00"
                data-testid="input-default-rent"
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

        {/* Invoices */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-card-border">
            <h2 className="text-lg font-semibold">Invoice History</h2>
          </div>

          {invoicesLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No invoices for this customer yet</p>
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
