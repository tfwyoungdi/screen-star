import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Film, Users, Star, Award, Target, Heart, ArrowRight, Play, CheckCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const About = () => {
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
    },
    {
      icon: Heart,
      title: "Customer Obsessed",
      description: "Your success is our success. We're dedicated to providing exceptional support and building features you actually need.",
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "We listen to our community of cinema operators and incorporate their feedback into every product decision.",
    },
  ];

  const team = [
    { name: "Sarah Chen", role: "CEO & Co-founder", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop" },
    { name: "Marcus Johnson", role: "CTO & Co-founder", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop" },
    { name: "Emily Rodriguez", role: "Head of Product", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop" },
    { name: "David Kim", role: "Head of Engineering", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Star className="h-4 w-4 text-primary fill-primary" />
              <span className="text-sm font-medium text-primary">Our Story</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Revolutionizing the{" "}
              <span className="text-primary">Cinema Experience</span>
            </h1>

            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              We're on a mission to empower independent cinemas with enterprise-grade technology, 
              making world-class ticketing accessible to everyone.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-white/10" style={{ backgroundColor: '#0f0f15' }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-primary/10 mb-4">
                  <stat.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-sm text-white/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Built by Cinema Lovers,{" "}
                <span className="text-primary">For Cinema Lovers</span>
              </h2>
              <p className="text-white/70 text-lg leading-relaxed mb-6">
                CineTix was born from a simple observation: independent cinemas deserve the same 
                powerful tools as major chains, without the complexity or cost.
              </p>
              <p className="text-white/70 text-lg leading-relaxed mb-8">
                Founded in 2020, we've grown from a small startup to serving over 500 cinemas 
                worldwide. Our platform handles millions of tickets, but we've never lost sight 
                of our core mission — making cinema management simple and delightful.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/signup">
                  <Button size="lg" className="group">
                    Start Free Trial
                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="group border-white/20 text-white hover:bg-white/10">
                  <Play className="h-5 w-5 mr-2" />
                  Watch Our Story
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-white/10">
                <img 
                  src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=450&fit=crop"
                  alt="Cinema audience"
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center cursor-pointer hover:bg-primary transition-colors">
                    <Play className="h-8 w-8 text-primary-foreground ml-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 lg:py-28" style={{ backgroundColor: '#0f0f15' }}>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Our Core Values
            </h2>
            <p className="text-white/70 text-lg">
              These principles guide everything we do, from product development to customer support.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div 
                key={index} 
                className="p-8 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors group"
              >
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <value.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                <p className="text-white/60 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Meet Our Leadership
            </h2>
            <p className="text-white/70 text-lg">
              A passionate team dedicated to transforming the cinema industry.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
            {team.map((member, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-4 overflow-hidden rounded-xl aspect-square">
                  <img 
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{member.name}</h3>
                <p className="text-sm text-white/60">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 lg:py-28" style={{ backgroundColor: '#0f0f15' }}>
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-1 gap-4">
                {[
                  "No hidden fees or complicated pricing",
                  "24/7 dedicated customer support",
                  "99.9% uptime guarantee",
                  "Free data migration assistance",
                  "Regular feature updates",
                  "GDPR compliant & secure",
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-white">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Why Cinemas{" "}
                <span className="text-primary">Choose Us</span>
              </h2>
              <p className="text-white/70 text-lg leading-relaxed mb-6">
                We're not just another software vendor. We're your partner in success, 
                committed to helping you grow your cinema business.
              </p>
              <p className="text-white/70 text-lg leading-relaxed">
                From day one, you'll have access to our full suite of features, 
                dedicated support team, and a community of cinema operators who share 
                best practices and insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center p-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Cinema?
            </h2>
            <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
              Join 500+ cinemas already using CineTix to streamline their operations 
              and delight their audiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="group">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/#pricing">
                <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
