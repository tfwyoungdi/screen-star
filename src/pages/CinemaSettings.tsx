import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload, Building2, Palette, Save, Globe, CreditCard, Share2, Search, CheckCircle, XCircle, AlertTriangle, Copy, ExternalLink, FileText, Briefcase, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AboutPageSettings } from '@/components/settings/AboutPageSettings';
import { JobListingsSettings } from '@/components/settings/JobListingsSettings';
import EmailTemplatesSettings from '@/components/settings/EmailTemplatesSettings';
import { useOrganization } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const cinemaSettingsSchema = z.object({
  name: z.string().min(2, 'Cinema name must be at least 2 characters'),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  custom_domain: z.string().optional(),
  about_text: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  social_facebook: z.string().url().optional().or(z.literal('')),
  social_instagram: z.string().url().optional().or(z.literal('')),
  social_twitter: z.string().url().optional().or(z.literal('')),
  seo_title: z.string().max(60).optional(),
  seo_description: z.string().max(160).optional(),
  payment_gateway: z.enum(['none', 'stripe', 'flutterwave', 'paystack', 'nomba']),
  payment_gateway_public_key: z.string().optional(),
  payment_gateway_secret_key: z.string().optional(),
});

type CinemaSettingsData = z.infer<typeof cinemaSettingsSchema>;

const paymentGatewayInfo = {
  none: { label: 'No Payment Gateway', description: 'Customers cannot pay online' },
  stripe: { label: 'Stripe', description: 'Accept payments worldwide with cards, Apple Pay, Google Pay' },
  flutterwave: { label: 'Flutterwave', description: 'Popular in Africa - cards, mobile money, bank transfers' },
  paystack: { label: 'Paystack', description: 'Nigerian & Ghanaian payments - cards, bank, USSD' },
  nomba: { label: 'Nomba', description: 'Nigerian payments - cards, transfers, POS integration' },
};

