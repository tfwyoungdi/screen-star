import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Play, Zap, Shield, Clock } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-chart-3" />
      
      {/* Decorative grid pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-white/5 rounded-full blur-3xl rotate-12" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Main content card with glassmorphism */}
          <div className="relative rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl p-8 md:p-12 lg:p-16 shadow-2xl">
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-24 h-24 border-l-2 border-t-2 border-white/30 rounded-tl-3xl" />
            <div className="absolute bottom-0 right-0 w-24 h-24 border-r-2 border-b-2 border-white/30 rounded-br-3xl" />
            
            {/* Sparkle badge */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border border-white/30 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">Limited Time: 30-Day Free Trial</span>
              </div>
            </div>

            {/* Heading with gradient text */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-center mb-6 leading-tight">
              <span className="text-white">Ready to Transform Your</span>
              <br />
              <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                Cinema Business?
              </span>
            </h2>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 text-center leading-relaxed">
              Join 500+ cinemas already using CineTix to sell more tickets, 
              streamline operations, and delight their customers.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {[
                { icon: Zap, text: "Setup in 5 min" },
                { icon: Shield, text: "Enterprise Security" },
                { icon: Clock, text: "24/7 Support" },
              ].map((feature, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20"
                >
                  <feature.icon className="h-4 w-4 text-white/90" />
                  <span className="text-sm text-white/90">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg" 
                className="group gap-2 px-8 py-6 text-base font-semibold rounded-full bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl transition-all"
              >
                <Play className="h-5 w-5 fill-current" />
                Start Your Free Trial
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                className="px-8 py-6 text-base font-semibold rounded-full bg-transparent border-2 border-white/40 text-white hover:bg-white/10 hover:border-white/60 transition-all"
              >
                Schedule a Demo
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-white/70 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4'].map((color, i) => (
                    <div 
                      key={i} 
                      className={`w-8 h-8 rounded-full ${color} border-2 border-white/30 flex items-center justify-center`}
                    >
                      <span className="text-xs font-bold text-white">
                        {['J', 'M', 'K', 'L'][i]}
                      </span>
                    </div>
                  ))}
                </div>
                <span>500+ cinemas trust us</span>
              </div>
              <div className="hidden sm:block w-px h-5 bg-white/30" />
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
                <span className="ml-1">4.9/5 rating</span>
              </div>
            </div>
          </div>

          {/* Bottom floating cards */}
          <div className="hidden lg:flex justify-between mt-8 px-12">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 -rotate-3 hover:rotate-0 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-xl">🎬</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Quick Setup</p>
                <p className="text-xs text-white/60">Be live in minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 rotate-3 hover:rotate-0 transition-transform">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-xl">💳</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">No Credit Card</p>
                <p className="text-xs text-white/60">Required to start</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
