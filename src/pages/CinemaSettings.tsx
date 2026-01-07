import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload, Building2, Palette, Save, Globe, CreditCard, Share2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
  payment_gateway: z.enum(['none', 'stripe', 'flutterwave', 'paystack']),
  payment_gateway_public_key: z.string().optional(),
});

type CinemaSettingsData = z.infer<typeof cinemaSettingsSchema>;

const paymentGatewayInfo = {
  none: { label: 'No Payment Gateway', description: 'Customers cannot pay online' },
  stripe: { label: 'Stripe', description: 'Accept payments worldwide with cards, Apple Pay, Google Pay' },
  flutterwave: { label: 'Flutterwave', description: 'Popular in Africa - cards, mobile money, bank transfers' },
  paystack: { label: 'Paystack', description: 'Nigerian & Ghanaian payments - cards, bank, USSD' },
};

export default function CinemaSettings() {
  const { data: organization, isLoading } = useOrganization();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

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
          payment_gateway_configured: data.payment_gateway !== 'none' && !!data.payment_gateway_public_key,
        })
        .eq('id', organization.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['organization'] });
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="website">Website</TabsTrigger>
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

                  <div className="space-y-2">
                    <Label htmlFor="custom_domain">Custom Domain (optional)</Label>
                    <Input
                      id="custom_domain"
                      placeholder="booking.yourcinema.com"
                      {...register('custom_domain')}
                    />
                    <p className="text-xs text-muted-foreground">
                      Current URL: <span className="font-mono text-primary">{organization.slug}.cinetix.com</span>
                    </p>
                  </div>
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
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="primary_color">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          id="primary_color"
                          {...register('primary_color')}
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          {...register('primary_color')}
                          placeholder="#D97706"
                          className="flex-1 font-mono"
                        />
                      </div>
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
                          {...register('secondary_color')}
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          {...register('secondary_color')}
                          placeholder="#1F2937"
                          className="flex-1 font-mono"
                        />
                      </div>
                      {errors.secondary_color && (
                        <p className="text-sm text-destructive">{errors.secondary_color.message}</p>
                      )}
                    </div>
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
                      onValueChange={(value) => setValue('payment_gateway', value as any)}
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
                    <div className="space-y-4 pt-4 border-t">
                      <Alert>
                        <AlertDescription>
                          Enter your <strong>publishable/public</strong> key. Never share your secret key here.
                          The secret key should be configured in your edge function secrets.
                        </AlertDescription>
                      </Alert>

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
                            selectedGateway === 'stripe' ? 'pk_test_...' :
                            selectedGateway === 'flutterwave' ? 'FLWPUBK_TEST-...' :
                            'pk_test_...'
                          }
                          className="font-mono"
                        />
                      </div>

                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Setup Instructions:</p>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          {selectedGateway === 'stripe' && (
                            <>
                              <li>Create an account at <a href="https://stripe.com" target="_blank" className="text-primary hover:underline">stripe.com</a></li>
                              <li>Get your publishable key from the Dashboard → Developers → API keys</li>
                              <li>Enter the key above and save</li>
                            </>
                          )}
                          {selectedGateway === 'flutterwave' && (
                            <>
                              <li>Create an account at <a href="https://flutterwave.com" target="_blank" className="text-primary hover:underline">flutterwave.com</a></li>
                              <li>Get your public key from Settings → API Keys</li>
                              <li>Enter the key above and save</li>
                            </>
                          )}
                          {selectedGateway === 'paystack' && (
                            <>
                              <li>Create an account at <a href="https://paystack.com" target="_blank" className="text-primary hover:underline">paystack.com</a></li>
                              <li>Get your public key from Settings → API Keys & Webhooks</li>
                              <li>Enter the key above and save</li>
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
