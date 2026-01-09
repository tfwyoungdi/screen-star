import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface CinemaHeaderProps {
  slug: string;
  cinemaName: string;
  logoUrl: string | null;
  primaryColor: string;
  currentPage: 'home' | 'movies' | 'about' | 'careers' | 'contact';
}

export function CinemaHeader({ 
  slug, 
  cinemaName, 
  logoUrl, 
  primaryColor, 
  currentPage 
}: CinemaHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { key: 'home', label: 'HOME', href: `/cinema/${slug}` },
    { key: 'movies', label: 'MOVIES', href: `/cinema/${slug}#movies` },
    { key: 'about', label: 'ABOUT', href: `/cinema/${slug}/about` },
    { key: 'careers', label: 'CAREERS', href: `/cinema/${slug}/careers` },
    { key: 'contact', label: 'CONTACT', href: `/cinema/${slug}/contact` },
  ];

  return (
    <header className="border-b border-white/10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to={`/cinema/${slug}`} className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={cinemaName} className="h-10 w-auto" />
            ) : (
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rotate-45"
                  style={{ backgroundColor: primaryColor }}
                />
                <span className="text-xl font-bold text-white">{cinemaName}</span>
              </div>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.key}
                to={item.href}
                className={`text-sm transition-colors ${
                  currentPage === item.key
                    ? 'text-white font-medium'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="right" 
              className="w-[280px] border-white/10 p-0"
              style={{ backgroundColor: '#0a0a0f' }}
            >
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <Link 
                  to={`/cinema/${slug}`} 
                  className="flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt={cinemaName} className="h-8 w-auto" />
                  ) : (
                    <>
                      <div 
                        className="w-6 h-6 rotate-45"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <span className="text-lg font-bold text-white">{cinemaName}</span>
                    </>
                  )}
                </Link>
              </div>

              {/* Mobile Navigation Links */}
              <nav className="flex flex-col p-4">
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-4 px-2 text-base border-b border-white/5 transition-colors ${
                      currentPage === item.key
                        ? 'text-white font-medium'
                        : 'text-white/70 hover:text-white'
                    }`}
                    style={currentPage === item.key ? { color: primaryColor } : undefined}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
