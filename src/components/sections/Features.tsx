import { 
  LayoutDashboard, 
  Globe, 
  CreditCard, 
  Users, 
  QrCode, 
  BarChart3,
  Palette,
  Shield,
  Zap
} from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Cinema Admin Dashboard",
    description: "Complete control center for cinema management. Movies, showtimes, halls, seating layouts, pricing, and promotions.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Globe,
    title: "Custom Domain & Website",
    description: "Every cinema gets a ready-made booking website. Choose themes, upload branding, and connect your own domain.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: CreditCard,
    title: "Payment Gateway Setup",
    description: "Integrate your preferred payment providers. Stripe, PayPal, or local payment methods — all supported.",
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description: "Box Office, Gate Staff, Managers, Accountants — each role sees exactly what they need. Same system, tailored views.",
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
  {
    icon: QrCode,
    title: "QR Ticket System",
    description: "Digital tickets with unique QR codes. Gate staff can scan and validate entries in seconds.",
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Real-time insights on sales, attendance, and revenue. Make data-driven decisions for your cinema.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

const platformBenefits = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized for speed. Customers book in under 30 seconds.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption. Your data is always protected.",
  },
  {
    icon: Palette,
    title: "Fully Customizable",
    description: "Match your brand with custom themes and styling.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 lg:py-32 bg-card relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Everything Your Cinema Needs
          </h2>
          <p className="text-lg text-muted-foreground">
            A complete SaaS platform designed specifically for cinema businesses. 
            From ticketing to analytics, we've got you covered.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 lg:p-8 rounded-2xl bg-background border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`inline-flex p-3 rounded-xl ${feature.bgColor} mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Platform Benefits */}
        <div className="bg-background rounded-3xl p-8 lg:p-12 border border-border">
          <div className="grid lg:grid-cols-3 gap-8">
            {platformBenefits.map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
