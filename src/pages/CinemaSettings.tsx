import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload, Building2, Palette, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
});

type CinemaSettingsData = z.infer<typeof cinemaSettingsSchema>;

export default function CinemaSettings() {
  const { data: organization, isLoading } = useOrganization();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CinemaSettingsData>({
    resolver: zodResolver(cinemaSettingsSchema),
    values: organization ? {
      name: organization.name,
      primary_color: organization.primary_color || '#D97706',
      secondary_color: organization.secondary_color || '#1F2937',
      custom_domain: organization.custom_domain || '',
    } : undefined,
  });

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
            Customize your cinema's branding and appearance
          </p>
        </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

        <Button type="submit" disabled={isSubmitting || uploading} className="w-full sm:w-auto">
          {isSubmitting || uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
