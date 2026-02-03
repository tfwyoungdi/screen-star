import { Button } from "@/components/ui/button";
import { ArrowUpRight, Check } from "lucide-react";
import dashboardImage from "@/assets/dashboard-preview.jpg";
const Hero = () => {
  return <section className="relative min-h-screen overflow-hidden pt-24 lg:pt-28 pb-8">
      {/* Light lavender gradient background */}
      <div className="absolute inset-0" style={{
      background: 'linear-gradient(180deg, #ffffff 0%, #f8f7ff 40%, #f0eeff 70%, #e8e4ff 100%)'
    }} />

      <div className="container mx-auto px-4 relative z-10">
        {/* Main Content - Centered */}
        <div className="text-center max-w-3xl mx-auto mb-10 lg:mb-12">
          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold text-foreground leading-tight mb-6">
            The Complete{" "}
            <br className="hidden sm:block" />
            <span style={{
            color: '#4F46E5'
          }}>Cinema Ticketing</span>{" "}
            Solution
          </h1>

          {/* Subheading */}
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
            One powerful platform for unlimited cinemas. Ticketing software, 
            booking websites, custom domains, and role-based dashboards — 
            all in one place.
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{
              backgroundColor: '#4F46E5'
            }}>
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </div>
              <span>No credit card Required</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{
              backgroundColor: '#4F46E5'
            }}>
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </div>
              <span>Cancel Anytime</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="group gap-2 px-7 py-6 text-base font-semibold rounded-full shadow-lg hover:shadow-xl transition-all" style={{
            backgroundColor: '#4F46E5'
          }}>
              Get Started For Free
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4 text-white" />
              </div>
            </Button>
            <Button variant="outline" size="lg" className="px-7 py-6 text-base font-semibold rounded-full border-2 border-foreground/20 bg-white hover:bg-secondary/50">
              Request a Demo
            </Button>
          </div>
        </div>

        {/* Dashboard Preview with Floating Elements */}
        <div className="relative max-w-5xl mx-auto px-4 lg:px-8">
          {/* Floating Badges */}
          
          {/* System Analyst - Top Left */}
          <div className="absolute left-0 lg:-left-4 top-4 z-20 hidden md:flex items-center gap-2 bg-white px-4 py-2.5 rounded-full shadow-lg border border-gray-100">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-sm font-medium text-foreground">Cinema Manager</span>
          </div>

          {/* UI/UX Designer - Top Right */}
          <div className="absolute right-0 lg:-right-4 top-4 z-20 hidden md:flex items-center gap-2 bg-white px-4 py-2.5 rounded-full shadow-lg border border-gray-100">
            <div className="w-2 h-2 rounded-full" style={{
            backgroundColor: '#4F46E5'
          }} />
            <span className="text-sm font-medium text-foreground">Box Office</span>
          </div>

          {/* Product Dev - Left Side */}
          <div className="absolute -left-4 lg:-left-12 top-1/3 z-20 hidden lg:flex items-center gap-2 bg-white px-4 py-2.5 rounded-full shadow-lg border border-gray-100">
            <div className="w-2 h-2 rounded-full" style={{
            backgroundColor: '#3B82F6'
          }} />
            <span className="text-sm font-medium text-foreground">Ticket Sales</span>
          </div>

          {/* Leaders - Right Side (Blue background) */}
          <div className="absolute -right-4 lg:-right-8 top-1/4 z-20 hidden lg:block">
            <div className="px-5 py-2.5 rounded-lg shadow-lg" style={{
            backgroundColor: '#4F46E5'
          }}>
              <span className="text-sm font-semibold text-white">Leaders</span>
            </div>
          </div>

          {/* Human Resources - Bottom Left */}
          <div className="absolute -left-4 lg:-left-8 bottom-1/4 z-20 hidden lg:flex items-center gap-2 bg-white px-4 py-2.5 rounded-full shadow-lg border border-gray-100">
            <div className="w-2 h-2 rounded-full" style={{
            backgroundColor: '#8B5CF6'
          }} />
            <span className="text-sm font-medium text-foreground">Analytics</span>
          </div>

          {/* Developer - Right Side (with avatar style) */}
          <div className="absolute -right-4 lg:-right-8 bottom-1/3 z-20 hidden lg:block">
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg shadow-lg border border-gray-100">
              <div className="w-6 h-6 rounded-full" style={{
              backgroundColor: '#4F46E5'
            }} />
              <span className="text-sm font-medium text-foreground">Gate Staff</span>
            </div>
          </div>

          {/* Main Dashboard Image */}
          <div className="relative rounded-2xl overflow-hidden bg-white border border-gray-200" style={{
          boxShadow: '0 25px 50px -12px rgba(79, 70, 229, 0.15), 0 12px 24px -8px rgba(0, 0, 0, 0.1)'
        }}>
            <img alt="CineTix Dashboard Preview" className="w-full h-auto" src="/lovable-uploads/b13d9673-eda4-4b38-b030-abc2c46d7ac6.png" />
          </div>
        </div>
      </div>
    </section>;
};
export default Hero;