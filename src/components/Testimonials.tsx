import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { testimonialsData as staticTestimonialsData } from '../data';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const [testimonials, setTestimonials] = useState<any[]>(staticTestimonialsData);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fbTestimonials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Merge with local storage
        const localData = JSON.parse(localStorage.getItem('natal_local_testimonials') || '[]');
        const combined = [...fbTestimonials];
        localData.forEach((lt: any) => {
          if (!combined.some(ct => ct.id === lt.id)) {
            combined.unshift(lt);
          }
        });

        // Merge with hardcoded ones at the end as fallback/defaults
        staticTestimonialsData.forEach(st => {
           if (!combined.some((ct: any) => ct.name === st.name && ct.content === st.content)) {
             combined.push(st);
           }
        });

        if (combined.length > 0) {
          setTestimonials(combined);
        }
      }, (err) => {
        console.warn("Firestore testimonials sync error:", err);
      });
    } catch (e) {
      console.warn("Firestore initialized without network:", e);
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (testimonials.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  if (testimonials.length === 0) return null;

  const next = () => setIndex((prev) => (prev + 1) % testimonials.length);
  const prev = () => setIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  // Ensure index is valid in case array shrunk
  const currentIndex = index >= testimonials.length ? 0 : index;
  const currentTestimonial = testimonials[currentIndex];

  return (
    <section id="testimonials" className="py-4 sm:py-6 md:py-8 bg-black-rich relative overflow-hidden">
      {/* Background Logo Mark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20rem] md:text-[28rem] font-heading text-white/[0.02] pointer-events-none select-none">
        N
      </div>

      <div className="w-full max-w-[98vw] xl:max-w-[95vw] 2xl:max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 relative z-10 text-center">
        <div className="mb-4 sm:mb-5">
          <h2 className="text-gold tracking-[0.2em] uppercase text-[11px] sm:text-xs font-semibold mb-1">Client Feedback</h2>
          <h3 className="font-heading text-xl sm:text-2xl md:text-3xl text-white font-bold uppercase tracking-wider">Testimonials</h3>
          <div className="w-20 h-[1.5px] bg-gradient-to-r from-transparent via-gold to-transparent mx-auto mt-2"></div>
        </div>
        
        <div className="relative min-h-[160px] sm:min-h-[180px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="flex flex-col items-center"
            >
              <Quote className="text-gold/20 w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3" />
              
              <p className="font-heading text-sm sm:text-lg md:text-xl text-white leading-snug sm:leading-relaxed mb-3 sm:mb-4 italic max-w-4xl xl:max-w-5xl">
                "{currentTestimonial.content}"
              </p>
              
              <div className="flex gap-1 mb-2.5">
                {[...Array(currentTestimonial.rating || 5)].map((_, i) => (
                  <Star key={i} className="fill-gold text-gold w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ))}
              </div>
              
              <div className="flex items-center gap-3 sm:gap-4">
                {currentTestimonial.image && (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-gold/50 p-0.5 bg-black-pure flex-shrink-0 flex items-center justify-center overflow-hidden shadow-lg ring-1 ring-gold/20">
                    <img 
                      src={currentTestimonial.image} 
                      alt={currentTestimonial.name} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                )}
                <div className="text-left">
                  <h5 className="text-white text-sm sm:text-base font-medium">{currentTestimonial.name}</h5>
                  <span className="text-gray-400 text-[11px] sm:text-xs uppercase tracking-wider">{currentTestimonial.role}</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 sm:gap-6 mt-5 sm:mt-7">
          <button 
            onClick={prev}
            aria-label="Previous testimonial"
            className="w-9 h-9 sm:w-11 sm:h-11 border border-gold/30 rounded-full flex items-center justify-center text-white hover:border-gold hover:text-gold active:bg-gold active:text-black-pure active:scale-90 transition-all cursor-pointer shadow-md"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={next}
            aria-label="Next testimonial"
            className="w-9 h-9 sm:w-11 sm:h-11 border border-gold/30 rounded-full flex items-center justify-center text-white hover:border-gold hover:text-gold active:bg-gold active:text-black-pure active:scale-90 transition-all cursor-pointer shadow-md"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
