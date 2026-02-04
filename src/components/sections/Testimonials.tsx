import { Star, Quote } from "lucide-react";
const testimonials = [{
  name: "Sarah Mitchell",
  role: "Owner, Palace Cinema",
  content: "CineTix transformed how we manage our cinema. Online bookings increased by 300% in the first month. The dashboard is intuitive and our staff loves it.",
  rating: 5,
  avatar: "SM"
}, {
  name: "James Rodriguez",
  role: "Operations Manager, Metro Multiplex",
  content: "The role-based access is a game-changer. Our box office, gate staff, and accountants all have exactly what they need. No more spreadsheet chaos!",
  rating: 5,
  avatar: "JR"
}, {
  name: "Emily Chen",
  role: "CEO, CineMax Chain",
  content: "We run 12 locations on CineTix. The multi-tenant architecture keeps everything organized while giving us unified analytics across all venues.",
  rating: 5,
  avatar: "EC"
}];
const Testimonials = () => {
  return (
    <section id="testimonials" className="py-24 lg:py-32 bg-muted/30 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-chart-3/5 rounded-full blur-3xl" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-primary text-sm font-semibold tracking-wide uppercase">Testimonials</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Loved by Cinema Owners
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            See what our customers have to say about transforming their cinema operations.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group relative bg-card rounded-3xl border border-border p-8 hover:border-primary/40 transition-all duration-300"
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/20" />
              
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                ))}
              </div>
              
              <p className="text-muted-foreground leading-relaxed mb-8">
                "{testimonial.content}"
              </p>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
export default Testimonials;