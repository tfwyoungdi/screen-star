import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Play, Ticket, Users, TrendingUp, CheckCircle2 } from "lucide-react";
const CTA = () => {
  return <section className="py-24 lg:py-32 relative overflow-hidden bg-background">
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
        
      </div>
    </section>;
};
export default CTA;