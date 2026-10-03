import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cardHighlights } from '../data';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export default function Showcase() {
  const [uploadedCreations, setUploadedCreations] = useState<any[]>([]);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fbCreations = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            title: data.title,
            category: data.category,
            image: data.image,
            desc: data.desc || data.description || '',
            isNew: true
          };
        });

        const localData = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
        const combined = [...fbCreations];
        localData.forEach((lp: any) => {
          if (!combined.some(c => c.title === lp.title)) {
            combined.unshift({
              title: lp.title,
              category: lp.category,
              image: lp.image,
              desc: lp.desc || lp.description || '',
              isNew: true
            });
          }
        });

        const seenTitles = new Set<string>();
        const uniqueCombined = combined.filter(c => {
          const t = (c.title || '').trim().toLowerCase();
          if (!t || seenTitles.has(t)) return false;
          seenTitles.add(t);
          return true;
        });

        setUploadedCreations(uniqueCombined);
      }, (err) => {
        console.warn("Showcase firestore error fallback:", err);
        const localData = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
        const seenTitles = new Set<string>();
        const uniqueLocal = localData.filter((lp: any) => {
          const t = (lp.title || '').trim().toLowerCase();
          if (!t || seenTitles.has(t)) return false;
          seenTitles.add(t);
          return true;
        });
        setUploadedCreations(uniqueLocal.map((lp: any) => ({
          title: lp.title,
          category: lp.category,
          image: lp.image,
          desc: lp.desc || lp.description || '',
          isNew: true
        })));
      });
    } catch (e) {
      console.warn("Showcase listener setup error:", e);
    }
    return () => unsubscribe();
  }, []);

  const seenAllTitles = new Set<string>();
  const allShowcaseItems = [...uploadedCreations, ...cardHighlights].filter((item, idx) => {
    const k = (item.title || '').trim().toLowerCase() || `item-${idx}`;
    if (seenAllTitles.has(k)) return false;
    seenAllTitles.add(k);
    return true;
  });

  return (
    <section id="showcase" className="py-6 sm:py-8 md:py-12 bg-black-pure border-y border-gold/20 relative">
      <div className="w-full max-w-[98vw] xl:max-w-[95vw] 2xl:max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="text-center mb-5 sm:mb-7">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-gold text-xs uppercase tracking-[0.3em] font-semibold mb-2"
          >
            <Sparkles size={14} />
            <span>Core Interior Specialties</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-heading text-xl sm:text-2xl md:text-3xl text-white"
          >
            Featured Interior Creations
          </motion.h2>
        </div>

        {/* Responsive grid: 2 on phone (4 full rows = 8 items), 3 on tablet (3 full rows = 9 items), 6 on laptop (2 full rows = 12 items) with generous in-between space */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3.5 sm:gap-x-5 lg:gap-x-6 xl:gap-x-8 gap-y-3.5 sm:gap-y-4 lg:gap-y-5">
          {allShowcaseItems.slice(0, 12).map((item, index) => (
            <motion.div
              key={item.title + index}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.04 }}
              className={`group relative bg-black-rich border border-gold/30 hover:border-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:-translate-y-1 transition-all duration-500 overflow-hidden shadow-xl flex-col rounded-none flex ${
                index === 8 ? 'hidden sm:flex' : index >= 9 ? 'hidden lg:flex' : ''
              }`}
            >
              {/* Angled top gold accent */}
              <div className="h-1 bg-gradient-to-r from-gold via-gold-light to-gold-dark shrink-0"></div>
              <div className="relative aspect-[16/10] sm:aspect-[16/10] xl:aspect-[4/3] overflow-hidden shrink-0">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 filter brightness-90 group-hover:brightness-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-black-pure/20 to-transparent"></div>
                {item.isNew && (
                  <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-gradient-to-r from-amber-500 to-yellow-300 text-black-pure text-[7px] sm:text-[8px] uppercase tracking-wider sm:tracking-widest font-mono font-extrabold px-1 sm:px-1.5 py-0.5 shadow-md z-10 animate-pulse">
                    New
                  </span>
                )}
              </div>

              <div className="p-1.5 sm:p-2.5 xl:p-4 flex-grow flex flex-col justify-between">
                <div>
                  <span className="text-[7px] sm:text-[8px] xl:text-[9px] text-gold uppercase tracking-wider sm:tracking-widest block font-mono mb-0.5 sm:mb-1 truncate">
                    {item.category}
                  </span>
                  <h3 className="font-heading text-[11px] sm:text-xs xl:text-base text-white font-bold mb-1 group-hover:text-gold transition-colors flex items-start justify-between gap-1">
                    <span className="line-clamp-1 sm:line-clamp-2 leading-tight">{item.title}</span>
                  </h3>
                  <p className="text-gray-400 text-[8px] sm:text-[10px] xl:text-xs font-light leading-tight sm:leading-snug line-clamp-1 sm:line-clamp-2 xl:line-clamp-3 mb-1.5 sm:mb-2.5">
                    {item.desc}
                  </p>
                  <p className="pt-1.5 sm:pt-2 border-t border-gold/20">
                    <a
                      href="#creations"
                      className="text-gold hover:text-white active:text-gold-light text-[8px] sm:text-[9px] xl:text-xs font-bold uppercase tracking-wider sm:tracking-widest inline-flex items-center gap-1 transition-colors active:scale-95 group/link"
                    >
                      <span>See details</span>
                      <ArrowUpRight size={10} className="sm:w-[12px] sm:h-[12px] group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform shrink-0" />
                    </a>
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Explore more services button below cards */}
        <div className="mt-6 sm:mt-8 text-center">
          <a
            href="#creations"
            className="h-11 sm:h-12 inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure px-6 sm:px-8 font-bold uppercase tracking-wider sm:tracking-[0.15em] text-xs sm:text-sm transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] active:scale-95 rounded-sm cursor-pointer group whitespace-nowrap"
          >
            <span>View All Interior Specialties</span>
            <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          </a>
        </div>
      </div>
    </section>
  );
}
