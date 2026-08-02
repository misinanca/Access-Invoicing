import { useState } from 'react';
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, getListProductsQueryKey } from '@workspace/api-client-react';
import { PageHeader } from '@/components/page-header';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Package, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Product, ProductUnit } from '@workspace/api-client-react';

export default function Products() {
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const params = { search: search || undefined };
  const { data: products, isLoading } = useListProducts(params);

  return (
    <>
      <PageHeader
        title="Products & Services"
        description="Manage your product and service catalog"
        actions={
          <CreateProductDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
        }
      />

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-products"
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
          ) : !products || products.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {search ? 'No products match your search' : 'No products yet'}
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-product">
                <Plus className="h-4 w-4 mr-2" />
                Create Product
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
                      Description
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((product) => (
                    <ProductRow key={product.id} product={product} />
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

function ProductRow({ product }: { product: Product }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteProduct = useDeleteProduct();

  const handleDelete = () => {
    deleteProduct.mutate(
      { id: product.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          toast({ title: 'Product deleted' });
        },
        onError: () => {
          toast({ title: 'Failed to delete product', variant: 'destructive' });
        },
      }
    );
  };

  return (
    <>
      <tr className="hover:bg-muted/30 transition-colors" data-testid={`row-product-${product.id}`}>
        <td className="px-6 py-4 font-medium">{product.name}</td>
        <td className="px-6 py-4 text-sm text-muted-foreground max-w-md truncate">
          {product.description || '—'}
        </td>
        <td className="px-6 py-4 text-right font-mono font-semibold">
          {formatCurrency(product.unitPrice)}
        </td>
        <td className="px-6 py-4 text-sm">
          <span className="inline-flex items-center px-2 py-1 rounded bg-muted text-muted-foreground font-medium text-xs uppercase">
            {product.unit}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditDialogOpen(true)}
              data-testid={`button-edit-product-${product.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" data-testid={`button-delete-product-${product.id}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete {product.name}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} data-testid={`button-confirm-delete-${product.id}`}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </td>
      </tr>

      <EditProductDialog
        product={product}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
}

function CreateProductDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createProduct = useCreateProduct();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('each');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createProduct.mutate(
      {
        data: {
          name,
          description: description || undefined,
          unitPrice: Number(unitPrice),
          unit,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          toast({ title: 'Product created successfully' });
          onOpenChange(false);
          setName('');
          setDescription('');
          setUnitPrice('');
          setUnit('each');
        },
        onError: () => {
          toast({ title: 'Failed to create product', variant: 'destructive' });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-product">
          <Plus className="h-4 w-4 mr-2" />
          Create Product
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="input-description"
            />
          </div>
          <div>
            <Label htmlFor="unitPrice">Unit Price *</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
              data-testid="input-unit-price"
            />
          </div>
          <div>
            <Label htmlFor="unit">Unit *</Label>
            <Select value={unit} onValueChange={(val) => setUnit(val as ProductUnit)}>
              <SelectTrigger id="unit" data-testid="select-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="each">Each</SelectItem>
                <SelectItem value="hour">Hour</SelectItem>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="flat">Flat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProduct.isPending} data-testid="button-submit-product">
              {createProduct.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateProduct = useUpdateProduct();
  
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || '');
  const [unitPrice, setUnitPrice] = useState(String(product.unitPrice));
  const [unit, setUnit] = useState<ProductUnit>(product.unit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateProduct.mutate(
      {
        id: product.id,
        data: {
          name,
          description: description || undefined,
          unitPrice: Number(unitPrice),
          unit,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          toast({ title: 'Product updated successfully' });
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: 'Failed to update product', variant: 'destructive' });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-testid="input-edit-name"
            />
          </div>
          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="input-edit-description"
            />
          </div>
          <div>
            <Label htmlFor="edit-unitPrice">Unit Price *</Label>
            <Input
              id="edit-unitPrice"
              type="number"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
              data-testid="input-edit-unit-price"
            />
          </div>
          <div>
            <Label htmlFor="edit-unit">Unit *</Label>
            <Select value={unit} onValueChange={(val) => setUnit(val as ProductUnit)}>
              <SelectTrigger id="edit-unit" data-testid="select-edit-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="each">Each</SelectItem>
                <SelectItem value="hour">Hour</SelectItem>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="flat">Flat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateProduct.isPending} data-testid="button-submit-edit-product">
              {updateProduct.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