export default function CinemaSettings() {
  const { data: organization, isLoading } = useOrganization();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validatingKeys, setValidatingKeys] = useState(false);
  const [keyValidation, setKeyValidation] = useState<{ valid: boolean; message: string; isTestMode?: boolean } | null>(null);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [domainVerification, setDomainVerification] = useState<{ 
    verified: boolean; 
    status: string; 
    message: string; 
    details: string;
    records?: { cname: string[]; a: string[] };
    ssl?: { valid: boolean; issuer?: string; error?: string };
  } | null>(null);
  const queryClient = useQueryClient();

  const webhookUrl = `https://immqqxnblovkdvokfbef.supabase.co/functions/v1/payment-webhook`;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CinemaSettingsData>({
    resolver: zodResolver(cinemaSettingsSchema),
    values: organization ? {
      name: organization.name,
      primary_color: organization.primary_color || '#D97706',
      secondary_color: organization.secondary_color || '#1F2937',
      custom_domain: organization.custom_domain || '',
      about_text: (organization as any).about_text || '',
      contact_email: (organization as any).contact_email || '',
      contact_phone: (organization as any).contact_phone || '',
      address: (organization as any).address || '',
      social_facebook: (organization as any).social_facebook || '',
      social_instagram: (organization as any).social_instagram || '',
      social_twitter: (organization as any).social_twitter || '',
      seo_title: (organization as any).seo_title || '',
      seo_description: (organization as any).seo_description || '',
      payment_gateway: (organization as any).payment_gateway || 'none',
      payment_gateway_public_key: (organization as any).payment_gateway_public_key || '',
      payment_gateway_secret_key: (organization as any).payment_gateway_secret_key || '',
    } : undefined,
  });

  const selectedGateway = watch('payment_gateway');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo must be less than 2MB');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !organization) return null;
    
    setUploading(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const filePath = `${organization.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('cinema-logos')
        .upload(filePath, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cinema-logos')
        .getPublicUrl(filePath);

      return publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const validatePaymentKeys = async () => {
    const publicKey = watch('payment_gateway_public_key');
    const secretKey = watch('payment_gateway_secret_key');
    const gateway = watch('payment_gateway');

    if (!publicKey || !secretKey || gateway === 'none') {
      toast.error('Please enter both public and secret keys');
      return;
    }

    setValidatingKeys(true);
    setKeyValidation(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-payment-keys', {
        body: { gateway, publicKey, secretKey },
      });

      if (error) throw error;

      setKeyValidation(data);
      
      if (data.valid) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      toast.error('Failed to validate keys');
      setKeyValidation({ valid: false, message: 'Failed to validate keys' });
    } finally {
      setValidatingKeys(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const verifyDomain = async () => {
    const domain = watch('custom_domain');
    
    if (!domain) {
      toast.error('Please enter a domain first');
      return;
    }

    setVerifyingDomain(true);
    setDomainVerification(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-domain', {
        body: { domain },
      });

      if (error) throw error;

      setDomainVerification(data);
      
      if (data.verified) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      console.error('Domain verification error:', error);
      toast.error('Failed to verify domain');
      setDomainVerification({ 
        verified: false, 
        status: 'error',
        message: 'Verification failed',
        details: error.message || 'Unknown error'
      });
    } finally {
      setVerifyingDomain(false);
    }
  };

  const onSubmit = async (data: CinemaSettingsData) => {
    if (!organization) return;

    try {
      let logoUrl = organization.logo_url;
      
      if (logoFile) {
        const newLogoUrl = await uploadLogo();
        if (newLogoUrl) logoUrl = newLogoUrl;
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          name: data.name,
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
          custom_domain: data.custom_domain || null,
          logo_url: logoUrl,
          about_text: data.about_text || null,
          contact_email: data.contact_email || null,
          contact_phone: data.contact_phone || null,
          address: data.address || null,
          social_facebook: data.social_facebook || null,
          social_instagram: data.social_instagram || null,
          social_twitter: data.social_twitter || null,
          seo_title: data.seo_title || null,
          seo_description: data.seo_description || null,
          payment_gateway: data.payment_gateway,
          payment_gateway_public_key: data.payment_gateway_public_key || null,
          payment_gateway_secret_key: data.payment_gateway_secret_key || null,
          payment_gateway_configured: data.payment_gateway !== 'none' && !!data.payment_gateway_public_key && !!data.payment_gateway_secret_key,
        })
        .eq('id', organization.id);

      if (error) throw error;

      // Invalidate caches to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['organization', organization.id] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Cinema settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!organization) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertDescription>Organization not found.</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cinema Settings</h1>
          <p className="text-muted-foreground">
            Customize your cinema's branding, website, and payment settings
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="branding" className="space-y-6">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="website">Website</TabsTrigger>
              <TabsTrigger value="about">Mission</TabsTrigger>
              <TabsTrigger value="jobs">Job Listings</TabsTrigger>
              <TabsTrigger value="emails">
                <Mail className="h-4 w-4 mr-1" />
                Emails
              </TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-6">
              {/* Logo Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Cinema Logo
                  </CardTitle>
                  <CardDescription>
                    Upload your cinema's logo (max 2MB, recommended 400x400px)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted">
                      {logoPreview || organization.logo_url ? (
                        <img
                          src={logoPreview || organization.logo_url || ''}
                          alt="Cinema logo"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="w-auto"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Business Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Cinema Name</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                </CardContent>
              </Card>

              {/* Custom Domain */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Custom Domain
                  </CardTitle>
                  <CardDescription>
                    Connect your own domain to your cinema's booking website
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom_domain">Your Domain</Label>
                    <div className="flex gap-2">
                      <Input
                        id="custom_domain"
                        placeholder="booking.yourcinema.com"
                        {...register('custom_domain')}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={verifyDomain}
                        disabled={verifyingDomain || !watch('custom_domain')}
                      >
                        {verifyingDomain ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Search className="h-4 w-4 mr-2" />
                        )}
                        Verify DNS
                      </Button>
                    </div>
                  </div>

                  {/* Verification Status */}
                  {domainVerification && (
                    <div className="space-y-3">
                      {/* DNS Status */}
                      <div className={`rounded-lg border p-4 ${
                        domainVerification.verified 
                          ? 'border-green-500/50 bg-green-500/10' 
                          : 'border-yellow-500/50 bg-yellow-500/10'
                      }`}>
                        <div className="flex items-start gap-3">
                          {domainVerification.verified ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                          )}
                          <div className="flex-1 space-y-1">
                            <p className={`font-medium ${domainVerification.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                              DNS: {domainVerification.message}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {domainVerification.details}
                            </p>
                            {domainVerification.records && (domainVerification.records.cname.length > 0 || domainVerification.records.a.length > 0) && (
                              <div className="mt-2 text-xs font-mono bg-muted/50 rounded p-2">
                                {domainVerification.records.cname.length > 0 && (
                                  <div>CNAME: {domainVerification.records.cname.join(', ')}</div>
                                )}
                                {domainVerification.records.a.length > 0 && (
                                  <div>A: {domainVerification.records.a.join(', ')}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* SSL Status */}
                      {domainVerification.ssl && (
                        <div className={`rounded-lg border p-4 ${
                          domainVerification.ssl.valid 
                            ? 'border-green-500/50 bg-green-500/10' 
                            : 'border-orange-500/50 bg-orange-500/10'
                        }`}>
                          <div className="flex items-start gap-3">
                            {domainVerification.ssl.valid ? (
                              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                            )}
                            <div className="flex-1 space-y-1">
                              <p className={`font-medium ${domainVerification.ssl.valid ? 'text-green-600' : 'text-orange-600'}`}>
                                SSL/HTTPS: {domainVerification.ssl.valid ? 'Certificate Valid' : 'Not Ready'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {domainVerification.ssl.valid 
                                  ? 'Your domain is secured with HTTPS. Visitors will see a secure padlock icon.'
                                  : domainVerification.ssl.error || 'SSL certificate is not yet configured. This may take up to 24 hours after DNS is verified.'}
                              </p>
                              {domainVerification.ssl.valid && domainVerification.ssl.issuer && (
                                <div className="mt-2 text-xs font-mono bg-muted/50 rounded p-2">
                                  Issuer: {domainVerification.ssl.issuer}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                    <p className="text-sm font-medium">Current URLs:</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Default</Badge>
                        <code className="text-sm text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {window.location.origin}/cinema/{organization.slug}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`${window.location.origin}/cinema/${organization.slug}`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {watch('custom_domain') && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">Custom</Badge>
                          <code className="text-sm text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {watch('custom_domain')}
                          </code>
                          {domainVerification?.verified && (
                            <Badge className="bg-green-500/20 text-green-600 text-xs">Verified</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {watch('custom_domain') && !domainVerification?.verified && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="space-y-3">
                        <p className="font-medium">DNS Setup Required</p>
                        <p className="text-sm">Add these DNS records at your domain provider:</p>
                        <div className="bg-muted rounded-md p-3 space-y-2 text-sm font-mono">
                          <div className="grid grid-cols-3 gap-2">
                            <span className="text-muted-foreground">Type</span>
                            <span className="text-muted-foreground">Name</span>
                            <span className="text-muted-foreground">Value</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <span>CNAME</span>
                            <span>{watch('custom_domain')?.split('.')[0] || '@'}</span>
                            <span>cinetix.app</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          DNS changes can take up to 48 hours to propagate. Click "Verify DNS" to check your configuration.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Brand Colors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Brand Colors
                  </CardTitle>
                  <CardDescription>
                    Customize colors for your public booking website
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="primary_color">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          id="primary_color"
                          value={watch('primary_color') || '#D97706'}
                          onChange={(e) => setValue('primary_color', e.target.value, { shouldDirty: true, shouldValidate: true })}
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          {...register('primary_color')}
                          placeholder="#D97706"
                          className="flex-1 font-mono"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Used for buttons, links, and highlights</p>
                      {errors.primary_color && (
                        <p className="text-sm text-destructive">{errors.primary_color.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondary_color">Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          id="secondary_color"
                          value={watch('secondary_color') || '#1F2937'}
                          onChange={(e) => setValue('secondary_color', e.target.value, { shouldDirty: true, shouldValidate: true })}
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          {...register('secondary_color')}
                          placeholder="#1F2937"
                          className="flex-1 font-mono"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Used for backgrounds and accents</p>
                      {errors.secondary_color && (
                        <p className="text-sm text-destructive">{errors.secondary_color.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="space-y-3">
                    <Label>Live Preview</Label>
                    <div 
                      className="rounded-lg border border-border overflow-hidden"
                      style={{ backgroundColor: watch('secondary_color') || '#1F2937' }}
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          {logoPreview || organization.logo_url ? (
                            <img
                              src={logoPreview || organization.logo_url || ''}
                              alt="Logo"
                              className="h-8 w-8 rounded object-cover"
                            />
                          ) : (
                            <div 
                              className="h-8 w-8 rounded flex items-center justify-center"
                              style={{ backgroundColor: watch('primary_color') || '#D97706' }}
                            >
                              <Building2 className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <span className="text-white font-semibold">{watch('name') || organization.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="px-4 py-2 rounded-md text-sm font-medium text-black"
                            style={{ backgroundColor: watch('primary_color') || '#D97706' }}
                          >
                            Book Tickets
                          </button>
                          <button
                            type="button"
                            className="px-4 py-2 rounded-md text-sm font-medium text-white border border-white/30"
                          >
                            View Trailer
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <span 
                            className="px-3 py-1 rounded-full text-xs text-black"
                            style={{ backgroundColor: watch('primary_color') || '#D97706' }}
                          >
                            Today
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs text-white/70 border border-white/20">
                            Tomorrow
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This is how your colors will appear on the public booking website
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Website Tab */}
            <TabsContent value="website" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Website Content
                  </CardTitle>
                  <CardDescription>
                    Information displayed on your public booking website
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="about_text">About Your Cinema</Label>
                    <Textarea
                      id="about_text"
                      {...register('about_text')}
                      placeholder="Tell customers about your cinema, its history, amenities..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        {...register('contact_email')}
                        placeholder="info@yourcinema.com"
                      />
                      {errors.contact_email && (
                        <p className="text-sm text-destructive">{errors.contact_email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Contact Phone</Label>
                      <Input
                        id="contact_phone"
                        type="tel"
                        {...register('contact_phone')}
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      {...register('address')}
                      placeholder="123 Cinema Street, City, Country"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* About Page Tab */}
            <TabsContent value="about">
              <AboutPageSettings organization={organization as any} />
            </TabsContent>

            {/* Job Listings Tab */}
            <TabsContent value="jobs">
              <JobListingsSettings organizationId={organization.id} />
            </TabsContent>

            {/* Email Templates Tab */}
            <TabsContent value="emails">
              <EmailTemplatesSettings />
            </TabsContent>

            {/* Social Tab */}
            <TabsContent value="social" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Social Media Links
                  </CardTitle>
                  <CardDescription>
                    Connect your social media profiles
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="social_facebook">Facebook</Label>
                    <Input
                      id="social_facebook"
                      {...register('social_facebook')}
                      placeholder="https://facebook.com/yourcinema"
                    />
                    {errors.social_facebook && (
                      <p className="text-sm text-destructive">Please enter a valid URL</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="social_instagram">Instagram</Label>
                    <Input
                      id="social_instagram"
                      {...register('social_instagram')}
                      placeholder="https://instagram.com/yourcinema"
                    />
                    {errors.social_instagram && (
                      <p className="text-sm text-destructive">Please enter a valid URL</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="social_twitter">Twitter / X</Label>
                    <Input
                      id="social_twitter"
                      {...register('social_twitter')}
                      placeholder="https://twitter.com/yourcinema"
                    />
                    {errors.social_twitter && (
                      <p className="text-sm text-destructive">Please enter a valid URL</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SEO Tab */}
            <TabsContent value="seo" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Search Engine Optimization
                  </CardTitle>
                  <CardDescription>
                    Improve how your cinema appears in search results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seo_title">SEO Title (max 60 characters)</Label>
                    <Input
                      id="seo_title"
                      {...register('seo_title')}
                      placeholder="Your Cinema - Book Movie Tickets Online"
                      maxLength={60}
                    />
                    <p className="text-xs text-muted-foreground">
                      {watch('seo_title')?.length || 0}/60 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo_description">SEO Description (max 160 characters)</Label>
                    <Textarea
                      id="seo_description"
                      {...register('seo_description')}
                      placeholder="Book movie tickets online at Your Cinema. Experience the latest blockbusters with premium sound and seating."
                      maxLength={160}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {watch('seo_description')?.length || 0}/160 characters
                    </p>
                  </div>

                  {/* SEO Preview */}
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">Search Result Preview:</p>
                    <p className="text-primary text-lg font-medium truncate">
                      {watch('seo_title') || organization.name}
                    </p>
                    <p className="text-sm text-green-600 truncate">
                      {organization.slug}.cinetix.com
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {watch('seo_description') || 'Book movie tickets online'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Gateway
                  </CardTitle>
                  <CardDescription>
                    Configure how customers pay for tickets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Select Payment Provider</Label>
                    <Select
                      value={selectedGateway}
                      onValueChange={(value) => {
                        setValue('payment_gateway', value as any);
                        setKeyValidation(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(paymentGatewayInfo).map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <span>{info.label}</span>
                              {key !== 'none' && (
                                <Badge variant="secondary" className="text-xs">
                                  {key === 'stripe' ? 'Global' : 'Africa'}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {paymentGatewayInfo[selectedGateway as keyof typeof paymentGatewayInfo]?.description}
                    </p>
                  </div>

                  {selectedGateway !== 'none' && (
                    <div className="space-y-6 pt-4 border-t">
                      {/* Test/Live Mode Indicator */}
                      {keyValidation?.isTestMode !== undefined && (
                        <Alert className={keyValidation.isTestMode ? 'border-amber-500 bg-amber-500/10' : 'border-green-500 bg-green-500/10'}>
                          <AlertTriangle className={`h-4 w-4 ${keyValidation.isTestMode ? 'text-amber-500' : 'text-green-500'}`} />
                          <AlertDescription className="flex items-center justify-between">
                            <span>
                              <strong>{keyValidation.isTestMode ? '⚠️ Test Mode' : '✅ Live Mode'}:</strong>{' '}
                              {keyValidation.isTestMode 
                                ? 'Payments will use test credentials. No real money will be charged.'
                                : 'Payments are live. Real transactions will be processed.'
                              }
                            </span>
                            <Badge variant={keyValidation.isTestMode ? 'secondary' : 'default'}>
                              {keyValidation.isTestMode ? 'TEST' : 'LIVE'}
                            </Badge>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* API Keys */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="payment_gateway_public_key">
                            {selectedGateway === 'stripe' && 'Stripe Publishable Key (pk_...)'}
                            {selectedGateway === 'flutterwave' && 'Flutterwave Public Key (FLWPUBK_...)'}
                            {selectedGateway === 'paystack' && 'Paystack Public Key (pk_...)'}
                          </Label>
                          <Input
                            id="payment_gateway_public_key"
                            {...register('payment_gateway_public_key')}
                            placeholder={
                              selectedGateway === 'stripe' ? 'pk_test_... or pk_live_...' :
                              selectedGateway === 'flutterwave' ? 'FLWPUBK_TEST-... or FLWPUBK-...' :
                              'pk_test_... or pk_live_...'
                            }
                            className="font-mono"
                            onChange={() => setKeyValidation(null)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Use <code className="bg-muted px-1 rounded">pk_test_</code> for testing or <code className="bg-muted px-1 rounded">pk_live_</code> for production
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="payment_gateway_secret_key">
                            {selectedGateway === 'stripe' && 'Stripe Secret Key (sk_...)'}
                            {selectedGateway === 'flutterwave' && 'Flutterwave Secret Key (FLWSECK_...)'}
                            {selectedGateway === 'paystack' && 'Paystack Secret Key (sk_...)'}
                          </Label>
                          <Input
                            id="payment_gateway_secret_key"
                            type="password"
                            {...register('payment_gateway_secret_key')}
                            placeholder={
                              selectedGateway === 'stripe' ? 'sk_test_... or sk_live_...' :
                              selectedGateway === 'flutterwave' ? 'FLWSECK_TEST-... or FLWSECK-...' :
                              'sk_test_... or sk_live_...'
                            }
                            className="font-mono"
                            onChange={() => setKeyValidation(null)}
                          />
                          <p className="text-xs text-muted-foreground">
                            This key is kept secure and only used server-side for processing payments
                          </p>
                        </div>

                        {/* Validate Keys Button */}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={validatePaymentKeys}
                          disabled={validatingKeys}
                          className="w-full"
                        >
                          {validatingKeys ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Validating Keys...
                            </>
                          ) : keyValidation?.valid ? (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                              Keys Validated
                            </>
                          ) : keyValidation?.valid === false ? (
                            <>
                              <XCircle className="mr-2 h-4 w-4 text-red-500" />
                              Validation Failed - Click to Retry
                            </>
                          ) : (
                            'Validate API Keys'
                          )}
                        </Button>

                        {keyValidation && (
                          <Alert variant={keyValidation.valid ? 'default' : 'destructive'}>
                            <AlertDescription className="flex items-center gap-2">
                              {keyValidation.valid ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              {keyValidation.message}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      {/* Webhook Configuration */}
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            🔗 Webhook Configuration
                          </CardTitle>
                          <CardDescription>
                            Configure this webhook URL in your payment provider's dashboard to receive payment notifications
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Webhook URL</Label>
                            <div className="flex gap-2">
                              <Input
                                value={webhookUrl}
                                readOnly
                                className="font-mono text-sm bg-background"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(webhookUrl)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-medium">Setup Instructions:</p>
                            {selectedGateway === 'stripe' && (
                              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                                <li>Go to <a href="https://dashboard.stripe.com/webhooks" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">Stripe Webhooks Dashboard <ExternalLink className="h-3 w-3" /></a></li>
                                <li>Click "Add endpoint" and paste the webhook URL above</li>
                                <li>Select events: <code className="bg-background px-1 rounded text-xs">checkout.session.completed</code>, <code className="bg-background px-1 rounded text-xs">payment_intent.succeeded</code></li>
                                <li>Copy the Webhook Signing Secret and store it securely</li>
                              </ol>
                            )}
                            {selectedGateway === 'flutterwave' && (
                              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                                <li>Go to <a href="https://dashboard.flutterwave.com/settings/webhooks" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">Flutterwave Webhooks <ExternalLink className="h-3 w-3" /></a></li>
                                <li>Paste the webhook URL in the "Webhook URL" field</li>
                                <li>Copy your Secret Hash for verification</li>
                                <li>Save the settings</li>
                              </ol>
                            )}
                            {selectedGateway === 'paystack' && (
                              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                                <li>Go to <a href="https://dashboard.paystack.com/#/settings/developer" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">Paystack Settings <ExternalLink className="h-3 w-3" /></a></li>
                                <li>Scroll to "API Keys & Webhooks" section</li>
                                <li>Paste the webhook URL in the "Webhook URL" field</li>
                                <li>The secret key is used for signature verification</li>
                              </ol>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Security Note */}
                      <Alert>
                        <AlertDescription>
                          <strong>🔒 Security Note:</strong> Your secret key is stored securely and never exposed to the frontend.
                          It is only used by our secure payment processing server.
                        </AlertDescription>
                      </Alert>

                      {/* Setup Instructions */}
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Getting Your API Keys:</p>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          {selectedGateway === 'stripe' && (
                            <>
                              <li>Create an account at <a href="https://stripe.com" target="_blank" className="text-primary hover:underline">stripe.com</a></li>
                              <li>Go to Dashboard → Developers → API keys</li>
                              <li>Copy both your Publishable key (pk_...) and Secret key (sk_...)</li>
                              <li>For testing, use keys starting with <code className="bg-background px-1 rounded">_test_</code></li>
                            </>
                          )}
                          {selectedGateway === 'flutterwave' && (
                            <>
                              <li>Create an account at <a href="https://flutterwave.com" target="_blank" className="text-primary hover:underline">flutterwave.com</a></li>
                              <li>Go to Settings → API Keys</li>
                              <li>Copy both your Public key (FLWPUBK_...) and Secret key (FLWSECK_...)</li>
                              <li>For testing, use keys containing <code className="bg-background px-1 rounded">TEST</code></li>
                            </>
                          )}
                          {selectedGateway === 'paystack' && (
                            <>
                              <li>Create an account at <a href="https://paystack.com" target="_blank" className="text-primary hover:underline">paystack.com</a></li>
                              <li>Go to Settings → API Keys & Webhooks</li>
                              <li>Copy both your Public key (pk_...) and Secret key (sk_...)</li>
                              <li>For testing, use keys starting with <code className="bg-background px-1 rounded">_test_</code></li>
                            </>
                          )}
                        </ol>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <Button type="submit" disabled={isSubmitting || uploading} className="w-full sm:w-auto">
              {isSubmitting || uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save All Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
