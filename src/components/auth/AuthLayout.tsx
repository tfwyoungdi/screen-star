import { ReactNode } from 'react';
import { Film, Check, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Modern Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-background via-secondary/30 to-secondary/50 relative overflow-hidden">
        {/* Decorative blurred circles */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-chart-3/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col justify-center w-full p-12 lg:p-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-12">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Film className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">
              Cine<span className="text-primary">Tix</span>
            </span>
          </Link>
          
          {/* Main headline */}
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
            Cinema Management
            <span className="block text-primary mt-1">Made Simple</span>
          </h2>
          
          <p className="text-muted-foreground text-lg max-w-md mb-10 leading-relaxed">
            Streamline your cinema operations with our all-in-one ticketing platform. 
            Manage bookings, staff, and analytics from a single dashboard.
          </p>

          {/* Trust indicators */}
          <div className="space-y-4 mb-12">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
              </div>
              <span className="text-foreground">No credit card required</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
              </div>
              <span className="text-foreground">14-day free trial included</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
              </div>
              <span className="text-foreground">Cancel anytime</span>
            </div>
          </div>
          
          {/* Stats row */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 bg-card px-4 py-3 rounded-2xl border border-border shadow-sm">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">500+</div>
                <div className="text-xs text-muted-foreground">Cinemas</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-card px-4 py-3 rounded-2xl border border-border shadow-sm">
              <div className="p-2 rounded-lg bg-chart-3/10">
                <Shield className="h-4 w-4 text-chart-3" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">99.9%</div>
                <div className="text-xs text-muted-foreground">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-8 bg-background">
        {/* Mobile logo */}
        <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Film className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-bold text-foreground">
            Cine<span className="text-primary">Tix</span>
          </span>
        </Link>

        <div className="w-full max-w-md">
          {/* Form header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{title}</h1>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>

          {/* Form card */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-lg">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
