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
    <section className="py-20 lg:py-28 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Loved by Cinema Owners
          </h2>
          <p className="text-lg text-muted-foreground">
            Join hundreds of cinemas already transforming their operations with CineTix
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-lg transition-shadow duration-300"
            >
              <Quote className="absolute top-6 right-6 h-8 w-8 text-primary/20" />
              
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              
              <p className="text-muted-foreground mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
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