import dashboardImage from "@/assets/dashboard-preview.jpg";
import mobileImage from "@/assets/mobile-booking.jpg";

const steps = [
  {
    number: "01",
    title: "Sign Up & Setup",
    description: "Create your account, configure your cinema profile, add halls, and set up seating layouts in minutes.",
  },
  {
    number: "02",
    title: "Add Movies & Showtimes",
    description: "Import movie details, schedule showtimes, and set pricing with our intuitive scheduling system.",
  },
  {
    number: "03",
    title: "Launch Your Website",
    description: "Customize your booking website, connect your domain, and go live with online ticket sales.",
  },
  {
    number: "04",
    title: "Manage & Grow",
    description: "Use analytics to optimize operations, manage staff roles, and scale your cinema business.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 lg:py-32 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Get Started in 4 Simple Steps
          </h2>
          <p className="text-lg text-muted-foreground">
            From signup to selling tickets — we make the journey effortless.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Steps */}
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="flex gap-6 group"
              >
                <div className="shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                    <span className="text-lg font-bold text-primary group-hover:text-primary-foreground transition-colors">
                      {step.number}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-px h-8 bg-border mx-auto mt-4" />
                  )}
                </div>
                <div className="pt-2">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Images */}
          <div className="relative">
            <div className="relative z-10">
              <img
                src={dashboardImage}
                alt="CineTix Dashboard"
                className="rounded-2xl shadow-2xl border border-border"
              />
            </div>
            <div className="absolute -bottom-8 -right-4 lg:-right-8 w-40 lg:w-52 z-20">
              <img
                src={mobileImage}
                alt="Mobile Booking App"
                className="rounded-2xl shadow-2xl border border-border"
              />
            </div>
            {/* Decorative glow */}
            <div className="absolute inset-0 -z-10 bg-primary/20 blur-3xl rounded-full scale-75" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
