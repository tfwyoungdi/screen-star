import { UserPlus, Film, Globe, TrendingUp, ArrowRight, Play } from "lucide-react";
import type { LucideIcon } from "lucide-react";
interface Step {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  borderGradient: string;
}
const steps: Step[] = [{
  number: "01",
  icon: UserPlus,
  title: "Sign Up & Setup",
  description: "Create your account and configure your cinema profile in minutes.",
  gradient: "from-primary to-primary/80",
  borderGradient: "hover:shadow-[0_0_40px_-12px] hover:shadow-primary"
}, {
  number: "02",
  icon: Film,
  title: "Add Content",
  description: "Import movies, set showtimes, and configure your pricing tiers.",
  gradient: "from-primary to-primary/80",
  borderGradient: "hover:shadow-[0_0_40px_-12px] hover:shadow-primary"
}, {
  number: "03",
  icon: Globe,
  title: "Go Live",
  description: "Launch your branded website and start selling tickets online.",
  gradient: "from-primary to-primary/80",
  borderGradient: "hover:shadow-[0_0_40px_-12px] hover:shadow-primary"
}, {
  number: "04",
  icon: TrendingUp,
  title: "Scale Up",
  description: "Use analytics to optimize and grow your cinema business.",
  gradient: "from-primary to-primary/80",
  borderGradient: "hover:shadow-[0_0_40px_-12px] hover:shadow-primary"
}];
const HowItWorks = () => {
  return <section className="py-24 lg:py-32 relative overflow-hidden bg-secondary/20">
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--chart-3)/0.08),transparent_50%)]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header with asymmetric layout */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-end mb-16 lg:mb-24">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 mb-6">
              <Play className="w-3 h-3 text-primary fill-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-wider">How It Works</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1]">
              Launch your cinema
              <span className="block mt-2 bg-gradient-to-r from-primary via-chart-3 to-chart-4 bg-clip-text text-transparent">
                in 4 steps
              </span>
            </h2>
          </div>
          <div className="lg:text-right">
            <p className="text-muted-foreground text-lg max-w-md lg:ml-auto">
              No coding required. No complex setup. Just follow our streamlined process and start selling tickets today.
            </p>
          </div>
        </div>

        {/* Steps - Horizontal Scroll on Mobile, Grid on Desktop */}
        <div className="relative">
          {/* Connection line - Desktop only */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 z-0" />
          
          <div className="flex lg:grid lg:grid-cols-4 gap-6 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 snap-x snap-mandatory lg:snap-none -mx-4 px-4 lg:mx-0 lg:px-0">
            {steps.map((step, index) => {
            const StepIcon = step.icon;
            return <div key={step.number} className="snap-center shrink-0 w-[280px] lg:w-auto">
                  <div className={`group relative h-full bg-card rounded-3xl border border-border p-6 lg:p-8 transition-all duration-500 ${step.borderGradient} hover:-translate-y-2`}>
                    {/* Decorative corner accent */}
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${step.gradient} opacity-10 rounded-bl-[100px] rounded-tr-3xl`} />
                    
                    {/* Step number - large background */}
                    <div className="absolute bottom-4 right-4 text-8xl font-black text-muted-foreground/[0.03] leading-none select-none">
                      {step.number}
                    </div>
                    
                    <div className="relative z-10">
                      {/* Icon with gradient background */}
                      <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${step.gradient} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <StepIcon className="h-6 w-6 text-primary-foreground" />
                      </div>
                      
                      {/* Step indicator */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          Step {step.number}
                        </span>
                        {index < steps.length - 1 && <ArrowRight className="hidden lg:block w-4 h-4 text-muted-foreground/30" />}
                      </div>
                      
                      <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>;
          })}
          </div>
          
          {/* Mobile scroll indicator */}
          <div className="flex lg:hidden justify-center gap-2 mt-6">
            {steps.map((step, i) => <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-primary' : 'bg-border'}`} />)}
          </div>
        </div>

        {/* Bottom CTA */}
        
      </div>
    </section>;
};
export default HowItWorks;