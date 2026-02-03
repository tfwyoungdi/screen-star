import { ReactNode } from 'react';
import { Film, Check, Shield, Zap, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showTestimonial?: boolean;
}

export function AuthLayout({ children, title, subtitle, showTestimonial = true }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Modern Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 bg-gradient-to-br from-primary/5 via-background to-secondary/30 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Decorative gradient orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-chart-3/6 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-16">
          {/* Top section - Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
              <Film className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">
              Cine<span className="text-primary">Tix</span>
            </span>
          </Link>
          
          {/* Middle section - Value proposition */}
          <div className="flex-1 flex flex-col justify-center py-12">
            <div className="mb-8">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Zap className="h-3.5 w-3.5" />
                Trusted by 500+ cinemas worldwide
              </span>
              
              <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold text-foreground leading-[1.15] mb-5">
                Everything you need to
                <span className="block text-primary">run your cinema</span>
              </h2>
              
              <p className="text-muted-foreground text-base xl:text-lg max-w-md leading-relaxed">
                From ticket sales to analytics, manage every aspect of your cinema 
                operations in one powerful platform.
              </p>
            </div>

            {/* Feature list with better spacing */}
            <div className="grid gap-3 mb-10">
              {[
                'Real-time booking & seat management',
                'Role-based staff dashboards',
                'Advanced analytics & reporting',
                'Custom branded booking website',
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 group">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                  </div>
                  <span className="text-foreground/90 text-sm xl:text-base">{feature}</span>
                </div>
              ))}
            </div>
            
            {/* Social proof stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-card/80 backdrop-blur-sm px-5 py-3.5 rounded-2xl border border-border/50 shadow-sm">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-lg xl:text-xl font-bold text-foreground">2M+</div>
                  <div className="text-xs text-muted-foreground">Tickets sold</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-card/80 backdrop-blur-sm px-5 py-3.5 rounded-2xl border border-border/50 shadow-sm">
                <div className="p-2 rounded-xl bg-chart-3/10">
                  <Shield className="h-4 w-4 text-chart-3" />
                </div>
                <div>
                  <div className="text-lg xl:text-xl font-bold text-foreground">99.9%</div>
                  <div className="text-xs text-muted-foreground">Uptime SLA</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom section - Testimonial */}
          {showTestimonial && (
            <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-5 xl:p-6">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-foreground/90 text-sm xl:text-base leading-relaxed mb-4">
                "CineTix transformed our operations. We've seen a 300% increase in online bookings 
                and our staff loves the intuitive dashboards."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  SM
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">Sarah Mitchell</div>
                  <div className="text-xs text-muted-foreground">Owner, Palace Cinema</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-[55%] xl:w-1/2 flex flex-col min-h-screen bg-background">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border/50">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Film className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Cine<span className="text-primary">Tix</span>
            </span>
          </Link>
        </div>

        {/* Form container with proper vertical centering */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-[420px]">
            {/* Form header with improved hierarchy */}
            <div className="text-center lg:text-left mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-muted-foreground text-base">{subtitle}</p>
              )}
            </div>

            {/* Form content */}
            {children}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 text-center border-t border-border/50 lg:border-0">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
