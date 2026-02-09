import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Film, Users, Star, Award, Target, Heart, ArrowRight, ArrowUpRight, CheckCircle, Zap, Shield, BarChart3, Quote } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const stats = [
  { label: "Active Cinemas", value: "500+", icon: Film },
  { label: "Tickets Sold", value: "2M+", icon: Award },
  { label: "Customer Rating", value: "4.9/5", icon: Star },
  { label: "Team Members", value: "50+", icon: Users },
];

const values = [
  {
    icon: Target,
    title: "Innovation First",
    description: "We constantly push boundaries to deliver cutting-edge cinema technology that keeps you ahead of the curve.",
    gradient: "from-primary/20 via-primary/10 to-transparent",
  },
  {
    icon: Heart,
    title: "Customer Obsessed",
    description: "Your success is our success. We're dedicated to providing exceptional support and building features you actually need.",
    gradient: "from-chart-3/20 via-chart-3/10 to-transparent",
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "We listen to our community of cinema operators and incorporate their feedback into every product decision.",
    gradient: "from-chart-4/20 via-chart-4/10 to-transparent",
  },
];


const whyChooseUs = [
  "No hidden fees or complicated pricing",
  "24/7 dedicated customer support",
  "99.9% uptime guarantee",
  "Free data migration assistance",
  "Regular feature updates",
  "GDPR compliant & secure",
];

const About = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-secondary/50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-chart-3/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-semibold text-primary tracking-wide uppercase">Our Story</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold text-foreground leading-tight mb-6">
              Revolutionizing the{" "}
              <span className="text-primary">Cinema Experience</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              We're on a mission to empower independent cinemas with enterprise-grade technology, 
              making world-class ticketing accessible to everyone.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                  <stat.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 lg:py-28 bg-background relative overflow-hidden">
        <div className="absolute top-1/2 -translate-y-1/2 -right-40 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10">
          {/* Section header - centered */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-semibold text-primary tracking-wide uppercase">Our Mission</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Built by Cinema Lovers,{" "}
              <span className="text-primary">For Cinema Lovers</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Cinitix was born from a simple observation: independent cinemas deserve the same 
              powerful tools as major chains without the complexity or cost.
            </p>
          </div>

          {/* Two-column: content pillars + image */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div className="space-y-6">
              {/* Content cards */}
              <div className="group relative rounded-2xl bg-card border border-border p-6 hover:border-primary/30 transition-all duration-300">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Leveling the Playing Field</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      We exist to empower independent and community cinemas with smart, easy-to-use digital solutions 
                      that simplify operations, boost visibility, and improve the moviegoing experience.
                    </p>
                  </div>
                </div>
              </div>

              <div className="group relative rounded-2xl bg-card border border-border p-6 hover:border-primary/30 transition-all duration-300">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">One Streamlined Platform</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      From ticketing and scheduling to audience engagement and data insights — Cinitix brings 
                      everything together in one platform designed specifically for smaller cinema operators.
                    </p>
                  </div>
                </div>
              </div>

              <div className="group relative rounded-2xl bg-card border border-border p-6 hover:border-primary/30 transition-all duration-300">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Built for Real-World Workflows</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Unlike bloated enterprise systems, Cinitix is built with clarity, flexibility, and affordability. 
                      We understand tight margins, limited staff, and the need to move fast.
                    </p>
                  </div>
                </div>
              </div>

              <Button asChild size="lg" className="group gap-2 rounded-full px-7 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all mt-2">
                <Link to="/download">
                  Download Now
                  <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <ArrowUpRight className="h-4 w-4 text-primary-foreground" />
                  </div>
                </Link>
              </Button>
            </div>

            {/* Right column: image + pull quote */}
            <div className="space-y-6">
              <div className="relative rounded-3xl overflow-hidden bg-card border border-border shadow-2xl">
                <div className="aspect-[4/3]">
                  <img 
                    src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop"
                    alt="Cinema audience enjoying a movie"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
              
              {/* Pull quote */}
              <div className="relative rounded-2xl bg-primary/5 border border-primary/15 p-6">
                <Quote className="h-8 w-8 text-primary/30 mb-3" />
                <p className="text-foreground font-medium leading-relaxed italic">
                  "Independent cinemas are cultural hubs that deserve modern technology without compromise. 
                  Our mission is to empower them to compete, grow, and thrive — while staying focused on 
                  what truly matters: great films and memorable experiences."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-semibold text-primary tracking-wide uppercase">Values</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Our Core Values
            </h2>
            <p className="text-lg text-muted-foreground">
              These principles guide everything we do, from product development to customer support.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 lg:gap-6">
            {values.map((value, index) => (
              <div 
                key={index} 
                className="group relative overflow-hidden rounded-3xl bg-card border border-border p-8 hover:border-primary/40 transition-all duration-500"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${value.gradient} opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className="inline-flex p-3 rounded-xl mb-5 group-hover:scale-110 transition-transform duration-300">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{value.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Why Choose Us Section */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-1 gap-4">
                {whyChooseUs.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Why Cinemas{" "}
                <span className="text-primary">Choose Us</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                We're not just another software vendor. We're your partner in success, 
                committed to helping you grow your cinema business.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                From day one, you'll have access to our full suite of features, 
                dedicated support team, and a community of cinema operators who share 
                best practices and insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary-foreground/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
              Ready to Transform Your Cinema?
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
              Join 500+ cinemas already using Cinitix to streamline their operations 
              and delight their audiences.
            </p>
            <Button 
              asChild
              size="lg" 
              variant="secondary"
              className="rounded-full gap-2 px-8 text-base font-semibold"
            >
              <Link to="/download">
                Download Now
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
