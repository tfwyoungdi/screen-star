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
   Sparkles,
   Star
 } from "lucide-react";
 
 const features = [
   {
     icon: LayoutDashboard,
     title: "Cinema Admin Dashboard",
     description: "Complete control center for cinema management. Movies, showtimes, halls, seating layouts, pricing, and promotions.",
     color: "bg-primary",
     accent: "text-primary",
     blob: "bg-primary/20",
   },
   {
     icon: Globe,
     title: "Custom Domain & Website",
     description: "Every cinema gets a ready-made booking website. Choose themes, upload branding, and connect your own domain.",
     color: "bg-chart-3",
     accent: "text-chart-3",
     blob: "bg-chart-3/20",
   },
   {
     icon: CreditCard,
     title: "Payment Gateway Setup",
     description: "Integrate your preferred payment providers. Stripe, PayPal, or local payment methods — all supported.",
     color: "bg-chart-4",
     accent: "text-chart-4",
     blob: "bg-chart-4/20",
   },
   {
     icon: Users,
     title: "Role-Based Access",
     description: "Box Office, Gate Staff, Managers, Accountants — each role sees exactly what they need. Same system, tailored views.",
     color: "bg-chart-5",
     accent: "text-chart-5",
     blob: "bg-chart-5/20",
   },
   {
     icon: QrCode,
     title: "QR Ticket System",
     description: "Digital tickets with unique QR codes. Gate staff can scan and validate entries in seconds.",
     color: "bg-chart-2",
     accent: "text-chart-2",
     blob: "bg-chart-2/20",
   },
   {
     icon: BarChart3,
     title: "Analytics & Reports",
     description: "Real-time insights on sales, attendance, and revenue. Make data-driven decisions for your cinema.",
     color: "bg-primary",
     accent: "text-primary",
     blob: "bg-primary/20",
   },
 ];
 
 const platformBenefits = [
   {
     icon: Zap,
     title: "Lightning Fast",
     description: "Optimized for speed. Customers book in under 30 seconds.",
     stat: "30s",
     emoji: "⚡",
   },
   {
     icon: Shield,
     title: "Enterprise Security",
     description: "Bank-level encryption. Your data is always protected.",
     stat: "256-bit",
     emoji: "🔒",
   },
   {
     icon: Palette,
     title: "Fully Customizable",
     description: "Match your brand with custom themes and styling.",
     stat: "100%",
     emoji: "🎨",
   },
 ];
 
 const Features = () => {
   return (
     <section id="features" className="py-24 lg:py-32 bg-muted/30 relative overflow-hidden">
       {/* Playful floating shapes */}
       <div className="absolute top-10 left-[10%] w-20 h-20 bg-primary/10 rounded-full animate-bounce" style={{ animationDuration: '3s' }} />
       <div className="absolute top-40 right-[15%] w-14 h-14 bg-chart-3/15 rounded-2xl rotate-12 animate-pulse" />
       <div className="absolute bottom-32 left-[20%] w-16 h-16 bg-chart-4/10 rounded-full animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }} />
       <div className="absolute bottom-20 right-[10%] w-24 h-24 bg-chart-5/10 rounded-3xl -rotate-12 animate-pulse" style={{ animationDuration: '2s' }} />
       
       {/* Decorative dots pattern */}
       <div className="absolute inset-0 opacity-[0.03]" style={{
         backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
         backgroundSize: '24px 24px'
       }} />
       
       <div className="container mx-auto px-4 relative z-10">
         {/* Section Header - Playful Style */}
         <div className="text-center max-w-3xl mx-auto mb-16">
           <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border-2 border-dashed border-primary/30 mb-6 shadow-sm">
             <Sparkles className="w-4 h-4 text-primary animate-pulse" />
             <span className="text-primary text-sm font-bold tracking-wide">Packed with Features</span>
             <Star className="w-4 h-4 text-primary fill-primary/20" />
           </div>
           <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
             Everything Your Cinema 
             <span className="relative inline-block mx-2">
               <span className="relative z-10">Needs</span>
               <svg className="absolute -bottom-1 left-0 w-full h-3 text-primary/30" viewBox="0 0 100 12" preserveAspectRatio="none">
                 <path d="M0,8 Q25,0 50,8 T100,8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
               </svg>
             </span>
             🎬
           </h2>
           <p className="text-lg text-muted-foreground leading-relaxed">
             A complete SaaS platform designed specifically for cinema businesses. 
             From ticketing to analytics, we've got you covered.
           </p>
         </div>
 
         {/* Feature Cards - Illustrated Style */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
           {features.map((feature, index) => (
             <div
               key={feature.title}
               className="group relative bg-card rounded-[2rem] p-8 border-2 border-border hover:border-primary/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
               style={{ animationDelay: `${index * 100}ms` }}
             >
               {/* Blob decoration */}
               <div className={`absolute top-4 right-4 w-24 h-24 ${feature.blob} rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
               
               {/* Icon container with playful shape */}
               <div className="relative mb-6">
                  <div className={`inline-flex p-4 rounded-2xl ${feature.color} shadow-lg transform group-hover:rotate-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-7 w-7 text-white" strokeWidth={2} />
                 </div>
                 {/* Decorative ring */}
                 <div className={`absolute -inset-2 rounded-3xl border-2 border-dashed ${feature.accent} opacity-0 group-hover:opacity-30 transition-opacity`} />
               </div>
               
               <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                 {feature.title}
               </h3>
               <p className="text-muted-foreground leading-relaxed">
                 {feature.description}
               </p>
               
               {/* Bottom decorative line */}
               <div className={`absolute bottom-0 left-8 right-8 h-1 ${feature.color} rounded-full opacity-0 group-hover:opacity-100 transform scale-x-0 group-hover:scale-x-100 transition-all duration-300 origin-left`} />
             </div>
           ))}
         </div>
 
         {/* Platform Benefits - Playful Cards */}
         <div className="mt-20 pt-16">
           <div className="text-center mb-12">
             <h3 className="text-2xl font-bold text-foreground">Why Cinema Owners Love Us 💖</h3>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
             {platformBenefits.map((benefit, index) => (
               <div 
                 key={benefit.title} 
                 className="relative bg-card rounded-3xl p-8 border-2 border-border text-center group hover:border-primary/30 transition-all duration-300"
               >
                 {/* Big emoji background */}
                 <div className="absolute top-4 right-4 text-6xl opacity-10 group-hover:opacity-20 transition-opacity select-none">
                   {benefit.emoji}
                 </div>
                 
                 <div className="relative">
                   <div className="text-5xl font-bold text-primary mb-2 group-hover:scale-110 transition-transform inline-block">
                     {benefit.stat}
                   </div>
                   <h4 className="text-lg font-semibold text-foreground mb-2">
                     {benefit.title}
                   </h4>
                   <p className="text-sm text-muted-foreground leading-relaxed">
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
