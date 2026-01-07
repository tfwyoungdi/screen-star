import { ReactNode } from 'react';
import { Film } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-background to-accent/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_hsl(var(--accent)/0.1),transparent_50%)]" />
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Film className="h-10 w-10 text-primary" />
            </div>
            <span className="text-3xl font-bold text-foreground">CineTix</span>
          </Link>
          
          <h2 className="text-4xl font-bold text-foreground text-center mb-4">
            Cinema Management
            <span className="block text-primary">Made Simple</span>
          </h2>
          
          <p className="text-muted-foreground text-center text-lg max-w-md">
            Streamline your cinema operations with our all-in-one ticketing platform. 
            Manage bookings, staff, and analytics from a single dashboard.
          </p>
          
          <div className="mt-12 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Cinemas</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">10M+</div>
              <div className="text-sm text-muted-foreground">Tickets Sold</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8">
        {/* Mobile logo */}
        <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Film className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold text-foreground">CineTix</span>
        </Link>

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
