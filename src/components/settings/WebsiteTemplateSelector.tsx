import { useState } from 'react';
import { Check, Sparkles, Film, Zap, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    cardBackground: string;
    text: string;
    mutedText: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  style: {
    heroStyle: 'gradient' | 'solid' | 'image-overlay';
    cardStyle: 'flat' | 'elevated' | 'glass';
    buttonStyle: 'rounded' | 'pill' | 'sharp';
    animationLevel: 'subtle' | 'moderate' | 'dynamic';
  };
  previewImage?: string;
}

export const websiteTemplates: WebsiteTemplate[] = [
  {
    id: 'classic-cinema',
    name: 'Classic Cinema',
    description: 'Timeless elegance with gold accents and dark backgrounds. Perfect for traditional movie theaters.',
    icon: Film,
    colors: {
      primary: '#D4AF37', // Gold
      secondary: '#1a1a2e',
      accent: '#C9A227',
      background: '#0a0a0f',
      cardBackground: '#14141f',
      text: '#ffffff',
      mutedText: '#9ca3af',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Inter',
    },
    style: {
      heroStyle: 'gradient',
      cardStyle: 'elevated',
      buttonStyle: 'rounded',
      animationLevel: 'subtle',
    },
  },
  {
    id: 'warm-sunset',
    name: 'Warm Sunset',
    description: 'Inviting coral and orange tones on a dark canvas. Creates a cozy, welcoming atmosphere.',
    icon: Film,
    colors: {
      primary: '#CD7F5C', // Coral/Terracotta
      secondary: '#1f1f1f',
      accent: '#E8956A',
      background: '#0d0d0d',
      cardBackground: '#1a1a1a',
      text: '#ffffff',
      mutedText: '#a3a3a3',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    style: {
      heroStyle: 'image-overlay',
      cardStyle: 'elevated',
      buttonStyle: 'rounded',
      animationLevel: 'moderate',
    },
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean, sleek design with crisp whites and bold contrasts. Ideal for contemporary cinemas.',
    icon: Sparkles,
    colors: {
      primary: '#2563eb', // Blue
      secondary: '#f8fafc',
      accent: '#3b82f6',
      background: '#ffffff',
      cardBackground: '#f1f5f9',
      text: '#0f172a',
      mutedText: '#64748b',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    style: {
      heroStyle: 'solid',
      cardStyle: 'flat',
      buttonStyle: 'pill',
      animationLevel: 'moderate',
    },
  },
  {
    id: 'midnight-royal',
    name: 'Midnight Royal',
    description: 'Deep navy blues with silver accents. Sophisticated and premium feel for upscale venues.',
    icon: Sparkles,
    colors: {
      primary: '#6366f1', // Indigo
      secondary: '#0f172a',
      accent: '#818cf8',
      background: '#020617',
      cardBackground: '#0f172a',
      text: '#f1f5f9',
      mutedText: '#94a3b8',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    style: {
      heroStyle: 'gradient',
      cardStyle: 'glass',
      buttonStyle: 'pill',
      animationLevel: 'subtle',
    },
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    description: 'Vibrant cyberpunk aesthetics with glowing effects. Great for indie and alternative cinemas.',
    icon: Zap,
    colors: {
      primary: '#e11d48', // Rose/Pink
      secondary: '#0f0f23',
      accent: '#8b5cf6', // Purple
      background: '#030712',
      cardBackground: '#111827',
      text: '#f9fafb',
      mutedText: '#9ca3af',
    },
    fonts: {
      heading: 'Orbitron',
      body: 'Inter',
    },
    style: {
      heroStyle: 'image-overlay',
      cardStyle: 'glass',
      buttonStyle: 'sharp',
      animationLevel: 'dynamic',
    },
  },
];

interface TemplateCardProps {
  template: WebsiteTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}

function TemplateCard({ template, isSelected, onSelect, onPreview }: TemplateCardProps) {
  const Icon = template.icon;

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200',
        isSelected
          ? 'border-primary bg-primary/5 shadow-lg'
          : 'border-border hover:border-primary/50 hover:shadow-md'
      )}
      onClick={onSelect}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-4 w-4 text-primary-foreground" />
        </div>
      )}

      {/* Mini Preview */}
      <div
        className="h-32 rounded-lg mb-4 overflow-hidden relative"
        style={{ backgroundColor: template.colors.background }}
      >
        {/* Mock Hero Section */}
        <div
          className="h-16 flex items-center justify-center"
          style={{
            background:
              template.style.heroStyle === 'gradient'
                ? `linear-gradient(135deg, ${template.colors.secondary} 0%, ${template.colors.background} 100%)`
                : template.colors.secondary,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded"
              style={{ backgroundColor: template.colors.primary }}
            />
            <div
              className="h-2 w-16 rounded"
              style={{ backgroundColor: template.colors.text, opacity: 0.7 }}
            />
          </div>
        </div>

        {/* Mock Content */}
        <div className="p-2 flex gap-2">
          <div
            className={cn(
              'h-12 w-10 rounded',
              template.style.cardStyle === 'glass' && 'backdrop-blur'
            )}
            style={{
              backgroundColor: template.colors.cardBackground,
              boxShadow: template.style.cardStyle === 'elevated' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
            }}
          />
          <div
            className={cn(
              'h-12 w-10 rounded',
              template.style.cardStyle === 'glass' && 'backdrop-blur'
            )}
            style={{
              backgroundColor: template.colors.cardBackground,
              boxShadow: template.style.cardStyle === 'elevated' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
            }}
          />
          <div
            className={cn(
              'h-12 w-10 rounded',
              template.style.cardStyle === 'glass' && 'backdrop-blur'
            )}
            style={{
              backgroundColor: template.colors.cardBackground,
              boxShadow: template.style.cardStyle === 'elevated' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
            }}
          />
        </div>

        {/* Accent bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: template.colors.primary }}
        />
      </div>

      {/* Template Info */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm">{template.name}</h4>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {template.description}
        </p>

        {/* Color Swatches */}
        <div className="flex items-center gap-1.5 pt-2">
          <div
            className="h-5 w-5 rounded-full border border-border"
            style={{ backgroundColor: template.colors.primary }}
            title="Primary"
          />
          <div
            className="h-5 w-5 rounded-full border border-border"
            style={{ backgroundColor: template.colors.secondary }}
            title="Secondary"
          />
          <div
            className="h-5 w-5 rounded-full border border-border"
            style={{ backgroundColor: template.colors.accent }}
            title="Accent"
          />
          <div
            className="h-5 w-5 rounded-full border border-border"
            style={{ backgroundColor: template.colors.background }}
            title="Background"
          />
        </div>

        {/* Preview Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
        >
          <Eye className="h-3 w-3 mr-1" />
          Preview
        </Button>
      </div>
    </div>
  );
}

interface TemplatePreviewDialogProps {
  template: WebsiteTemplate;
  cinemaName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TemplatePreviewDialog({ template, cinemaName, open, onOpenChange }: TemplatePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <template.icon className="h-5 w-5" />
            {template.name} Preview
          </DialogTitle>
        </DialogHeader>

        {/* Full Preview */}
        <div
          className="min-h-[500px] overflow-hidden"
          style={{ backgroundColor: template.colors.background }}
        >
          {/* Hero Section */}
          <div
            className="h-64 relative flex flex-col items-center justify-center text-center px-4"
            style={{
              background:
                template.style.heroStyle === 'gradient'
                  ? `linear-gradient(180deg, ${template.colors.secondary} 0%, ${template.colors.background} 100%)`
                  : template.colors.secondary,
            }}
          >
            {/* Logo/Name */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={cn(
                  'h-12 w-12 flex items-center justify-center',
                  template.style.buttonStyle === 'pill' ? 'rounded-full' : 'rounded-lg'
                )}
                style={{ backgroundColor: template.colors.primary }}
              >
                <Film className="h-6 w-6" style={{ color: template.colors.text }} />
              </div>
              <span
                className="text-2xl font-bold"
                style={{
                  color: template.colors.text,
                  fontFamily: template.fonts.heading,
                }}
              >
                {cinemaName || 'Your Cinema'}
              </span>
            </div>

            {/* Tagline */}
            <p
              className="text-lg mb-6"
              style={{ color: template.colors.mutedText }}
            >
              Experience movies like never before
            </p>

            {/* CTA Buttons */}
            <div className="flex gap-3">
              <button
                className={cn(
                  'px-6 py-3 font-medium transition-transform hover:scale-105',
                  template.style.buttonStyle === 'pill' && 'rounded-full',
                  template.style.buttonStyle === 'rounded' && 'rounded-lg',
                  template.style.buttonStyle === 'sharp' && 'rounded-none'
                )}
                style={{
                  backgroundColor: template.colors.primary,
                  color: template.colors.background,
                }}
              >
                Book Now
              </button>
              <button
                className={cn(
                  'px-6 py-3 font-medium border transition-transform hover:scale-105',
                  template.style.buttonStyle === 'pill' && 'rounded-full',
                  template.style.buttonStyle === 'rounded' && 'rounded-lg',
                  template.style.buttonStyle === 'sharp' && 'rounded-none'
                )}
                style={{
                  borderColor: `${template.colors.text}40`,
                  color: template.colors.text,
                  backgroundColor: 'transparent',
                }}
              >
                View Schedule
              </button>
            </div>
          </div>

          {/* Movies Section */}
          <div className="p-6">
            <h3
              className="text-xl font-bold mb-4"
              style={{
                color: template.colors.text,
                fontFamily: template.fonts.heading,
              }}
            >
              Now Showing
            </h3>

            {/* Movie Cards */}
            <div className="grid grid-cols-4 gap-4">
              {['Action Movie', 'Romance Film', 'Sci-Fi Epic', 'Comedy Hit'].map((title, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg overflow-hidden',
                    template.style.cardStyle === 'glass' && 'backdrop-blur border',
                    template.style.cardStyle === 'elevated' && 'shadow-xl'
                  )}
                  style={{
                    backgroundColor:
                      template.style.cardStyle === 'glass'
                        ? `${template.colors.cardBackground}80`
                        : template.colors.cardBackground,
                    borderColor: template.style.cardStyle === 'glass' ? `${template.colors.text}20` : 'transparent',
                  }}
                >
                  {/* Poster Placeholder */}
                  <div
                    className="aspect-[2/3] relative"
                    style={{
                      background: `linear-gradient(135deg, ${template.colors.primary}40 0%, ${template.colors.accent}40 100%)`,
                    }}
                  >
                    <Film
                      className="absolute inset-0 m-auto h-8 w-8"
                      style={{ color: template.colors.mutedText }}
                    />
                  </div>
                  <div className="p-3">
                    <h4
                      className="font-medium text-sm truncate"
                      style={{ color: template.colors.text }}
                    >
                      {title}
                    </h4>
                    <div className="flex gap-1 mt-2">
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs',
                          template.style.buttonStyle === 'pill' && 'rounded-full',
                          template.style.buttonStyle === 'rounded' && 'rounded',
                          template.style.buttonStyle === 'sharp' && 'rounded-none'
                        )}
                        style={{
                          backgroundColor: template.colors.primary,
                          color: template.colors.background,
                        }}
                      >
                        7:00 PM
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs border',
                          template.style.buttonStyle === 'pill' && 'rounded-full',
                          template.style.buttonStyle === 'rounded' && 'rounded',
                          template.style.buttonStyle === 'sharp' && 'rounded-none'
                        )}
                        style={{
                          borderColor: `${template.colors.text}30`,
                          color: template.colors.mutedText,
                        }}
                      >
                        9:30 PM
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface WebsiteTemplateSelectorProps {
  selectedTemplateId: string | null;
  onSelect: (template: WebsiteTemplate) => void;
  cinemaName: string;
}

export function WebsiteTemplateSelector({
  selectedTemplateId,
  onSelect,
  cinemaName,
}: WebsiteTemplateSelectorProps) {
  const [previewTemplate, setPreviewTemplate] = useState<WebsiteTemplate | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Website Template
        </CardTitle>
        <CardDescription>
          Choose a pre-built theme for your public booking website. You can customize colors after selecting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {websiteTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedTemplateId === template.id}
              onSelect={() => onSelect(template)}
              onPreview={() => setPreviewTemplate(template)}
            />
          ))}
        </div>

        {selectedTemplateId && (
          <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Tip:</span> After selecting a template, 
              you can still customize the primary and secondary colors below to match your brand.
            </p>
          </div>
        )}

        {previewTemplate && (
          <TemplatePreviewDialog
            template={previewTemplate}
            cinemaName={cinemaName}
            open={!!previewTemplate}
            onOpenChange={(open) => !open && setPreviewTemplate(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
