import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageCircleQuestion, Sparkles, HelpCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = [{
  question: "How does the multi-tenant system work?",
  answer: "Each cinema operates as an independent organization within our platform. All data is completely isolated, meaning your cinema's information never mixes with others. You get your own admin dashboard, staff accounts, and customer-facing website — all managed from one account.",
  category: "Platform"
}, {
  question: "Can I connect my own domain?",
  answer: "Absolutely! All Professional and Enterprise plans include custom domain support. Simply add your domain in the settings, configure the DNS records we provide, and your cinema website will be live on your own domain within hours.",
  category: "Setup"
}, {
  question: "What payment gateways are supported?",
  answer: "We support major payment providers including Stripe, PayPal, Square, and many regional payment methods. Enterprise customers can also integrate custom payment solutions through our API.",
  category: "Payments"
}, {
  question: "How do the role-based dashboards work?",
  answer: "You can create unlimited staff accounts with specific roles: Box Office (sell tickets), Gate Staff (scan QR codes), Manager (oversight), and Accountant (financial access). Each role sees a tailored dashboard with only the features they need.",
  category: "Features"
}, {
  question: "Is there a mobile app for customers?",
  answer: "Your customers can book tickets through the mobile-optimized web interface. Tickets are delivered via email with QR codes that work perfectly on any smartphone. Native apps are available for Enterprise customers.",
  category: "Features"
}, {
  question: "How long does setup take?",
  answer: "Most cinemas are up and running within a day. Create your account, configure your halls and seating layouts, add your first movies, and start selling tickets. Our onboarding team is available to help if you need it.",
  category: "Setup"
}, {
  question: "Can I migrate from my current system?",
  answer: "Yes! We offer free migration assistance for all plans. Our team will help you transfer your movie database, customer records, and historical data to CineTix with zero downtime.",
  category: "Setup"
}, {
  question: "What happens after my free trial?",
  answer: "After 14 days, you'll be prompted to choose a paid plan. If you don't upgrade, your account will be paused but all your data will be preserved. You can reactivate anytime by subscribing to a plan.",
  category: "Billing"
}];

const FAQ = () => {
  const [openItem, setOpenItem] = useState<string | undefined>("item-0");

  return (
    <section id="faq" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background" />
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-chart-4/5 rounded-full blur-3xl" />
        
        {/* Question mark decorations */}
        <div className="absolute top-32 left-[8%] hidden lg:block">
          <HelpCircle className="h-16 w-16 text-primary/10 rotate-12" />
        </div>
        <div className="absolute bottom-40 right-[12%] hidden lg:block">
          <MessageCircleQuestion className="h-20 w-20 text-chart-3/10 -rotate-12" />
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left side - Header */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">FAQ</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Got
              <span className="text-primary"> Questions?</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8">
              Everything you need to know about CineTix. Can't find your answer? Chat with our team.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-2xl bg-card border border-border">
                <div className="text-3xl font-bold text-foreground mb-1">24/7</div>
                <div className="text-sm text-muted-foreground">Support available</div>
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border">
                <div className="text-3xl font-bold text-foreground mb-1">&lt;2h</div>
                <div className="text-sm text-muted-foreground">Response time</div>
              </div>
            </div>

            {/* Contact CTA */}
            <Button variant="outline" className="group gap-2 rounded-full">
              Contact Support
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Right side - FAQ items */}
          <div className="lg:col-span-8">
            <Accordion 
              type="single" 
              collapsible 
              value={openItem}
              onValueChange={setOpenItem}
              className="space-y-4"
            >
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className={`group border rounded-2xl overflow-hidden transition-all duration-300 ${
                    openItem === `item-${index}` 
                      ? "bg-card border-primary/30 shadow-lg shadow-primary/5" 
                      : "bg-card/50 border-border hover:border-primary/20 hover:bg-card"
                  }`}
                >
                  <AccordionTrigger className="px-6 py-5 text-left hover:no-underline [&[data-state=open]>div>.number]:bg-primary [&[data-state=open]>div>.number]:text-primary-foreground">
                    <div className="flex items-start gap-4 w-full pr-4">
                      <div className="number flex-shrink-0 w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-semibold text-muted-foreground transition-colors">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-secondary/50 text-xs font-medium text-muted-foreground mb-2">
                          {faq.category}
                        </span>
                        <h3 className="text-base md:text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {faq.question}
                        </h3>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="pl-12 text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Bottom help card */}
            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircleQuestion className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-1">Still have questions?</h4>
                  <p className="text-sm text-muted-foreground">
                    Can't find the answer you're looking for? Our team is here to help.
                  </p>
                </div>
                <Button className="rounded-full shadow-lg">
                  Get in Touch
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
