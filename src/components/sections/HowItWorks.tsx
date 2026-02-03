import { UserPlus, Film, Globe, TrendingUp, Sparkles, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
  glowColor: string;
}

const steps: Step[] = [
  {
    number: "01",
    icon: UserPlus,
    title: "Sign Up & Setup",
    description: "Create your account, configure your cinema profile, add halls, and set up seating layouts in minutes.",
    accent: "bg-primary",
    glowColor: "shadow-primary/25",
  },
  {
    number: "02",
    icon: Film,
    title: "Add Movies & Showtimes",
    description: "Import movie details, schedule showtimes, and set pricing with our intuitive scheduling system.",
    accent: "bg-chart-3",
    glowColor: "shadow-chart-3/25",
  },
  {
    number: "03",
    icon: Globe,
    title: "Launch Your Website",
    description: "Customize your booking website, connect your domain, and go live with online ticket sales.",
    accent: "bg-chart-4",
    glowColor: "shadow-chart-4/25",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Manage & Grow",
    description: "Use analytics to optimize operations, manage staff roles, and scale your cinema business.",
    accent: "bg-chart-5",
    glowColor: "shadow-chart-5/25",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-chart-3/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-chart-4/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-foreground text-sm font-medium">Simple Process</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            From Zero to <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary via-chart-3 to-chart-4 bg-clip-text text-transparent">
              Selling Tickets
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Launch your cinema's online presence in four straightforward steps. No technical expertise required.
          </p>
        </div>

        {/* Timeline Steps - Desktop */}
        <div className="hidden lg:block relative max-w-5xl mx-auto mb-16">
          {/* Central timeline line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
          
          {steps.map((step, index) => {
            const isEven = index % 2 === 0;
            const StepIcon = step.icon;
            
            return (
              <div 
                key={step.number} 
                className={`relative flex items-center gap-8 mb-16 last:mb-0 ${isEven ? 'flex-row' : 'flex-row-reverse'}`}
              >
                {/* Content Card */}
                <div className={`w-[calc(50%-3rem)] ${isEven ? 'text-right' : 'text-left'}`}>
                  <div className={`group inline-block w-full max-w-md bg-card rounded-3xl border border-border p-8 hover:border-primary/30 transition-all duration-500 hover:shadow-xl ${step.glowColor} ${isEven ? 'ml-auto' : 'mr-auto'}`}>
                    <div className={`flex items-start gap-4 ${isEven ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`shrink-0 p-4 rounded-2xl ${step.accent} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <StepIcon className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div className={isEven ? 'text-right' : 'text-left'}>
                        <span className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
                          Step {step.number}
                        </span>
                        <h3 className="text-xl font-bold text-foreground mt-1 mb-2">
                          {step.title}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center Node */}
                <div className="absolute left-1/2 -translate-x-1/2 z-10">
                  <div className={`w-12 h-12 rounded-full ${step.accent} border-4 border-background flex items-center justify-center shadow-lg`}>
                    <span className="text-sm font-bold text-primary-foreground">{step.number}</span>
                  </div>
                </div>

                {/* Spacer for opposite side */}
                <div className="w-[calc(50%-3rem)]" />
              </div>
            );
          })}
        </div>

        {/* Timeline Steps - Mobile/Tablet */}
        <div className="lg:hidden space-y-6 mb-16">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            
            return (
              <div key={step.number} className="relative flex gap-4">
                {/* Timeline line and node */}
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full ${step.accent} flex items-center justify-center shadow-lg shrink-0`}>
                    <span className="text-sm font-bold text-primary-foreground">{step.number}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-px flex-1 bg-gradient-to-b from-border to-transparent mt-4" />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 bg-card rounded-2xl border border-border p-6 ${step.glowColor} hover:shadow-lg transition-shadow`}>
                  <div className="flex items-start gap-4">
                    <div className={`shrink-0 p-3 rounded-xl ${step.accent}/10`}>
                      <StepIcon className={`h-5 w-5`} style={{ color: `hsl(var(--primary))` }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-2 rounded-full bg-card border border-border shadow-lg">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-secondary border-2 border-card flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">{i}</span>
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">500+</span> cinemas onboard
              </span>
            </div>
            <a 
              href="/signup" 
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Start Free Trial
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
