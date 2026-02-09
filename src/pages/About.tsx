import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Film, Users, Star, Award, Target, Heart, ArrowRight, ArrowUpRight, CheckCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
const stats = [{
  label: "Active Cinemas",
  value: "500+",
  icon: Film
}, {
  label: "Tickets Sold",
  value: "2M+",
  icon: Award
}, {
  label: "Customer Rating",
  value: "4.9/5",
  icon: Star
}, {
  label: "Team Members",
  value: "50+",
  icon: Users
}];
const values = [{
  icon: Target,
  title: "Innovation First",
  description: "We constantly push boundaries to deliver cutting-edge cinema technology that keeps you ahead of the curve.",
  gradient: "from-primary/20 via-primary/10 to-transparent"
}, {
  icon: Heart,
  title: "Customer Obsessed",
  description: "Your success is our success. We're dedicated to providing exceptional support and building features you actually need.",
  gradient: "from-chart-3/20 via-chart-3/10 to-transparent"
}, {
  icon: Users,
  title: "Community Driven",
  description: "We listen to our community of cinema operators and incorporate their feedback into every product decision.",
  gradient: "from-chart-4/20 via-chart-4/10 to-transparent"
}];
const team = [{
  name: "Sarah Chen",
  role: "CEO & Co-founder",
  image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop"
}, {
  name: "Marcus Johnson",
  role: "CTO & Co-founder",
  image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"
}, {
  name: "Emily Rodriguez",
  role: "Head of Product",
  image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop"
}, {
  name: "David Kim",
  role: "Head of Engineering",
  image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop"
}];
const whyChooseUs = ["No hidden fees or complicated pricing", "24/7 dedicated customer support", "99.9% uptime guarantee", "Free data migration assistance", "Regular feature updates", "GDPR compliant & secure"];
const About = () => {
  return <div className="min-h-screen bg-background text-foreground">
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
      

      {/* Mission Section */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Built by Cinema Lovers,{" "}
                <span className="text-primary">For Cinema Lovers</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Cinitix was born from a simple observation: independent cinemas deserve the same 
                powerful tools as major chains, without the complexity or cost.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Founded in 2020, we've grown from a small startup to serving over 500 cinemas 
                worldwide. Our platform handles millions of tickets, but we've never lost sight 
                of our core mission — making cinema management simple and delightful.
              </p>
              <Button asChild size="lg" className="group gap-2 rounded-full px-7 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
                <Link to="/download">
                  Download Now
                  <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <ArrowUpRight className="h-4 w-4 text-primary-foreground" />
                  </div>
                </Link>
              </Button>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-3xl overflow-hidden bg-card border border-border shadow-2xl">
                <img src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=450&fit=crop" alt="Cinema audience enjoying a movie" className="w-full h-full object-cover" loading="lazy" />
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
            {values.map((value, index) => <div key={index} className="group relative overflow-hidden rounded-3xl bg-card border border-border p-8 hover:border-primary/40 transition-all duration-500">
                <div className={`absolute inset-0 bg-gradient-to-br ${value.gradient} opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className="inline-flex p-3 rounded-xl mb-5 group-hover:scale-110 transition-transform duration-300">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{value.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                </div>
              </div>)}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-semibold text-primary tracking-wide uppercase">Team</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Meet Our Leadership
            </h2>
            <p className="text-lg text-muted-foreground">
              A passionate team dedicated to transforming the cinema industry.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {team.map((member, index) => <div key={index} className="text-center group">
                <div className="relative mb-4 overflow-hidden rounded-3xl aspect-square bg-card border border-border shadow-md">
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.role}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-1 gap-4">
                {whyChooseUs.map((item, index) => <div key={index} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{item}</span>
                  </div>)}
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
            <Button asChild size="lg" variant="secondary" className="rounded-full gap-2 px-8 text-base font-semibold">
              <Link to="/download">
                Download Now
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
};
export default About;