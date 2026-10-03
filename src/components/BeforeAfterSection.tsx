import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import BeforeAfter from './BeforeAfter';

export default function BeforeAfterSection() {
  const [transformation, setTransformation] = useState<any>(null);

  useEffect(() => {
    let unsub = () => {};
    try {
      const q = query(collection(db, 'transformations'), orderBy('createdAt', 'desc'), limit(1));
      unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setTransformation(snapshot.docs[0].data());
        } else {
          const local = JSON.parse(localStorage.getItem('natal_local_transformations') || '[]');
          if (local.length > 0) {
            setTransformation(local[0]);
          } else {
            setTransformation(null);
          }
        }
      }, (err) => {
        console.warn("Firestore error fetching transformation, using local fallback", err);
        const local = JSON.parse(localStorage.getItem('natal_local_transformations') || '[]');
        if (local.length > 0) {
          setTransformation(local[0]);
        }
      });
    } catch (e) {
      console.warn("Error setting up transformation listener", e);
    }
    return () => unsub();
  }, []);

  const beforeImg = transformation?.beforeImage || "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=2000";
  const afterImg = transformation?.afterImage || "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=2000";

  return (
    <section className="py-6 sm:py-8 md:py-12 bg-black-rich border-b border-gold/15">
      <div className="w-full max-w-[98vw] xl:max-w-[95vw] 2xl:max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="text-center mb-4 sm:mb-6">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-gold tracking-[0.25em] uppercase text-xs sm:text-sm font-semibold mb-1 sm:mb-1.5"
          >
            Transformations
          </motion.h2>
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-heading text-2xl sm:text-3xl md:text-4xl text-white font-bold uppercase tracking-wider"
          >
            Before & After
          </motion.h3>
          {transformation?.title && (
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-1.5 text-gold/90 font-mono text-xs sm:text-sm tracking-widest uppercase"
            >
              {transformation.title}
            </motion.p>
          )}
        </div>

        {/* Expansive luxury presentation card with flexible width */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1650px] mx-auto p-3 sm:p-5 md:p-6 bg-black-pure/90 border border-gold/35 shadow-[0_15px_50px_rgba(0,0,0,0.85)] rounded-none mb-6 sm:mb-8"
        >
          {/* Inner gilded frame with full image display */}
          <div className="border border-gold/25 overflow-hidden relative shadow-inner">
            <BeforeAfter 
              beforeImage={beforeImg}
              afterImage={afterImg}
              defaultMode={transformation?.fitMode}
            />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <a
            href="#quote"
            className="h-11 sm:h-12 inline-flex items-center justify-center gap-2.5 bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure px-6 sm:px-8 font-bold uppercase tracking-wider sm:tracking-[0.15em] text-xs sm:text-sm transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] active:scale-95 rounded-sm cursor-pointer group whitespace-nowrap"
          >
            <span>Start Your Transformation</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
