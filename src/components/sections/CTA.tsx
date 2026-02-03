import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Play, Ticket, Users, TrendingUp, CheckCircle2 } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden bg-background">
      {/* Background with contained gradient on right side only */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Soft gradient on right side - doesn't overlap left content */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 via-primary/5 to-transparent hidden lg:block" />
        
        {/* Decorative blurred orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-chart-3/10 rounded-full blur-3xl" />

        {/* Floating geometric shapes - subtle borders */}
        <div className="absolute top-20 left-[10%] w-32 h-32 border border-border rounded-3xl rotate-12 hidden lg:block" />
        <div className="absolute bottom-32 left-[5%] w-20 h-20 bg-secondary/50 rounded-2xl -rotate-6 hidden lg:block" />
        <div className="absolute top-1/3 right-[8%] w-16 h-16 border border-primary/30 rounded-full hidden lg:block" />
        <div className="absolute bottom-20 right-[15%] w-24 h-24 border border-primary/20 rounded-3xl rotate-45 hidden lg:block" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left side - Content */}
          <div className="order-2 lg:order-1">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Start Free • No Credit Card</span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1]">
              Ready to
              <span className="block text-primary">Transform Your</span>
              Cinema Business?
            </h2>

            {/* Description */}
            <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
              Join 500+ cinemas already using CineTix to sell more tickets, 
              streamline operations, and delight their customers.
            </p>

            {/* Checklist */}
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {[
                "Unlimited tickets & screens",
                "Custom branded website",
                "Real-time analytics",
                "24/7 priority support"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button 
                size="lg" 
                className="group gap-2 px-8 py-6 text-base font-semibold rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                <Play className="h-5 w-5 fill-current" />
                Start Your Free Trial
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline"
                size="lg" 
                className="px-8 py-6 text-base font-semibold rounded-full border-2"
              >
                Schedule a Demo
              </Button>
            </div>

            {/* Social proof row */}
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-primary'].map((color, i) => (
                  <div 
                    key={i} 
                    className={`w-10 h-10 rounded-full ${color} border-2 border-background flex items-center justify-center shadow-md`}
                  >
                    <span className="text-xs font-bold text-white drop-shadow-sm">
                      {['J', 'M', 'K', 'A'][i]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-1 mb-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                  <span className="text-foreground font-medium ml-1">4.9</span>
                </div>
                <p className="text-muted-foreground">from 500+ cinema owners</p>
              </div>
            </div>
          </div>

          {/* Right side - Stats cards */}
          <div className="order-1 lg:order-2 relative">
            {/* Main stat card */}
            <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl border border-border p-8 shadow-2xl">
              {/* Glow effect */}
              <div className="absolute -inset-px bg-gradient-to-br from-primary/20 via-transparent to-chart-3/20 rounded-3xl blur-xl opacity-50" />
              
              <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Average Results</p>
                      <p className="text-lg font-semibold text-foreground">First 90 Days</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-chart-3/10 text-chart-3 text-xs font-medium">
                    +127% Growth
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  {[
                    { value: "40%", label: "More Tickets Sold", icon: Ticket, color: "text-primary" },
                    { value: "3.2x", label: "Revenue Increase", icon: TrendingUp, color: "text-chart-3" },
                    { value: "85%", label: "Time Saved", icon: Sparkles, color: "text-chart-4" },
                    { value: "2M+", label: "Happy Customers", icon: Users, color: "text-chart-2" },
                  ].map((stat, i) => (
                    <div key={i} className="text-center p-4 rounded-2xl bg-secondary/50 border border-border/50">
                      <stat.icon className={`h-5 w-5 ${stat.color} mx-auto mb-2`} />
                      <p className={`text-2xl md:text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Bottom bar chart visualization */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Before CineTix</span>
                    <span className="text-muted-foreground">After CineTix</span>
                  </div>
                  <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 w-[35%] bg-muted-foreground/30 rounded-full" />
                    <div className="absolute inset-y-0 left-0 w-[85%] bg-gradient-to-r from-primary to-chart-3 rounded-full shadow-lg" />
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Average ticket sales comparison
                  </p>
                </div>
              </div>
            </div>

            {/* Floating mini cards */}
            <div className="absolute -left-4 lg:-left-8 top-1/4 bg-card rounded-2xl border border-border p-4 shadow-xl hidden md:block animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Just sold</p>
                  <p className="text-sm font-semibold text-foreground">247 tickets</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 lg:-right-8 bottom-1/4 bg-card rounded-2xl border border-border p-4 shadow-xl hidden md:block animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">New cinema</p>
                  <p className="text-sm font-semibold text-foreground">joined today!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
