import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Play, Ticket, Users, TrendingUp, CheckCircle2 } from "lucide-react";
const CTA = () => {
  return (
    <section className="py-24 lg:py-32 bg-primary relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary-foreground/10 rounded-full blur-3xl" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 mb-8">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
            <span className="text-primary-foreground text-sm font-semibold">Start Your Free Trial</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Ready to Transform Your Cinema?
          </h2>
          
          <p className="text-lg text-primary-foreground/80 leading-relaxed mb-10 max-w-2xl mx-auto">
            Join hundreds of cinemas already using Cinitix to streamline operations, 
            boost ticket sales, and delight their customers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              variant="secondary"
              className="rounded-full gap-2 px-8 text-base font-semibold"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="ghost"
              className="rounded-full gap-2 px-8 text-base font-semibold text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Play className="h-5 w-5" />
              Watch Demo
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-6 lg:gap-8 text-primary-foreground/80">
            <div className="flex items-center justify-center gap-2 min-h-[44px]">
              <CheckCircle2 className="h-5 w-5 text-primary-foreground flex-shrink-0" />
              <span className="text-sm sm:text-base">14-day free trial</span>
            </div>
            <div className="flex items-center justify-center gap-2 min-h-[44px]">
              <CheckCircle2 className="h-5 w-5 text-primary-foreground flex-shrink-0" />
              <span className="text-sm sm:text-base">No credit card required</span>
            </div>
            <div className="flex items-center justify-center gap-2 min-h-[44px]">
              <CheckCircle2 className="h-5 w-5 text-primary-foreground flex-shrink-0" />
              <span className="text-sm sm:text-base">Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default CTA;