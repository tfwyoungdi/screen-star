import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Star, ArrowRight, MapPin, Clock, Briefcase, Users, 
  Heart, Zap, Coffee, Gift, Building2, Globe 
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Careers = () => {
  const benefits = [
    { icon: Heart, title: "Health & Wellness", description: "Comprehensive health, dental, and vision insurance" },
    { icon: Clock, title: "Flexible Hours", description: "Work when you're most productive" },
    { icon: Globe, title: "Remote First", description: "Work from anywhere in the world" },
    { icon: Gift, title: "Equity Package", description: "Own a piece of the company" },
    { icon: Coffee, title: "Learning Budget", description: "$2,000 annual learning stipend" },
    { icon: Zap, title: "Latest Tech", description: "Top-of-the-line equipment provided" },
  ];

  const openPositions = [
    {
      title: "Senior Full Stack Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: "Build and scale our core ticketing platform using React, Node.js, and PostgreSQL.",
    },
    {
      title: "Product Designer",
      department: "Design",
      location: "Remote / San Francisco",
      type: "Full-time",
      description: "Shape the future of cinema management with beautiful, intuitive interfaces.",
    },
    {
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "Remote",
      type: "Full-time",
      description: "Help our cinema partners succeed and grow with our platform.",
    },
    {
      title: "DevOps Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: "Build and maintain our cloud infrastructure for high availability and scale.",
    },
    {
      title: "Marketing Manager",
      department: "Marketing",
      location: "Remote / London",
      type: "Full-time",
      description: "Drive growth through creative campaigns and strategic partnerships.",
    },
    {
      title: "Technical Support Specialist",
      department: "Support",
      location: "Remote",
      type: "Full-time",
      description: "Provide exceptional technical support to our cinema partners worldwide.",
    },
  ];

  const getDepartmentColor = (department: string) => {
    const colors: Record<string, string> = {
      Engineering: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      Design: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      "Customer Success": "bg-green-500/20 text-green-400 border-green-500/30",
      Marketing: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      Support: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    };
    return colors[department] || "bg-primary/20 text-primary border-primary/30";
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">We're Hiring</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Build the Future of{" "}
              <span className="text-primary">Cinema Technology</span>
            </h1>

            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
              Join our passionate team and help revolutionize how cinemas operate worldwide. 
              We're remote-first, impact-driven, and growing fast.
            </p>

            <Button size="lg" className="group" asChild>
              <a href="#positions">
                View Open Positions
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-white/10" style={{ backgroundColor: '#0f0f15' }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">50+</div>
              <div className="text-sm text-white/60">Team Members</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">15+</div>
              <div className="text-sm text-white/60">Countries</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">100%</div>
              <div className="text-sm text-white/60">Remote Friendly</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">4.8</div>
              <div className="text-sm text-white/60">Glassdoor Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why Join CineTix?
            </h2>
            <p className="text-white/70 text-lg">
              We believe in taking care of our team so they can do their best work.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div 
                key={index} 
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-white/60 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions Section */}
      <section id="positions" className="py-20 lg:py-28 scroll-mt-24" style={{ backgroundColor: '#0f0f15' }}>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Open Positions
            </h2>
            <p className="text-white/70 text-lg">
              Find your next role and help us transform the cinema industry.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {openPositions.map((position, index) => (
              <div 
                key={index} 
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all group cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                        {position.title}
                      </h3>
                      <Badge variant="outline" className={getDepartmentColor(position.department)}>
                        {position.department}
                      </Badge>
                    </div>
                    <p className="text-white/60 text-sm mb-3">{position.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {position.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {position.type}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 shrink-0">
                    Apply Now
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Culture Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Our Culture
              </h2>
              <p className="text-white/70 text-lg leading-relaxed mb-6">
                We're a diverse, distributed team united by our passion for cinema and technology. 
                We believe in transparency, autonomy, and continuous learning.
              </p>
              <p className="text-white/70 text-lg leading-relaxed mb-8">
                Whether you're in San Francisco, London, or Tokyo, you'll be part of a 
                collaborative team that values your unique perspective and empowers you 
                to make an impact.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div 
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 border-2 border-[#0a0a0f] flex items-center justify-center"
                    >
                      <Users className="h-4 w-4 text-white" />
                    </div>
                  ))}
                </div>
                <span className="text-white/60 text-sm">Join 50+ team members</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-square rounded-xl overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=400&fit=crop"
                  alt="Team collaboration"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="aspect-square rounded-xl overflow-hidden mt-8">
                <img 
                  src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=400&fit=crop"
                  alt="Team meeting"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28" style={{ backgroundColor: '#0f0f15' }}>
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center p-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Don't See Your Role?
            </h2>
            <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
              We're always looking for talented people. Send us your resume and 
              we'll reach out when a matching opportunity opens up.
            </p>
            <Link to="/contact">
              <Button size="lg" className="group">
                Get in Touch
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Careers;
