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
    id: 'cinema-carousel',
    name: 'Cinema Carousel',
    description: 'Full-width hero carousel with movie spotlight, dotted accents, and a clean white movie grid. Inspired by premium theater websites.',
    icon: Film,
    colors: {
      primary: '#C87B56', // Coral/Terracotta
      secondary: '#0a0a0a',
      accent: '#D4956E',
      background: '#000000',
      cardBackground: '#ffffff',
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
            className="h-72 relative flex flex-col justify-center px-8"
            style={{
              background:
                template.style.heroStyle === 'gradient'
                  ? `linear-gradient(180deg, ${template.colors.secondary} 0%, ${template.colors.background} 100%)`
                  : template.style.heroStyle === 'image-overlay'
                  ? `linear-gradient(90deg, ${template.colors.background}ee 0%, ${template.colors.background}88 50%, transparent 100%), linear-gradient(180deg, ${template.colors.secondary}40 0%, ${template.colors.secondary} 100%)`
                  : template.colors.secondary,
            }}
          >
            {/* Carousel arrows for cinema-carousel template */}
            {template.id === 'cinema-carousel' && (
              <>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/30 flex items-center justify-center">
                  <span style={{ color: template.colors.text }}>‹</span>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/30 flex items-center justify-center">
                  <span style={{ color: template.colors.text }}>›</span>
                </div>
              </>
            )}

            {/* Hero Content */}
            <div className="max-w-lg">
              {/* Category Label */}
              <span
                className="text-sm font-medium italic"
                style={{ color: template.colors.primary }}
              >
                Adventure Movie
              </span>

              {/* Movie Title */}
              <h2
                className="text-4xl font-bold mt-2 mb-3"
                style={{
                  color: template.colors.text,
                  fontFamily: template.fonts.heading,
                }}
              >
                {cinemaName || 'Featured Film'}
              </h2>

              {/* Description */}
              <p
                className="text-sm mb-6 leading-relaxed"
                style={{ color: template.colors.mutedText }}
              >
                Experience movies like never before at your local cinema. Book your tickets today.
              </p>

              {/* CTA Buttons */}
              <div className="flex gap-3">
                <button
                  className={cn(
                    'px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition-transform hover:scale-105',
                    template.style.buttonStyle === 'pill' && 'rounded-full',
                    template.style.buttonStyle === 'rounded' && 'rounded-md',
                    template.style.buttonStyle === 'sharp' && 'rounded-none'
                  )}
                  style={{
                    backgroundColor: template.colors.primary,
                    color: '#ffffff',
                  }}
                >
                  <span>◉</span> More Info
                </button>
                <button
                  className={cn(
                    'px-5 py-2.5 text-sm font-medium border flex items-center gap-2 transition-transform hover:scale-105',
                    template.style.buttonStyle === 'pill' && 'rounded-full',
                    template.style.buttonStyle === 'rounded' && 'rounded-md',
                    template.style.buttonStyle === 'sharp' && 'rounded-none'
                  )}
                  style={{
                    borderColor: template.colors.text,
                    color: template.colors.text,
                    backgroundColor: 'transparent',
                  }}
                >
                  <span>◉</span> Get Ticket
                </button>
              </div>
            </div>

            {/* Dotted Separator for cinema-carousel */}
            {template.id === 'cinema-carousel' && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{
                  backgroundImage: `repeating-linear-gradient(90deg, ${template.colors.primary} 0px, ${template.colors.primary} 8px, transparent 8px, transparent 16px)`,
                }}
              />
            )}

            {/* Accent bar for other templates */}
            {template.id !== 'cinema-carousel' && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ backgroundColor: template.colors.primary }}
              />
            )}
          </div>

          {/* Movies Section */}
          <div
            className="p-6"
            style={{
              backgroundColor: template.id === 'cinema-carousel' ? '#ffffff' : template.colors.background,
            }}
          >
            {/* Section Header */}
            <div className="text-center mb-6">
              {template.id === 'cinema-carousel' && (
                <div className="flex justify-center mb-2">
                  <Film className="h-5 w-5" style={{ color: template.colors.primary }} />
                </div>
              )}
              <span
                className="text-sm"
                style={{
                  color: template.id === 'cinema-carousel' ? template.colors.primary : template.colors.mutedText,
                }}
              >
                Watch New Movies
              </span>
              <h3
                className="text-xl font-bold mt-1"
                style={{
                  color: template.id === 'cinema-carousel' ? '#0f172a' : template.colors.text,
                  fontFamily: template.fonts.heading,
                }}
              >
                Movies Now Playing
              </h3>
            </div>

            {/* Movie Cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { title: 'The Fifth Day', genre: 'Comedy', duration: '180 Mins' },
                { title: 'Black & White', genre: 'Animation', duration: '160 Mins' },
                { title: 'Scariest Game', genre: 'Thriller', duration: '190 Mins' },
                { title: 'New Day Dreams', genre: 'Romance', duration: '150 Mins' },
              ].map((movie, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg overflow-hidden',
                    template.style.cardStyle === 'glass' && 'backdrop-blur border',
                    template.style.cardStyle === 'elevated' && 'shadow-lg'
                  )}
                  style={{
                    backgroundColor:
                      template.id === 'cinema-carousel'
                        ? '#f8fafc'
                        : template.style.cardStyle === 'glass'
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
                    {/* Genre/Duration overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                      <span className="text-xs text-white/80">
                        {movie.genre} / {movie.duration}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4
                      className="font-medium text-sm truncate"
                      style={{ color: template.id === 'cinema-carousel' ? '#0f172a' : template.colors.text }}
                    >
                      {movie.title}
                    </h4>
                    <button
                      className={cn(
                        'mt-2 px-3 py-1 text-xs border',
                        template.style.buttonStyle === 'pill' && 'rounded-full',
                        template.style.buttonStyle === 'rounded' && 'rounded',
                        template.style.buttonStyle === 'sharp' && 'rounded-none'
                      )}
                      style={{
                        borderColor: template.id === 'cinema-carousel' ? '#0f172a' : template.colors.text,
                        color: template.id === 'cinema-carousel' ? '#0f172a' : template.colors.text,
                        backgroundColor: 'transparent',
                      }}
                    >
                      Get Ticket
                    </button>
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
