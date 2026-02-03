import { 
  LayoutDashboard, 
  Globe, 
  CreditCard, 
  Users, 
  QrCode, 
  BarChart3,
  Palette,
  Shield,
  Zap,
  ArrowRight,
  Check
} from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Cinema Admin Dashboard",
    description: "Complete control center for cinema management. Movies, showtimes, halls, seating layouts, pricing, and promotions.",
    gradient: "from-primary/20 via-primary/10 to-transparent",
    iconBg: "bg-primary",
    size: "large",
    highlights: ["Movie Management", "Showtime Scheduling", "Pricing Control"],
  },
  {
    icon: Globe,
    title: "Custom Domain & Website",
    description: "Every cinema gets a ready-made booking website. Choose themes, upload branding, and connect your own domain.",
    gradient: "from-chart-3/20 via-chart-3/10 to-transparent",
    iconBg: "bg-chart-3",
    size: "medium",
  },
  {
    icon: CreditCard,
    title: "Payment Gateway Setup",
    description: "Integrate your preferred payment providers. Stripe, PayPal, or local payment methods — all supported.",
    gradient: "from-chart-4/20 via-chart-4/10 to-transparent",
    iconBg: "bg-chart-4",
    size: "medium",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description: "Box Office, Gate Staff, Managers, Accountants — each role sees exactly what they need. Same system, tailored views.",
    gradient: "from-chart-5/20 via-chart-5/10 to-transparent",
    iconBg: "bg-chart-5",
    size: "medium",
  },
  {
    icon: QrCode,
    title: "QR Ticket System",
    description: "Digital tickets with unique QR codes. Gate staff can scan and validate entries in seconds.",
    gradient: "from-chart-2/20 via-chart-2/10 to-transparent",
    iconBg: "bg-chart-2",
    size: "medium",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Real-time insights on sales, attendance, and revenue. Make data-driven decisions for your cinema.",
    gradient: "from-primary/20 via-primary/10 to-transparent",
    iconBg: "bg-primary",
    size: "large",
    highlights: ["Revenue Tracking", "Attendance Insights", "Performance Metrics"],
  },
];

const platformBenefits = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized for speed. Customers book in under 30 seconds.",
    stat: "< 30s",
    statLabel: "Booking Time",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption. Your data is always protected.",
    stat: "256-bit",
    statLabel: "Encryption",
  },
  {
    icon: Palette,
    title: "Fully Customizable",
    description: "Match your brand with custom themes and styling.",
    stat: "100%",
    statLabel: "Brandable",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-chart-3/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-sm font-semibold tracking-wide uppercase">Features</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Everything Your Cinema Needs
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A complete SaaS platform designed specifically for cinema businesses. 
            From ticketing to analytics, we've got you covered.
          </p>
        </div>

        {/* Bento Grid Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-16">
          {/* Large Feature Card - Dashboard */}
          <div className="md:col-span-2 lg:col-span-2 group relative overflow-hidden rounded-3xl bg-card border border-border p-8 lg:p-10 hover:border-primary/40 transition-all duration-500">
            <div className={`absolute inset-0 bg-gradient-to-br ${features[0].gradient} opacity-50`} />
            <div className="relative z-10">
              <div className={`inline-flex p-4 rounded-2xl ${features[0].iconBg} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <LayoutDashboard className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">
                {features[0].title}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {features[0].description}
              </p>
              <div className="flex flex-wrap gap-2">
                {features[0].highlights?.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 border border-border text-sm text-foreground">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Medium Feature Cards */}
          {features.slice(1, 3).map((feature, index) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-3xl bg-card border border-border p-6 lg:p-8 hover:border-primary/40 transition-all duration-500"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className={`inline-flex p-3 rounded-xl ${feature.iconBg} mb-5 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}

          {/* Medium Feature Cards - Second Row */}
          {features.slice(3, 5).map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-3xl bg-card border border-border p-6 lg:p-8 hover:border-primary/40 transition-all duration-500"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-50 transition-opacity duration-500`} />
              <div className="relative z-10">
                <div className={`inline-flex p-3 rounded-xl ${feature.iconBg} mb-5 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}

          {/* Large Feature Card - Analytics */}
          <div className="md:col-span-2 lg:col-span-2 group relative overflow-hidden rounded-3xl bg-card border border-border p-8 lg:p-10 hover:border-primary/40 transition-all duration-500">
            <div className={`absolute inset-0 bg-gradient-to-br ${features[5].gradient} opacity-50`} />
            <div className="relative z-10">
              <div className={`inline-flex p-4 rounded-2xl ${features[5].iconBg} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <BarChart3 className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">
                {features[5].title}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {features[5].description}
              </p>
              <div className="flex flex-wrap gap-2">
                {features[5].highlights?.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 border border-border text-sm text-foreground">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Platform Benefits - Premium Modern Design */}
        <div className="relative mt-8">
          {/* Section Label */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="h-px flex-1 max-w-20 bg-gradient-to-r from-transparent to-border" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Why Choose Us</span>
            <div className="h-px flex-1 max-w-20 bg-gradient-to-l from-transparent to-border" />
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {platformBenefits.map((benefit, index) => (
              <div 
                key={benefit.title} 
                className="group relative"
              >
                {/* Glow effect on hover */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-chart-3/50 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
                
                {/* Card */}
                <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-b from-card via-card to-secondary/20 border border-border p-8 transition-all duration-500 group-hover:border-primary/30 group-hover:shadow-2xl">
                  {/* Background Pattern */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />
                  
                  {/* Stat Badge */}
                  <div className="relative mb-6">
                    <div className="inline-flex flex-col items-start">
                      <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-chart-3 bg-clip-text text-transparent">
                        {benefit.stat}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1 font-medium">
                        {benefit.statLabel}
                      </div>
                    </div>
                  </div>

                  {/* Icon with animated ring */}
                  <div className="relative mb-5">
                    <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 w-fit group-hover:scale-110 transition-transform duration-300">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>

                  {/* Decorative corner element */}
                  <div className="absolute bottom-0 left-0 w-16 h-16">
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary/20 rounded-bl-lg group-hover:border-primary/40 transition-colors duration-300" />
                  </div>
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
