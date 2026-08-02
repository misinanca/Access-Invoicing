import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import {
  getGetInvoiceSettingsQueryKey,
  useGetInvoiceSettings,
  useUpdateInvoiceSettings,
  type InvoiceCustomField,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Plus, Save, Settings2, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const defaultFields: InvoiceCustomField[] = [];

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetInvoiceSettings();
  const updateSettings = useUpdateInvoiceSettings();

  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [issuerAddress, setIssuerAddress] = useState('');
  const [footerText, setFooterText] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isReadingLogo, setIsReadingLogo] = useState(false);
  const [customFields, setCustomFields] = useState<InvoiceCustomField[]>(defaultFields);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!settings) return;
    setInvoicePrefix(settings.invoicePrefix);
    setInvoiceTitle(settings.invoiceTitle);
    setIssuerName(settings.issuerName);
    setIssuerAddress(settings.issuerAddress);
    setFooterText(settings.footerText);
    setLogoUrl(settings.logoUrl ?? '');
    setCustomFields(settings.customFields.length ? settings.customFields : defaultFields);
  }, [settings]);

  const updateCustomField = (index: number, key: keyof InvoiceCustomField, value: string) => {
    setCustomFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, [key]: value } : field,
      ),
    );
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    const maxFileSize = 2 * 1024 * 1024;
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Format de logo neacceptat',
        description: 'Încarcă un fișier PNG, JPG, WEBP sau SVG.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }
    if (file.size > maxFileSize) {
      toast({
        title: 'Logo-ul este prea mare',
        description: 'Fișierul trebuie să aibă maximum 2 MB.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    setIsReadingLogo(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
        toast({ title: 'Logo încărcat', description: 'Salvează setările pentru a-l păstra.' });
      }
      setIsReadingLogo(false);
    };
    reader.onerror = () => {
      setIsReadingLogo(false);
      toast({
        title: 'Logo-ul nu a putut fi încărcat',
        description: 'Încearcă din nou cu un alt fișier.',
        variant: 'destructive',
      });
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setLogoUrl('');
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const fields = customFields.filter((field) => field.label.trim() || field.text.trim());

    updateSettings.mutate(
      {
        data: {
          invoicePrefix: invoicePrefix.trim(),
          invoiceTitle,
          issuerName,
          issuerAddress,
          footerText,
          logoUrl: logoUrl.trim() || null,
          customFields: fields,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetInvoiceSettingsQueryKey() });
          toast({ title: 'Setările facturilor au fost salvate' });
        },
        onError: () => {
          toast({
            title: 'Setările nu au putut fi salvate',
            description: 'Verifică prefixul și încearcă din nou.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Setări" description="Personalizează documentele de facturare" />
        <div className="max-w-5xl mx-auto px-8 py-8">
          <Skeleton className="h-[620px] w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Setări"
        description="Personalizează numerele, aspectul și conținutul facturilor"
      />
      <div className="max-w-5xl mx-auto px-8 py-8">
        <form onSubmit={handleSave} className="space-y-6">
          <section className="bg-card border border-card-border rounded-lg p-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="rounded-md bg-primary/15 p-2 text-primary">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Numerotarea facturilor</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Prefixul se aplică facturilor noi generate. Facturile existente își păstrează numărul.
                </p>
              </div>
            </div>
            <div className="max-w-sm">
              <Label htmlFor="settings-invoice-prefix">Prefix factură</Label>
              <Input
                id="settings-invoice-prefix"
                value={invoicePrefix}
                onChange={(event) => setInvoicePrefix(event.target.value)}
                className="mt-2 font-mono"
                placeholder="INV"
                required
                data-testid="input-settings-invoice-prefix"
              />
            </div>
          </section>

          <section className="bg-card border border-card-border rounded-lg p-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="rounded-md bg-primary/15 p-2 text-primary">
                <ImagePlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Aspectul facturii</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Aceste informații apar în documentele noi și în previzualizările facturilor.
                </p>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="settings-invoice-title">Titlu factură</Label>
                <Input
                  id="settings-invoice-title"
                  value={invoiceTitle}
                  onChange={(event) => setInvoiceTitle(event.target.value)}
                  className="mt-2"
                  data-testid="input-settings-invoice-title"
                />
              </div>
              <div>
                <Label htmlFor="settings-issuer-name">Nume companie / emitent</Label>
                <Input
                  id="settings-issuer-name"
                  value={issuerName}
                  onChange={(event) => setIssuerName(event.target.value)}
                  className="mt-2"
                  data-testid="input-settings-issuer-name"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="settings-issuer-address">Adresă companie / emitent</Label>
                <Textarea
                  id="settings-issuer-address"
                  value={issuerAddress}
                  onChange={(event) => setIssuerAddress(event.target.value)}
                  className="mt-2"
                  rows={3}
                  data-testid="input-settings-issuer-address"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="settings-logo-file">Logo companie</Label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Input
                    ref={logoInputRef}
                    id="settings-logo-file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="max-w-md"
                    data-testid="input-settings-logo-file"
                  />
                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={clearLogo}
                      disabled={isReadingLogo}
                      data-testid="button-clear-settings-logo"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Elimină logo-ul
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Încarcă PNG, JPG, WEBP sau SVG, maximum 2 MB. Logo-ul este păstrat împreună cu setările.
                </p>
                <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  <span>sau folosește un URL public</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <Input
                  id="settings-logo-url"
                  type="text"
                  value={logoUrl.startsWith('data:image/') ? '' : logoUrl}
                  onChange={(event) => setLogoUrl(event.target.value)}
                  className="mt-2"
                  placeholder="https://exemplu.ro/logo.png"
                  data-testid="input-settings-logo-url"
                />
                {logoUrl && (
                  <div className="mt-3 rounded-md border border-border bg-white p-3">
                    <img
                      src={logoUrl}
                      alt="Previzualizare logo companie"
                      className="max-h-20 max-w-[220px] object-contain"
                    />
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Logo-ul apare în previzualizare, la tipărire și în PDF-urile descărcate.
                </p>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="settings-footer">Text de subsol</Label>
                <Textarea
                  id="settings-footer"
                  value={footerText}
                  onChange={(event) => setFooterText(event.target.value)}
                  className="mt-2"
                  rows={3}
                  data-testid="input-settings-footer"
                />
              </div>
            </div>
          </section>

          <section className="bg-card border border-card-border rounded-lg p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="font-semibold">Câmpuri suplimentare</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Adaugă celule cu un nume și un text, de exemplu „CUI” sau „IBAN”.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomFields((current) => [...current, { label: '', text: '' }])}
                data-testid="button-add-invoice-field"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adaugă câmp
              </Button>
            </div>
            <div className="space-y-4">
              {customFields.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nu există câmpuri suplimentare. Adaugă primul câmp pentru a-l afișa pe factură.
                </div>
              ) : (
                customFields.map((field, index) => (
                  <div key={index} className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-[0.8fr_1.5fr_auto] md:items-end">
                    <div>
                      <Label htmlFor={`custom-field-label-${index}`}>Nume câmp</Label>
                      <Input
                        id={`custom-field-label-${index}`}
                        value={field.label}
                        onChange={(event) => updateCustomField(index, 'label', event.target.value)}
                        className="mt-2"
                        placeholder="CUI"
                        data-testid={`input-custom-field-label-${index}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`custom-field-text-${index}`}>Text</Label>
                      <Input
                        id={`custom-field-text-${index}`}
                        value={field.text}
                        onChange={(event) => updateCustomField(index, 'text', event.target.value)}
                        className="mt-2"
                        placeholder="RO12345678"
                        data-testid={`input-custom-field-text-${index}`}
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setCustomFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index))}
                      aria-label={`Șterge câmpul ${index + 1}`}
                      data-testid={`button-remove-custom-field-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Setările se folosesc și în <Link href="/rent" className="text-primary hover:underline">generarea facturilor de chirie</Link>.
            </p>
              <Button
                type="submit"
                disabled={updateSettings.isPending || isReadingLogo}
                data-testid="button-save-settings"
              >
              <Save className="h-4 w-4 mr-2" />
                {isReadingLogo
                  ? 'Se pregătește logo-ul...'
                  : updateSettings.isPending
                    ? 'Se salvează...'
                    : 'Salvează setările'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}