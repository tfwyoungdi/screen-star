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
    id: 'luxury-premiere',
    name: 'Luxury Premiere',
    description: 'Sophisticated elegance with rich burgundy and gold accents. Perfect for upscale cinemas and premium experiences.',
    icon: Sparkles,
    colors: {
      primary: '#8B2942', // Rich Burgundy
      secondary: '#1C1017',
      accent: '#D4A574', // Champagne Gold
      background: '#0D0A0B',
      cardBackground: '#1A1315',
      text: '#FAF7F5',
      mutedText: '#A89A9D',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Inter',
    },
    style: {
      heroStyle: 'image-overlay',
      cardStyle: 'glass',
      buttonStyle: 'rounded',
      animationLevel: 'moderate',
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
  {
    id: 'neon-pulse',
    name: 'Neon Pulse',
    description: 'Clean modern design with subtle elegance, glassmorphism effects, and refined typography. Perfect for contemporary cinemas.',
    icon: Zap,
    colors: {
      primary: '#64748B', // Slate Gray
      secondary: '#1E293B',
      accent: '#94A3B8', // Light Slate
      background: '#0F172A',
      cardBackground: '#1E293B',
      text: '#F8FAFC',
      mutedText: '#94A3B8',
    },
    fonts: {
      heading: 'Space Grotesk',
      body: 'Inter',
    },
    style: {
      heroStyle: 'gradient',
      cardStyle: 'glass',
      buttonStyle: 'pill',
      animationLevel: 'moderate',
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
  const isLuxuryPremiere = template.id === 'luxury-premiere';
  const isNeonPulse = template.id === 'neon-pulse';

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
          {/* Navigation Bar - Cinema Carousel */}
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

          {/* Navigation Bar - Luxury Premiere */}
          {isLuxuryPremiere && (
            <div
              className="flex items-center justify-between px-8 py-5"
              style={{ 
                backgroundColor: 'transparent',
                borderBottom: `1px solid ${template.colors.accent}30`
              }}
            >
              <div className="flex items-center gap-12">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ 
                      background: `linear-gradient(135deg, ${template.colors.primary} 0%, ${template.colors.accent} 100%)`
                    }}
                  >
                    <span className="text-white text-xs font-bold">P</span>
                  </div>
                  <span 
                    className="text-lg tracking-wider"
                    style={{ 
                      color: template.colors.text,
                      fontFamily: 'Playfair Display, serif'
                    }}
                  >
                    {cinemaName || 'PREMIERE'}
                  </span>
                </div>
                <nav className="hidden md:flex items-center gap-8">
                  <span style={{ color: template.colors.accent }} className="text-sm tracking-wide font-medium">HOME</span>
                  <span className="text-sm tracking-wide" style={{ color: template.colors.mutedText }}>FILMS</span>
                  <span className="text-sm tracking-wide" style={{ color: template.colors.mutedText }}>EXPERIENCES</span>
                  <span className="text-sm tracking-wide" style={{ color: template.colors.mutedText }}>CONTACT</span>
                </nav>
              </div>
              <div className="flex items-center gap-6">
                <button 
                  className="px-4 py-2 text-xs tracking-widest border rounded"
                  style={{ 
                    borderColor: template.colors.accent,
                    color: template.colors.accent
                  }}
                >
                  MEMBERSHIP
                </button>
              </div>
            </div>
          )}

          {/* Navigation Bar - Neon Pulse */}
          {isNeonPulse && (
            <div
              className="flex items-center justify-between px-8 py-4"
              style={{ 
                backgroundColor: 'transparent',
                borderBottom: `1px solid ${template.colors.primary}30`
              }}
            >
              <div className="flex items-center gap-10">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center relative overflow-hidden"
                    style={{ 
                      background: `linear-gradient(135deg, ${template.colors.primary} 0%, ${template.colors.accent} 100%)`
                    }}
                  >
                    <span className="text-white text-xs font-bold">NP</span>
                  </div>
                  <span 
                    className="text-lg font-bold tracking-wide"
                    style={{ 
                      color: template.colors.text,
                      fontFamily: "'Space Grotesk', sans-serif"
                    }}
                  >
                    {cinemaName || 'NEON PULSE'}
                  </span>
                </div>
                <nav className="hidden md:flex items-center gap-6">
                  <span 
                    className="text-sm font-medium px-3 py-1 rounded-full"
                    style={{ 
                      color: template.colors.background,
                      backgroundColor: template.colors.primary
                    }}
                  >
                    Home
                  </span>
                  <span className="text-sm" style={{ color: template.colors.mutedText }}>Movies</span>
                  <span className="text-sm" style={{ color: template.colors.mutedText }}>Schedule</span>
                  <span className="text-sm" style={{ color: template.colors.mutedText }}>Contact</span>
                </nav>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  className="px-5 py-2 text-xs font-semibold rounded-full transition-all"
                  style={{ 
                    background: `linear-gradient(135deg, ${template.colors.primary} 0%, ${template.colors.accent} 100%)`,
                    color: '#fff'
                  }}
                >
                  Get Tickets
                </button>
              </div>
            </div>
          )}

          {/* Hero Section */}
          <div
            className="relative flex flex-col justify-center px-8 md:px-12"
            style={{
              height: isNeonPulse ? '380px' : isLuxuryPremiere ? '360px' : isCinemaCarousel ? '320px' : '280px',
              background: isNeonPulse
                ? `radial-gradient(ellipse at 30% 0%, ${template.colors.primary}20 0%, transparent 50%), radial-gradient(ellipse at 70% 100%, ${template.colors.accent}15 0%, transparent 50%), linear-gradient(180deg, ${template.colors.secondary} 0%, ${template.colors.background} 100%)`
                : isLuxuryPremiere
                ? `linear-gradient(135deg, ${template.colors.background} 0%, ${template.colors.secondary} 50%, ${template.colors.background} 100%)`
                : isCinemaCarousel
                ? `linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.3) 100%), linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)`
                : template.style.heroStyle === 'gradient'
                ? `linear-gradient(180deg, ${template.colors.secondary} 0%, ${template.colors.background} 100%)`
                : template.style.heroStyle === 'image-overlay'
                ? `linear-gradient(90deg, ${template.colors.background}ee 0%, ${template.colors.background}88 50%, transparent 100%), linear-gradient(180deg, ${template.colors.secondary}40 0%, ${template.colors.secondary} 100%)`
                : template.colors.secondary,
            }}
          >
            {/* Decorative elements for Neon Pulse */}
            {isNeonPulse && (
              <>
                <div 
                  className="absolute top-10 right-20 w-80 h-80 rounded-full blur-[100px] opacity-30"
                  style={{ backgroundColor: template.colors.primary }}
                />
                <div 
                  className="absolute bottom-10 left-10 w-60 h-60 rounded-full blur-[80px] opacity-25"
                  style={{ backgroundColor: template.colors.accent }}
                />
                {/* Animated grid lines */}
                <div 
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `linear-gradient(${template.colors.primary}20 1px, transparent 1px), linear-gradient(90deg, ${template.colors.primary}20 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                  }}
                />
              </>
            )}
            
            {/* Decorative elements for Luxury Premiere */}
            {isLuxuryPremiere && (
              <>
                <div 
                  className="absolute top-0 right-0 w-96 h-96 opacity-10 rounded-full blur-3xl"
                  style={{ backgroundColor: template.colors.primary }}
                />
                <div 
                  className="absolute bottom-0 left-1/4 w-64 h-64 opacity-5 rounded-full blur-2xl"
                  style={{ backgroundColor: template.colors.accent }}
                />
              </>
            )}

            {/* Carousel arrows */}
            {(isCinemaCarousel || isLuxuryPremiere) && (
              <>
                <div 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-colors"
                  style={{
                    borderColor: isLuxuryPremiere ? `${template.colors.accent}40` : 'rgba(255,255,255,0.2)',
                    backgroundColor: isLuxuryPremiere ? `${template.colors.cardBackground}80` : 'rgba(0,0,0,0.3)',
                  }}
                >
                  <span style={{ color: isLuxuryPremiere ? template.colors.accent : '#fff' }} className="text-xl">‹</span>
                </div>
                <div 
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-colors"
                  style={{
                    borderColor: isLuxuryPremiere ? `${template.colors.accent}40` : 'rgba(255,255,255,0.2)',
                    backgroundColor: isLuxuryPremiere ? `${template.colors.cardBackground}80` : 'rgba(0,0,0,0.3)',
                  }}
                >
                  <span style={{ color: isLuxuryPremiere ? template.colors.accent : '#fff' }} className="text-xl">›</span>
                </div>
              </>
            )}

            {/* Hero Content */}
            <div className={cn(
              "max-w-xl relative z-10", 
              isLuxuryPremiere && "text-center mx-auto max-w-2xl",
              isNeonPulse && "text-center mx-auto max-w-2xl"
            )}>
              {/* Category Label */}
              {isNeonPulse ? (
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div 
                    className="px-4 py-1 text-xs font-medium tracking-wider rounded-full"
                    style={{ 
                      background: `linear-gradient(135deg, ${template.colors.primary}30, ${template.colors.accent}30)`,
                      border: `1px solid ${template.colors.primary}50`,
                      color: template.colors.primary
                    }}
                  >
                    ✦ NOW STREAMING
                  </div>
                </div>
              ) : isLuxuryPremiere ? (
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="h-px w-12" style={{ backgroundColor: template.colors.accent }} />
                  <span 
                    className="text-xs tracking-[0.3em] uppercase"
                    style={{ color: template.colors.accent }}
                  >
                    Now Showing
                  </span>
                  <div className="h-px w-12" style={{ backgroundColor: template.colors.accent }} />
                </div>
              ) : (
                <span
                  className="text-base font-medium italic"
                  style={{ color: template.colors.primary }}
                >
                  Adventure Movie
                </span>
              )}

              {/* Movie Title - Large */}
              <h2
                className={cn(
                  "font-bold leading-tight",
                  isNeonPulse ? "text-4xl md:text-6xl mt-2 mb-6" : isLuxuryPremiere ? "text-4xl md:text-6xl mt-2 mb-6" : "text-5xl mt-3 mb-4"
                )}
                style={{
                  color: template.colors.text,
                  fontFamily: template.fonts.heading,
                }}
              >
                {isNeonPulse ? (
                  <>
                    <span 
                      style={{ 
                        background: `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.accent})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}
                    >
                      {cinemaName || 'NEON'}
                    </span>
                    <br />
                    <span style={{ color: template.colors.text }}>PULSE</span>
                  </>
                ) : isLuxuryPremiere ? (
                  <>{cinemaName || 'The Grand'}<br /><span style={{ color: template.colors.accent }}>Premiere</span></>
                ) : (
                  <>The {cinemaName || 'Lorem'}<br />Movie</>
                )}
              </h2>

              {/* Description */}
              <p
                className={cn(
                  "leading-relaxed",
                  isNeonPulse ? "text-base mb-8 max-w-lg mx-auto" : isLuxuryPremiere ? "text-base mb-10 max-w-md mx-auto" : "text-sm mb-8 max-w-lg"
                )}
                style={{ color: template.colors.mutedText }}
              >
                {isNeonPulse
                  ? "Step into the future of cinema. Immersive screens, cutting-edge sound, and an electrifying atmosphere await."
                  : isLuxuryPremiere 
                  ? "Experience cinema in its most exquisite form. Luxury seating, premium sound, and an unforgettable atmosphere await."
                  : "Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem ipsum has been the industry's standard dummy text ever since the 1500s."
                }
              </p>

              {/* CTA Buttons */}
              <div className={cn("flex gap-4", (isLuxuryPremiere || isNeonPulse) && "justify-center")}>
                <button
                  className={cn(
                    'px-6 py-3 text-sm font-medium flex items-center gap-2 transition-all hover:opacity-90',
                    template.style.buttonStyle === 'pill' && 'rounded-full',
                    template.style.buttonStyle === 'rounded' && 'rounded-md',
                    template.style.buttonStyle === 'sharp' && 'rounded-none'
                  )}
                  style={{
                    background: isNeonPulse 
                      ? `linear-gradient(135deg, ${template.colors.primary} 0%, ${template.colors.accent} 100%)`
                      : template.colors.primary,
                    color: '#ffffff',
                    boxShadow: isNeonPulse 
                      ? `0 8px 32px ${template.colors.primary}60, 0 0 0 1px ${template.colors.primary}30` 
                      : isLuxuryPremiere 
                      ? `0 8px 32px ${template.colors.primary}40` 
                      : 'none'
                  }}
                >
                  {isNeonPulse ? '⚡ Book Now' : isLuxuryPremiere ? 'Reserve Seats' : <><span>◉</span> More Info</>}
                </button>
                <button
                  className={cn(
                    'px-6 py-3 text-sm font-medium border-2 flex items-center gap-2 transition-all',
                    template.style.buttonStyle === 'pill' && 'rounded-full',
                    template.style.buttonStyle === 'rounded' && 'rounded-md',
                    template.style.buttonStyle === 'sharp' && 'rounded-none'
                  )}
                  style={{
                    borderColor: isNeonPulse 
                      ? template.colors.accent 
                      : isLuxuryPremiere 
                      ? template.colors.accent 
                      : isCinemaCarousel 
                      ? '#ffffff' 
                      : template.colors.text,
                    color: isNeonPulse 
                      ? template.colors.accent 
                      : isLuxuryPremiere 
                      ? template.colors.accent 
                      : isCinemaCarousel 
                      ? '#ffffff' 
                      : template.colors.text,
                    backgroundColor: isNeonPulse ? `${template.colors.accent}10` : 'transparent',
                  }}
                >
                  {isNeonPulse ? '▷ Trailer' : isLuxuryPremiere ? 'Watch Trailer' : <><span>◉</span> Get Ticket</>}
                </button>
              </div>
            </div>
          </div>

          {/* Separator for luxury-premiere */}
          {isLuxuryPremiere && (
            <div className="flex items-center justify-center py-4" style={{ backgroundColor: template.colors.background }}>
              <div className="flex items-center gap-3">
                <div className="h-px w-16" style={{ backgroundColor: `${template.colors.accent}30` }} />
                <div 
                  className="w-2 h-2 rotate-45"
                  style={{ backgroundColor: template.colors.accent }}
                />
                <div className="h-px w-16" style={{ backgroundColor: `${template.colors.accent}30` }} />
              </div>
            </div>
          )}

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

          {/* Gradient Separator for neon-pulse */}
          {isNeonPulse && (
            <div
              className="h-1 w-full"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${template.colors.primary} 20%, ${template.colors.accent} 80%, transparent 100%)`
              }}
            />
          )}

          {/* Accent bar for other templates */}
          {!isCinemaCarousel && !isLuxuryPremiere && !isNeonPulse && (
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
            <div className={cn("mb-8", (isLuxuryPremiere || isNeonPulse) ? "text-left" : "text-center")}>
              {isCinemaCarousel && (
                <div className="flex justify-center mb-3">
                  <Film className="h-5 w-5" style={{ color: template.colors.primary }} />
                </div>
              )}
              {isNeonPulse ? (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <span 
                      className="text-xs font-medium tracking-wider"
                      style={{ 
                        color: template.colors.accent
                      }}
                    >
                      ● FEATURED
                    </span>
                  </div>
                  <h3
                    className="text-2xl md:text-3xl font-bold"
                    style={{
                      color: template.colors.text,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    Now Showing
                  </h3>
                </>
              ) : isLuxuryPremiere ? (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-px w-8" style={{ backgroundColor: template.colors.accent }} />
                    <span 
                      className="text-xs tracking-[0.2em] uppercase"
                      style={{ color: template.colors.accent }}
                    >
                      Featured Films
                    </span>
                  </div>
                  <h3
                    className="text-2xl md:text-3xl font-bold"
                    style={{
                      color: template.colors.text,
                      fontFamily: template.fonts.heading,
                    }}
                  >
                    Now Showing
                  </h3>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* Movie Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { title: 'The Fifth Day', genre: 'Comedy', duration: '180 Mins', color: isLuxuryPremiere ? template.colors.primary : '#2d5a3d' },
                { title: 'Black & White', genre: 'Animation', duration: '160 Mins', color: isLuxuryPremiere ? '#2a1f22' : '#3d3d3d' },
                { title: 'Scariest Game', genre: 'Thriller', duration: '190 Mins', color: isLuxuryPremiere ? '#1a1520' : '#4a5568' },
                { title: 'New Day Dreams', genre: 'Romance', duration: '150 Mins', color: isLuxuryPremiere ? template.colors.secondary : '#2d3748' },
              ].map((movie, i) => (
              <div
                  key={i}
                  className={cn(
                    "rounded-lg overflow-hidden group cursor-pointer",
                    isLuxuryPremiere && "group cursor-pointer",
                    isNeonPulse && "relative"
                  )}
                  style={{
                    backgroundColor: isCinemaCarousel ? '#f8f8f8' : template.colors.cardBackground,
                    border: isNeonPulse 
                      ? `1px solid ${template.colors.primary}30`
                      : isLuxuryPremiere 
                      ? `1px solid ${template.colors.accent}20` 
                      : 'none',
                    boxShadow: isNeonPulse ? `0 4px 20px ${template.colors.background}` : 'none'
                  }}
                >
                  {/* Poster with overlay */}
                  <div
                    className="aspect-[3/4] relative overflow-hidden"
                    style={{
                      background: isNeonPulse 
                        ? `linear-gradient(135deg, ${template.colors.primary}40 0%, ${template.colors.accent}30 100%)`
                        : `linear-gradient(180deg, ${movie.color} 0%, ${movie.color}dd 100%)`,
                    }}
                  >
                    <Film
                      className={cn(
                        "absolute inset-0 m-auto opacity-30",
                        isLuxuryPremiere || isNeonPulse ? "h-8 w-8" : "h-10 w-10"
                      )}
                      style={{ color: '#ffffff' }}
                    />
                    
                    {/* Neon Pulse hover overlay */}
                    {isNeonPulse && (
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center"
                        style={{ 
                          background: `linear-gradient(135deg, ${template.colors.primary}e0 0%, ${template.colors.accent}e0 100%)`
                        }}
                      >
                        <button
                          className="px-5 py-2 text-xs font-semibold tracking-wide rounded-full"
                          style={{ 
                            backgroundColor: '#fff',
                            color: template.colors.background,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                          }}
                        >
                          ⚡ BOOK NOW
                        </button>
                      </div>
                    )}
                    
                    {/* Luxury Premiere hover overlay */}
                    {isLuxuryPremiere && (
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center"
                        style={{ backgroundColor: `${template.colors.primary}90` }}
                      >
                        <button
                          className="px-4 py-2 text-xs font-medium tracking-wide border-2 rounded"
                          style={{ 
                            borderColor: '#fff',
                            color: '#fff'
                          }}
                        >
                          BOOK NOW
                        </button>
                      </div>
                    )}
                    
                    {/* Genre/Duration overlay at bottom of poster */}
                    {!isLuxuryPremiere && !isNeonPulse && (
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
                    )}
                  </div>
                  
                  {/* Neon Pulse card info */}
                  {isNeonPulse && (
                    <div className="p-4" style={{ backgroundColor: template.colors.cardBackground }}>
                      <h4 
                        className="font-semibold text-sm mb-1"
                        style={{ 
                          color: template.colors.text,
                          fontFamily: "'Space Grotesk', sans-serif"
                        }}
                      >
                        {movie.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ 
                            backgroundColor: `${template.colors.primary}20`,
                            color: template.colors.primary 
                          }}
                        >
                          {movie.genre}
                        </span>
                        <span 
                          className="text-xs"
                          style={{ color: template.colors.mutedText }}
                        >
                          {movie.duration}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Luxury Premiere card info */}
                  {isLuxuryPremiere && (
                    <div className="p-4" style={{ backgroundColor: template.colors.cardBackground }}>
                      <h4 
                        className="font-semibold text-sm mb-1"
                        style={{ 
                          color: template.colors.text,
                          fontFamily: template.fonts.heading
                        }}
                      >
                        {movie.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-xs"
                          style={{ color: template.colors.accent }}
                        >
                          {movie.genre}
                        </span>
                        <span 
                          className="text-xs"
                          style={{ color: template.colors.mutedText }}
                        >
                          • {movie.duration}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer bar */}
          {isCinemaCarousel && (
            <div className="h-16" style={{ backgroundColor: '#1a1a1a' }} />
          )}
          
          {/* Luxury Premiere Footer */}
          {isLuxuryPremiere && (
            <div 
              className="py-8 text-center"
              style={{ 
                backgroundColor: template.colors.background,
                borderTop: `1px solid ${template.colors.accent}20`
              }}
            >
              <span 
                className="text-xs tracking-[0.3em] uppercase"
                style={{ color: template.colors.mutedText }}
              >
                Experience Luxury Cinema
              </span>
            </div>
          )}
          
          {/* Neon Pulse Footer */}
          {isNeonPulse && (
            <div 
              className="py-6 text-center relative overflow-hidden"
              style={{ 
                backgroundColor: template.colors.background,
                borderTop: `1px solid ${template.colors.primary}30`
              }}
            >
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  background: `radial-gradient(ellipse at center, ${template.colors.primary}30 0%, transparent 70%)`
                }}
              />
              <span 
                className="text-xs font-medium tracking-wider relative z-10"
                style={{ 
                  background: `linear-gradient(90deg, ${template.colors.primary}, ${template.colors.accent})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                ✦ THE FUTURE OF CINEMA ✦
              </span>
            </div>
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
