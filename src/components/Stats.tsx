import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { useSectionContent, StatsContent, defaultStatsContent } from '../siteContent';

function Counter({ from = 0, to, duration = 2, suffix = '' }: { from?: number, to: number, duration?: number, suffix?: string }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(nodeRef, { once: true, margin: "-50px" });
  const [count, setCount] = useState(from);

  useEffect(() => {
    if (!inView) return;

    let startTime: number | null = null;
    let animationFrame: number;

    const updateCounter = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(easeOutQuart * (to - from) + from);
      
      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(updateCounter);
      }
    };

    animationFrame = requestAnimationFrame(updateCounter);

    return () => cancelAnimationFrame(animationFrame);
  }, [inView, from, to, duration]);

  return (
    <span ref={nodeRef} className="font-heading text-xl sm:text-2xl md:text-3xl text-white font-bold">
      {count}{suffix}
    </span>
  );
}

export default function Stats() {
  const { content } = useSectionContent<StatsContent>('stats', defaultStatsContent);
  const statsList = content.stats || defaultStatsContent.stats;

  return (
    <section className="py-6 sm:py-8 md:py-10 bg-black-pure border-b border-gold/15">
      <div className="w-full max-w-[98vw] xl:max-w-[95vw] 2xl:max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center divide-x divide-black-muted/0 md:divide-black-muted">
          {statsList.map((stat, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center py-1"
            >
              <Counter to={stat.value} suffix={stat.suffix} />
              <div className="w-10 h-[1px] bg-gold my-2"></div>
              <span className="text-gray-400 text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest leading-tight">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
