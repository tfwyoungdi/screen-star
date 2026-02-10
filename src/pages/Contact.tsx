import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, MapPin, Phone, Mail, Clock, MessageSquare, Send, Building2 } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { toast } from "sonner";
const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  company: z.string().trim().max(100, "Company name must be less than 100 characters").optional(),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message must be less than 2000 characters")
});
type ContactFormData = z.infer<typeof contactSchema>;
const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: {
      errors
    }
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema)
  });
  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Message sent successfully! We'll get back to you soon.");
      reset();
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const offices = [{
    city: "San Francisco",
    country: "United States",
    address: "100 California St, Suite 800",
    phone: "+1 (415) 555-0123",
    email: "sf@cinitix.com",
    timezone: "PST (UTC-8)"
  }, {
    city: "London",
    country: "United Kingdom",
    address: "1 Canada Square, Canary Wharf",
    phone: "+44 20 7946 0958",
    email: "london@cinitix.com",
    timezone: "GMT (UTC+0)"
  }, {
    city: "Singapore",
    country: "Singapore",
    address: "1 Raffles Place, Tower 1",
    phone: "+65 6789 0123",
    email: "sg@cinitix.com",
    timezone: "SGT (UTC+8)"
  }];
  const contactMethods = [{
    icon: Mail,
    title: "Email Support",
    description: "Get help with technical issues",
    action: "support@cinitix.com",
    href: "mailto:support@cinitix.com"
  }, {
    icon: Phone,
    title: "Call Us",
    description: "Mon-Fri from 8am to 6pm",
    action: "+1 (800) 555-0199",
    href: "tel:+18005550199"
  }];
  return <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-secondary/50" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Get in Touch</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Let's Start a{" "}
              <span className="text-primary">Conversation</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Have questions about our platform? Want to see a demo? 
              We'd love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 border-y border-border bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {contactMethods.map((method, index) => <a key={index} href={method.href} className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all group text-center">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto group-hover:bg-primary/20 transition-colors">
                  <method.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{method.title}</h3>
                <p className="text-muted-foreground text-sm mb-3">{method.description}</p>
                <span className="text-primary text-sm font-medium group-hover:underline">
                  {method.action}
                </span>
              </a>)}
          </div>
        </div>
      </section>

      {/* Contact Form & Map Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Send us a Message</h2>
              <p className="text-muted-foreground mb-8">Fill out the form and we'll get back to you within 24 hours.</p>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" placeholder="John Doe" {...register("name")} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" placeholder="john@example.com" {...register("email")} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" placeholder="Your cinema name" {...register("company")} />
                    {errors.company && <p className="text-sm text-destructive">{errors.company.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input id="subject" placeholder="How can we help?" {...register("subject")} />
                    {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea id="message" placeholder="Tell us more about your needs..." rows={6} {...register("message")} className="resize-none" />
                  {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
                </div>

                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : <>
                      Send Message
                      <Send className="h-5 w-5 ml-2" />
                    </>}
                </Button>
              </form>
            </div>

            {/* Map Placeholder */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-foreground mb-2">Our Headquarters</h2>
              <p className="text-muted-foreground mb-6">Visit us at our main office in Lagos.</p>
              
              <div className="aspect-video rounded-xl overflow-hidden bg-secondary border border-border relative">
                <img src="https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?w=800&h=450&fit=crop" alt="Lagos skyline" className="w-full h-full object-cover opacity-70" />
                <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                      <MapPin className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Lagos, Nigeria</h3>
                    
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Business Hours</h4>
                    <p className="text-muted-foreground text-sm">Monday - Friday: 8:00 AM - 6:00 PM PST</p>
                    <p className="text-muted-foreground text-sm">Saturday - Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
};
export default Contact;