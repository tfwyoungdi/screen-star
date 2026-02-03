import { UserPlus, Film, Globe, TrendingUp, ArrowRight } from "lucide-react";
import dashboardImage from "@/assets/dashboard-preview.jpg";
import mobileImage from "@/assets/mobile-booking.jpg";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Sign Up & Setup",
    description: "Create your account, configure your cinema profile, add halls, and set up seating layouts in minutes.",
    color: "from-primary/20 to-primary/5",
    iconBg: "bg-primary",
  },
  {
    number: "02",
    icon: Film,
    title: "Add Movies & Showtimes",
    description: "Import movie details, schedule showtimes, and set pricing with our intuitive scheduling system.",
    color: "from-chart-3/20 to-chart-3/5",
    iconBg: "bg-chart-3",
  },
  {
    number: "03",
    icon: Globe,
    title: "Launch Your Website",
    description: "Customize your booking website, connect your domain, and go live with online ticket sales.",
    color: "from-chart-4/20 to-chart-4/5",
    iconBg: "bg-chart-4",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Manage & Grow",
    description: "Use analytics to optimize operations, manage staff roles, and scale your cinema business.",
    color: "from-chart-5/20 to-chart-5/5",
    iconBg: "bg-chart-5",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 lg:py-32 bg-secondary/30 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-sm font-semibold tracking-wide uppercase">How It Works</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Get Started in <span className="text-primary">4 Simple Steps</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From signup to selling tickets — we make the journey effortless.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="group relative"
            >
              {/* Connector line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-gradient-to-r from-border via-primary/30 to-border z-0" />
              )}
              
              <div className={`relative z-10 h-full bg-card rounded-3xl border border-border p-6 hover:border-primary/40 hover:shadow-xl transition-all duration-500 group-hover:-translate-y-2`}>
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <div className="relative z-10">
                  {/* Step number & icon row */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-5xl font-bold text-muted-foreground/20 group-hover:text-primary/20 transition-colors">
                      {step.number}
                    </span>
                    <div className={`p-3 rounded-2xl ${step.iconBg} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <step.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Visual showcase */}
        <div className="relative max-w-5xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-border shadow-2xl bg-card">
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent z-10" />
            <img
              src={dashboardImage}
              alt="CineTix Dashboard Preview"
              className="w-full h-auto"
            />
            
            {/* Floating badge */}
            <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3 bg-card/90 backdrop-blur-sm px-4 py-3 rounded-2xl border border-border shadow-lg">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Real-time Analytics</div>
                <div className="text-xs text-muted-foreground">Track sales & performance</div>
              </div>
            </div>
          </div>
          
          {/* Mobile preview */}
          <div className="absolute -bottom-8 -right-4 lg:right-8 w-32 lg:w-44 z-30">
            <div className="rounded-2xl overflow-hidden border-4 border-card shadow-2xl">
              <img
                src={mobileImage}
                alt="Mobile Booking Experience"
                className="w-full h-auto"
              />
            </div>
          </div>
          
          {/* Decorative glow */}
          <div className="absolute -inset-10 -z-10 bg-primary/10 blur-3xl rounded-full opacity-50" />
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
