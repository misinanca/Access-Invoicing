import { useEffect, useRef, useState } from 'react';
import { Link, useSearch } from 'wouter';
import {
  getGetInvoiceSettingsQueryKey,
  getGetGmailStatusQueryKey,
  useGetInvoiceSettings,
  useUpdateInvoiceSettings,
  useGetGmailStatus,
  getGmailConnectUrl,
  useDisconnectGmail,
  type InvoiceCustomField,
  type InvoiceLabels,
  type InvoiceLayoutSection,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, ImagePlus, Mail, Plus, Save, Settings2, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_INVOICE_LABELS, DEFAULT_INVOICE_LAYOUT } from '@/lib/invoice-layout';

const defaultFields: InvoiceCustomField[] = [];

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchString = useSearch();
  const { data: settings, isLoading } = useGetInvoiceSettings();
  const { data: gmailStatus, isLoading: isGmailLoading } = useGetGmailStatus();
  const updateSettings = useUpdateInvoiceSettings();
  const disconnectGmail = useDisconnectGmail();
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);

  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [startingInvoiceNumber, setStartingInvoiceNumber] = useState('1');
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [issuerAddress, setIssuerAddress] = useState('');
  const [footerText, setFooterText] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isReadingLogo, setIsReadingLogo] = useState(false);
  const [customFields, setCustomFields] = useState<InvoiceCustomField[]>(defaultFields);
  const [layoutSections, setLayoutSections] = useState<InvoiceLayoutSection[]>(DEFAULT_INVOICE_LAYOUT);
  const [invoiceLabels, setInvoiceLabels] = useState<InvoiceLabels>(DEFAULT_INVOICE_LABELS);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!settings) return;
    setInvoicePrefix(settings.invoicePrefix);
    setStartingInvoiceNumber(String(settings.startingInvoiceNumber));
    setInvoiceTitle(settings.invoiceTitle);
    setIssuerName(settings.issuerName);
    setIssuerAddress(settings.issuerAddress);
    setFooterText(settings.footerText);
    setLogoUrl(settings.logoUrl ?? '');
    setCustomFields(settings.customFields.length ? settings.customFields : defaultFields);
    setLayoutSections(
      settings.layoutSections.length
        ? settings.layoutSections
        : DEFAULT_INVOICE_LAYOUT,
    );
    setInvoiceLabels({
      ...DEFAULT_INVOICE_LABELS,
      ...settings.invoiceLabels,
    });
  }, [settings]);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const gmailResult = params.get('gmail');
    if (!gmailResult) return;

    if (gmailResult === 'connected') {
      toast({
        title: 'Gmail conectat',
        description: 'Facturile vor fi trimise din contul tău Gmail.',
      });
      queryClient.invalidateQueries({ queryKey: getGetGmailStatusQueryKey() });
    } else if (gmailResult === 'error') {
      toast({
        title: 'Conectarea Gmail a eșuat',
        description: params.get('reason') || 'Încearcă din nou.',
        variant: 'destructive',
      });
    }

    window.history.replaceState({}, '', '/settings');
  }, [searchString, toast, queryClient]);

  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    try {
      const { authUrl } = await getGmailConnectUrl();
      window.location.href = authUrl;
    } catch {
      setIsConnectingGmail(false);
      toast({
        title: 'Gmail nu poate fi conectat',
        description: 'Verifică configurația Google OAuth pe server.',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnectGmail = () => {
    disconnectGmail.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGmailStatusQueryKey() });
        toast({ title: 'Gmail deconectat' });
      },
      onError: () => {
        toast({
          title: 'Deconectarea a eșuat',
          variant: 'destructive',
        });
      },
    });
  };

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

  const updateLayoutSection = (
    index: number,
    updates: Partial<InvoiceLayoutSection>,
  ) => {
    setLayoutSections((current) =>
      current.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, ...updates } : section,
      ),
    );
  };

  const moveLayoutSection = (index: number, direction: -1 | 1) => {
    setLayoutSections((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const addCustomSection = () => {
    setLayoutSections((current) => [
      ...current,
      {
        id: `custom-${Date.now()}`,
        type: 'custom',
        label: 'Secțiune nouă',
        visible: true,
        content: 'Adaugă aici informații suplimentare.',
      },
    ]);
  };

  const updateInvoiceLabel = (key: keyof InvoiceLabels, value: string) => {
    setInvoiceLabels((current) => ({ ...current, [key]: value }));
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const fields = customFields.filter((field) => field.label.trim() || field.text.trim());

    updateSettings.mutate(
      {
        data: {
          invoicePrefix: invoicePrefix.trim(),
          startingInvoiceNumber: Math.max(1, Number(startingInvoiceNumber) || 1),
          invoiceTitle,
          issuerName,
          issuerAddress,
          footerText,
          logoUrl: logoUrl.trim() || null,
          customFields: fields,
          layoutSections,
          invoiceLabels,
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
      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
        <section className="bg-card border border-card-border rounded-lg p-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="rounded-md bg-primary/15 p-2 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Gmail</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Conectează un cont Gmail personal pentru a trimite facturile cu PDF atașat.
                Mesajele apar în folderul Sent al contului conectat. Tokenul este stocat criptat pe server.
              </p>
            </div>
          </div>
          {isGmailLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : gmailStatus?.connected ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Conectat ca {gmailStatus.email}</p>
                {gmailStatus.connectedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Conectat la {new Date(gmailStatus.connectedAt).toLocaleString('ro-RO')}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleDisconnectGmail}
                disabled={disconnectGmail.isPending}
                data-testid="button-disconnect-gmail"
              >
                Deconectează Gmail
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Niciun cont Gmail conectat.</p>
              <Button
                type="button"
                onClick={handleConnectGmail}
                disabled={isConnectingGmail}
                data-testid="button-connect-gmail"
              >
                {isConnectingGmail ? 'Se redirecționează...' : 'Conectează Gmail'}
              </Button>
            </div>
          )}
        </section>

        <form onSubmit={handleSave} className="space-y-6">
          <section className="bg-card border border-card-border rounded-lg p-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="rounded-md bg-primary/15 p-2 text-primary">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Numerotarea facturilor</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Prefixul și numărul de start se aplică facturilor noi generate. Facturile existente își păstrează numărul.
                </p>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
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
              <div>
                <Label htmlFor="settings-starting-invoice-number">Număr de start</Label>
                <Input
                  id="settings-starting-invoice-number"
                  type="number"
                  min={1}
                  step={1}
                  value={startingInvoiceNumber}
                  onChange={(event) => setStartingInvoiceNumber(event.target.value)}
                  className="mt-2 font-mono"
                  placeholder="1"
                  required
                  data-testid="input-settings-starting-invoice-number"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Prima factură nouă va folosi acest număr, de exemplu 25 devine INV-0025.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-card border border-card-border rounded-lg p-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="rounded-md bg-primary/15 p-2 text-primary">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Denumiri în factură</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Schimbă textele afișate pentru antetele și totalurile facturii.
                </p>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {([
                ['customer', 'Client / date client'],
                ['email', 'Email'],
                ['issueDate', 'Data emiterii'],
                ['dueDate', 'Data scadenței'],
                ['status', 'Stare'],
                ['description', 'Descriere poziție'],
                ['quantity', 'Cantitate'],
                ['unitPrice', 'Preț unitar'],
                ['amount', 'Valoare poziție'],
                ['subtotal', 'Subtotal'],
                ['tax', 'TVA'],
                ['total', 'Total de plată'],
              ] as Array<[keyof InvoiceLabels, string]>).map(([key, label]) => (
                <div key={key}>
                  <Label htmlFor={`invoice-label-${key}`}>{label}</Label>
                  <Input
                    id={`invoice-label-${key}`}
                    value={invoiceLabels[key]}
                    onChange={(event) => updateInvoiceLabel(key, event.target.value)}
                    className="mt-2"
                    maxLength={80}
                    required
                    data-testid={`input-invoice-label-${key}`}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="bg-card border border-card-border rounded-lg p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="font-semibold">Structura facturii</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Reordonează secțiunile, ascunde ce nu folosești sau adaugă blocuri personalizate.
                  Modificările apar în previzualizare, tipărire și PDF.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addCustomSection}
                data-testid="button-add-layout-section"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adaugă secțiune
              </Button>
            </div>
            <div className="space-y-3">
              {layoutSections.map((section, index) => (
                <div
                  key={section.id}
                  className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-[auto_1fr_auto] md:items-center"
                  data-testid={`layout-section-${section.id}`}
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                    <span className="w-6 text-center text-sm font-mono">{index + 1}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label htmlFor={`layout-section-label-${section.id}`}>Titlu secțiune</Label>
                      <Input
                        id={`layout-section-label-${section.id}`}
                        value={section.label}
                        onChange={(event) =>
                          updateLayoutSection(index, { label: event.target.value })
                        }
                        className="mt-2"
                        data-testid={`input-layout-section-label-${section.id}`}
                      />
                    </div>
                    {section.type === 'custom' && (
                      <div>
                        <Label htmlFor={`layout-section-content-${section.id}`}>Conținut</Label>
                        <Textarea
                          id={`layout-section-content-${section.id}`}
                          value={section.content ?? ''}
                          onChange={(event) =>
                            updateLayoutSection(index, { content: event.target.value })
                          }
                          className="mt-2"
                          rows={2}
                          data-testid={`input-layout-section-content-${section.id}`}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => moveLayoutSection(index, -1)}
                      disabled={index === 0}
                      aria-label={`Mută secțiunea ${section.label} în sus`}
                      data-testid={`button-move-layout-section-up-${section.id}`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => moveLayoutSection(index, 1)}
                      disabled={index === layoutSections.length - 1}
                      aria-label={`Mută secțiunea ${section.label} în jos`}
                      data-testid={`button-move-layout-section-down-${section.id}`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => updateLayoutSection(index, { visible: !section.visible })}
                      aria-label={section.visible ? `Ascunde ${section.label}` : `Arată ${section.label}`}
                      data-testid={`button-toggle-layout-section-${section.id}`}
                    >
                      {section.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    {section.type === 'custom' && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setLayoutSections((current) =>
                            current.filter((_, sectionIndex) => sectionIndex !== index),
                          )
                        }
                        aria-label={`Șterge secțiunea ${section.label}`}
                        data-testid={`button-remove-layout-section-${section.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
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