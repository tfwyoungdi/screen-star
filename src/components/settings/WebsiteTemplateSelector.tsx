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
  const isCinemaCarousel = template.id === 'cinema-carousel';

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
          className="min-h-[600px] overflow-hidden"
          style={{ backgroundColor: template.colors.background }}
        >
          {/* Navigation Bar */}
          {isCinemaCarousel && (
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ backgroundColor: '#1a1a1a' }}
            >
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5"
                    style={{ backgroundColor: template.colors.primary }}
                  />
                  <span className="font-semibold text-white">
                    {cinemaName || 'Movie Theme'}
                  </span>
                </div>
                <nav className="hidden md:flex items-center gap-6">
                  <span style={{ color: template.colors.primary }} className="text-sm font-medium">Home</span>
                  <span className="text-sm text-gray-400">About Us</span>
                  <span className="text-sm text-gray-400">Movies ▾</span>
                  <span className="text-sm text-gray-400">Blogs ▾</span>
                  <span className="text-sm text-gray-400">Pages ▾</span>
                  <span className="text-sm text-gray-400">Contact Us</span>
                </nav>
              </div>
              <div className="flex items-center gap-4 text-white">
                <span className="text-sm">🔍</span>
                <span className="text-sm">👤</span>
              </div>
            </div>
          )}

          {/* Hero Section */}
          <div
            className="relative flex flex-col justify-center px-8 md:px-12"
            style={{
              height: isCinemaCarousel ? '320px' : '280px',
              background: isCinemaCarousel
                ? `linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.3) 100%), linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)`
                : template.style.heroStyle === 'gradient'
                ? `linear-gradient(180deg, ${template.colors.secondary} 0%, ${template.colors.background} 100%)`
                : template.style.heroStyle === 'image-overlay'
                ? `linear-gradient(90deg, ${template.colors.background}ee 0%, ${template.colors.background}88 50%, transparent 100%), linear-gradient(180deg, ${template.colors.secondary}40 0%, ${template.colors.secondary} 100%)`
                : template.colors.secondary,
            }}
          >
            {/* Carousel arrows */}
            {isCinemaCarousel && (
              <>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-black/30 cursor-pointer hover:bg-black/50 transition-colors">
                  <span className="text-white text-xl">‹</span>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-black/30 cursor-pointer hover:bg-black/50 transition-colors">
                  <span className="text-white text-xl">›</span>
                </div>
              </>
            )}

            {/* Hero Content */}
            <div className="max-w-xl relative z-10">
              {/* Category Label - Italic */}
              <span
                className="text-base font-medium italic"
                style={{ color: template.colors.primary }}
              >
                Adventure Movie
              </span>

              {/* Movie Title - Large */}
              <h2
                className="text-5xl font-bold mt-3 mb-4 leading-tight"
                style={{
                  color: template.colors.text,
                  fontFamily: template.fonts.heading,
                }}
              >
                The {cinemaName || 'Lorem'}<br />Movie
              </h2>

              {/* Description */}
              <p
                className="text-sm mb-8 leading-relaxed max-w-lg"
                style={{ color: template.colors.mutedText }}
              >
                Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer typesetting, remaining essentially unchanged.
              </p>

              {/* CTA Buttons */}
              <div className="flex gap-4">
                <button
                  className={cn(
                    'px-6 py-3 text-sm font-medium flex items-center gap-2 transition-all hover:opacity-90',
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
                    'px-6 py-3 text-sm font-medium border-2 flex items-center gap-2 transition-all hover:bg-white/10',
                    template.style.buttonStyle === 'pill' && 'rounded-full',
                    template.style.buttonStyle === 'rounded' && 'rounded-md',
                    template.style.buttonStyle === 'sharp' && 'rounded-none'
                  )}
                  style={{
                    borderColor: isCinemaCarousel ? '#ffffff' : template.colors.text,
                    color: isCinemaCarousel ? '#ffffff' : template.colors.text,
                    backgroundColor: 'transparent',
                  }}
                >
                  <span>◉</span> Get Ticket
                </button>
              </div>
            </div>
          </div>

          {/* Dotted Separator for cinema-carousel */}
          {isCinemaCarousel && (
            <div
              className="h-2 w-full"
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, ${template.colors.primary} 0px, ${template.colors.primary} 12px, transparent 12px, transparent 24px)`,
                backgroundSize: '24px 4px',
                backgroundRepeat: 'repeat-x',
                backgroundPosition: 'center',
              }}
            />
          )}

          {/* Accent bar for other templates */}
          {!isCinemaCarousel && (
            <div
              className="h-1 w-full"
              style={{ backgroundColor: template.colors.primary }}
            />
          )}

          {/* Movies Section */}
          <div
            className="p-8 md:p-12"
            style={{
              backgroundColor: isCinemaCarousel ? '#ffffff' : template.colors.background,
            }}
          >
            {/* Section Header */}
            <div className="text-center mb-8">
              {isCinemaCarousel && (
                <div className="flex justify-center mb-3">
                  <Film className="h-5 w-5" style={{ color: template.colors.primary }} />
                </div>
              )}
              <span
                className="text-sm tracking-wide"
                style={{
                  color: isCinemaCarousel ? template.colors.primary : template.colors.mutedText,
                }}
              >
                Watch New Movies
              </span>
              <h3
                className="text-2xl md:text-3xl font-bold mt-2"
                style={{
                  color: isCinemaCarousel ? '#1a1a1a' : template.colors.text,
                  fontFamily: template.fonts.heading,
                }}
              >
                Movies Now Playing
              </h3>
            </div>

            {/* Movie Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { title: 'The Fifth Day', genre: 'Comedy', duration: '180 Mins', color: '#2d5a3d' },
                { title: 'Black & White', genre: 'Animation', duration: '160 Mins', color: '#3d3d3d' },
                { title: 'Scariest Game', genre: 'Thriller', duration: '190 Mins', color: '#4a5568' },
                { title: 'New Day Dreams', genre: 'Romance', duration: '150 Mins', color: '#2d3748' },
              ].map((movie, i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden shadow-lg"
                  style={{
                    backgroundColor: isCinemaCarousel ? '#f8f8f8' : template.colors.cardBackground,
                  }}
                >
                  {/* Poster with overlay */}
                  <div
                    className="aspect-[3/4] relative"
                    style={{
                      background: `linear-gradient(180deg, ${movie.color} 0%, ${movie.color}dd 100%)`,
                    }}
                  >
                    <Film
                      className="absolute inset-0 m-auto h-10 w-10 opacity-30"
                      style={{ color: '#ffffff' }}
                    />
                    {/* Genre/Duration overlay at bottom of poster */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      <span className="text-xs text-white/90">
                        {movie.genre} / {movie.duration}
                      </span>
                      <h4 className="font-semibold text-sm text-white mt-1">
                        {movie.title}
                      </h4>
                      <button
                        className="mt-2 px-3 py-1 text-xs border border-white/80 text-white rounded hover:bg-white/20 transition-colors"
                      >
                        Get Ticket
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer bar */}
          {isCinemaCarousel && (
            <div className="h-16" style={{ backgroundColor: '#1a1a1a' }} />
          )}
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
