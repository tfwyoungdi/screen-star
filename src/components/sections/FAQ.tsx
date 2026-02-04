import { useState, useMemo } from "react";
import { Search, ChevronRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "How does the multi-tenant system work?",
    answer: "Each cinema operates as an independent organization within our platform. All data is completely isolated, meaning your cinema's information never mixes with others. You get your own admin dashboard, staff accounts, and customer-facing website — all managed from one account.",
    category: "Platform"
  },
  {
    question: "Can I connect my own domain?",
    answer: "Absolutely! All Professional and Enterprise plans include custom domain support. Simply add your domain in the settings, configure the DNS records we provide, and your cinema website will be live on your own domain within hours.",
    category: "Setup"
  },
  {
    question: "What payment gateways are supported?",
    answer: "We support major payment providers including Stripe, PayPal, Square, and many regional payment methods. Enterprise customers can also integrate custom payment solutions through our API.",
    category: "Payments"
  },
  {
    question: "How do the role-based dashboards work?",
    answer: "You can create unlimited staff accounts with specific roles: Box Office (sell tickets), Gate Staff (scan QR codes), Manager (oversight), and Accountant (financial access). Each role sees a tailored dashboard with only the features they need.",
    category: "Features"
  },
  {
    question: "Is there a mobile app for customers?",
    answer: "Your customers can book tickets through the mobile-optimized web interface. Tickets are delivered via email with QR codes that work perfectly on any smartphone. Native apps are available for Enterprise customers.",
    category: "Features"
  },
  {
    question: "How long does setup take?",
    answer: "Most cinemas are up and running within a day. Create your account, configure your halls and seating layouts, add your first movies, and start selling tickets. Our onboarding team is available to help if you need it.",
    category: "Setup"
  },
  {
    question: "Can I migrate from my current system?",
    answer: "Yes! We offer free migration assistance for all plans. Our team will help you transfer your movie database, customer records, and historical data to CineTix with zero downtime.",
    category: "Setup"
  },
  {
    question: "What happens after my free trial?",
    answer: "After 14 days, you'll be prompted to choose a paid plan. If you don't upgrade, your account will be paused but all your data will be preserved. You can reactivate anytime by subscribing to a plan.",
    category: "Billing"
  }
];

const categories = ["All", "Platform", "Setup", "Features", "Payments", "Billing"];

const FAQ = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === "All" || faq.category === activeCategory;
      const matchesSearch = 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <section id="faq" className="py-24 lg:py-32 relative overflow-hidden bg-background">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.08),transparent)]" />
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Support</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about CineTix. Can't find the answer you're looking for? 
            <a href="#contact" className="text-primary hover:underline ml-1">Reach out to our support team</a>.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mx-auto mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-full bg-secondary/50 border-border focus:border-primary/50 focus:ring-primary/20"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                activeCategory === category
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No questions found matching your search.</p>
              <Button 
                variant="ghost" 
                className="mt-4"
                onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            filteredFaqs.map((faq, index) => {
              const isExpanded = expandedIndex === index;
              const originalIndex = faqs.findIndex(f => f.question === faq.question);
              
              return (
                <div
                  key={originalIndex}
                  className={cn(
                    "group rounded-2xl border transition-all duration-300 overflow-hidden",
                    isExpanded 
                      ? "bg-card border-primary/20 shadow-lg shadow-primary/5" 
                      : "bg-card/50 border-border hover:border-border hover:bg-card"
                  )}
                >
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className="w-full flex items-start sm:items-center justify-between gap-3 p-4 lg:p-6 text-left min-h-[56px]"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <span className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors mt-0.5 sm:mt-0",
                        isExpanded 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-muted-foreground"
                      )}>
                        {String(originalIndex + 1).padStart(2, '0')}
                      </span>
                      <span className={cn(
                        "font-medium transition-colors text-sm sm:text-base leading-snug",
                        isExpanded ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                      )}>
                        {faq.question}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5 sm:mt-0">
                      <span className={cn(
                        "hidden sm:inline-block px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                        isExpanded 
                          ? "bg-primary/10 text-primary" 
                          : "bg-secondary text-muted-foreground"
                      )}>
                        {faq.category}
                      </span>
                      <ChevronRight className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform duration-300 flex-shrink-0",
                        isExpanded && "rotate-90"
                      )} />
                    </div>
                  </button>
                  
                  <div className={cn(
                    "grid transition-all duration-300 ease-out",
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}>
                    <div className="overflow-hidden">
                      <div className="px-5 lg:px-6 pb-5 lg:pb-6 pt-0">
                        <div className="pl-12 text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 lg:mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 lg:p-8 rounded-3xl bg-gradient-to-br from-secondary/50 via-card to-card border border-border">
            <div className="text-center sm:text-left">
              <h4 className="font-semibold text-foreground mb-1">Still have questions?</h4>
              <p className="text-sm text-muted-foreground">
                Can't find what you're looking for? Our team is here to help.
              </p>
            </div>
            <Button className="rounded-full shadow-lg whitespace-nowrap">
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
