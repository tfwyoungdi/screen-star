import { Twitter, Linkedin, Youtube } from "lucide-react";
import logo from "@/assets/logo.png";
const footerLinks = {
  Product: [{
    label: "Features",
    href: "#features"
  }, {
    label: "Pricing",
    href: "#pricing"
  }],
  Company: [{
    label: "About",
    href: "#"
  }, {
    label: "Blog",
    href: "#"
  }, {
    label: "Contact",
    href: "#"
  }],
  Legal: [{
    label: "Privacy",
    href: "#"
  }, {
    label: "Terms",
    href: "#"
  }, {
    label: "Security",
    href: "#"
  }, {
    label: "Cookies",
    href: "#"
  }]
};
const Footer = () => {
  return <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2 mb-4 lg:mb-0">
            <a href="/" className="flex items-center mb-4">
              <img src={logo} alt="Cinitix" className="h-12 w-auto" />
            </a>
            <p className="text-muted-foreground mb-6 max-w-sm text-sm lg:text-base">
              The complete cinema ticketing platform. Sell more tickets, 
              manage operations, and delight your customers.
            </p>
            <div className="flex gap-3">
              <a href="#" className="p-2.5 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="p-2.5 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="p-2.5 rounded-lg bg-secondary hover:bg-primary/10 hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => <div key={category}>
              <h4 className="font-semibold text-foreground mb-3 lg:mb-4 text-sm lg:text-base">{category}</h4>
              <ul className="space-y-2 lg:space-y-3">
                {links.map(link => <li key={link.label}>
                    <a href={link.href} className="text-muted-foreground hover:text-primary transition-colors text-sm lg:text-base py-1 inline-block min-h-[44px] flex items-center">
                      {link.label}
                    </a>
                  </li>)}
              </ul>
            </div>)}
        </div>

        {/* Email Tracking Disclosure */}
        <div className="mt-12 p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground text-center">
            <strong>Privacy Notice:</strong> We use email tracking to improve our communications. 
            Transactional emails may contain tracking pixels to measure open rates and engagement. 
            This helps us ensure important booking confirmations reach you. 
            You can disable image loading in your email client to opt out.
          </p>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Cinitix. All rights reserved.
          </p>
          
        </div>
      </div>
    </footer>;
};
export default Footer;