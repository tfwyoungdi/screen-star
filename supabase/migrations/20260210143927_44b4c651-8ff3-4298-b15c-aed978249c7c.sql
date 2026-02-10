
-- Create platform_faqs table for managing landing page FAQ content
CREATE TABLE public.platform_faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_faqs ENABLE ROW LEVEL SECURITY;

-- Public read access for active FAQs (landing page)
CREATE POLICY "Anyone can view active FAQs"
ON public.platform_faqs
FOR SELECT
USING (is_active = true);

-- Platform admins can do everything
CREATE POLICY "Platform admins can manage FAQs"
ON public.platform_faqs
FOR ALL
USING (public.is_platform_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_platform_faqs_updated_at
BEFORE UPDATE ON public.platform_faqs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with existing FAQ data
INSERT INTO public.platform_faqs (question, answer, category, display_order) VALUES
('How does the multi-tenant system work?', 'Each cinema operates as an independent organization within our platform. All data is completely isolated, meaning your cinema''s information never mixes with others. You get your own admin dashboard, staff accounts, and customer-facing website — all managed from one account.', 'Platform', 1),
('Can I connect my own domain?', 'Absolutely! All Professional and Enterprise plans include custom domain support. Simply add your domain in the settings, configure the DNS records we provide, and your cinema website will be live on your own domain within hours.', 'Setup', 2),
('What payment gateways are supported?', 'We support major payment providers including Stripe, PayPal, Square, and many regional payment methods. Enterprise customers can also integrate custom payment solutions through our API.', 'Payments', 3),
('How do the role-based dashboards work?', 'You can create unlimited staff accounts with specific roles: Box Office (sell tickets), Gate Staff (scan QR codes), Manager (oversight), and Accountant (financial access). Each role sees a tailored dashboard with only the features they need.', 'Features', 4),
('Is there a mobile app for customers?', 'Your customers can book tickets through the mobile-optimized web interface. Tickets are delivered via email with QR codes that work perfectly on any smartphone. Native apps are available for Enterprise customers.', 'Features', 5),
('How long does setup take?', 'Most cinemas are up and running within a day. Create your account, configure your halls and seating layouts, add your first movies, and start selling tickets. Our onboarding team is available to help if you need it.', 'Setup', 6),
('What happens after my free trial?', 'After 7 days, you''ll be prompted to choose a paid plan. If you don''t upgrade, your account will be paused but all your data will be preserved. You can reactivate anytime by subscribing to a plan.', 'Billing', 7);
