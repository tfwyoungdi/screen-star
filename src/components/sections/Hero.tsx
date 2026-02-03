import { Button } from "@/components/ui/button";
import { ArrowUpRight, Check, Users, Ticket, Star } from "lucide-react";
import dashboardImage from "@/assets/dashboard-preview.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen overflow-hidden pt-24 lg:pt-28">
      {/* Light gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />
      
      {/* Subtle radial gradient accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-primary/5 via-transparent to-transparent rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Main Content - Centered */}
        <div className="text-center max-w-4xl mx-auto mb-12 lg:mb-16">
          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
            The Complete{" "}
            <span className="text-primary">Cinema Ticketing</span>{" "}
            Solution
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            One powerful platform for unlimited cinemas. Ticketing software, 
            booking websites, custom domains, and role-based dashboards — 
            all in one place.
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-3 h-3 text-primary" />
              </div>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-3 h-3 text-primary" />
              </div>
              <span>Cancel Anytime</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="group gap-2 px-8 py-6 text-base font-semibold rounded-full shadow-lg hover:shadow-xl transition-all">
              Get Started For Free
              <ArrowUpRight className="h-5 w-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="px-8 py-6 text-base font-semibold rounded-full border-2 hover:bg-secondary/50">
              Request a Demo
            </Button>
          </div>
        </div>

        {/* Dashboard Preview with Floating Elements */}
        <div className="relative max-w-5xl mx-auto">
          {/* Floating Badges - Desktop Only */}
          <div className="hidden lg:block">
            {/* Top Left Badge */}
            <div className="absolute -left-8 top-8 z-20 animate-fade-in">
              <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-lg border border-border">
                <div className="w-2 h-2 rounded-full bg-chart-3 animate-pulse" />
                <span className="text-sm font-medium text-foreground">Cinema Manager</span>
              </div>
            </div>

            {/* Top Right Badge */}
            <div className="absolute -right-4 top-4 z-20 animate-fade-in delay-100">
              <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-lg border border-border">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-foreground">Box Office</span>
              </div>
            </div>

            {/* Bottom Left Badge */}
            <div className="absolute -left-4 bottom-24 z-20 animate-fade-in delay-200">
              <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-lg border border-border">
                <div className="w-2 h-2 rounded-full bg-chart-2 animate-pulse" />
                <span className="text-sm font-medium text-foreground">Concessions</span>
              </div>
            </div>

            {/* Right Side Badge */}
            <div className="absolute -right-8 bottom-32 z-20 animate-fade-in delay-300">
              <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-lg border border-border">
                <div className="w-2 h-2 rounded-full bg-chart-4 animate-pulse" />
                <span className="text-sm font-medium text-foreground">Analytics</span>
              </div>
            </div>

            {/* Leaders Badge - Styled differently */}
            <div className="absolute right-8 top-24 z-20 animate-fade-in delay-150">
              <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
                <span className="text-sm font-semibold">Industry Leaders</span>
              </div>
            </div>
          </div>

          {/* Main Dashboard Image */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card">
            <img
              src={dashboardImage}
              alt="CineTix Dashboard Preview"
              className="w-full h-auto"
            />
            {/* Gradient Overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap justify-center gap-8 lg:gap-16 mt-8 lg:mt-12">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">500+</p>
                <p className="text-sm text-muted-foreground">Active Cinemas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">2M+</p>
                <p className="text-sm text-muted-foreground">Tickets Sold</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Star className="h-6 w-6 text-primary fill-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">4.9/5</p>
                <p className="text-sm text-muted-foreground">Customer Rating</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
