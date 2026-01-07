import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does the multi-tenant system work?",
    answer: "Each cinema operates as an independent organization within our platform. All data is completely isolated, meaning your cinema's information never mixes with others. You get your own admin dashboard, staff accounts, and customer-facing website — all managed from one account.",
  },
  {
    question: "Can I connect my own domain?",
    answer: "Absolutely! All Professional and Enterprise plans include custom domain support. Simply add your domain in the settings, configure the DNS records we provide, and your cinema website will be live on your own domain within hours.",
  },
  {
    question: "What payment gateways are supported?",
    answer: "We support major payment providers including Stripe, PayPal, Square, and many regional payment methods. Enterprise customers can also integrate custom payment solutions through our API.",
  },
  {
    question: "How do the role-based dashboards work?",
    answer: "You can create unlimited staff accounts with specific roles: Box Office (sell tickets), Gate Staff (scan QR codes), Manager (oversight), and Accountant (financial access). Each role sees a tailored dashboard with only the features they need.",
  },
  {
    question: "Is there a mobile app for customers?",
    answer: "Your customers can book tickets through the mobile-optimized web interface. Tickets are delivered via email with QR codes that work perfectly on any smartphone. Native apps are available for Enterprise customers.",
  },
  {
    question: "How long does setup take?",
    answer: "Most cinemas are up and running within a day. Create your account, configure your halls and seating layouts, add your first movies, and start selling tickets. Our onboarding team is available to help if you need it.",
  },
  {
    question: "Can I migrate from my current system?",
    answer: "Yes! We offer free migration assistance for all plans. Our team will help you transfer your movie database, customer records, and historical data to CineTix with zero downtime.",
  },
  {
    question: "What happens after my free trial?",
    answer: "After 14 days, you'll be prompted to choose a paid plan. If you don't upgrade, your account will be paused but all your data will be preserved. You can reactivate anytime by subscribing to a plan.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-24 lg:py-32 bg-card relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Got questions? We've got answers. If you don't find what you're looking for, 
            feel free to contact our support team.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-background border border-border rounded-xl px-6 data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="text-left text-foreground hover:text-primary hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
