import { motion, useMotionValue, useTransform } from 'motion/react';
import { useRef, useState, useEffect, MouseEvent } from 'react';
import { MoveHorizontal, Scaling, Maximize2 } from 'lucide-react';

interface BeforeAfterProps {
  beforeImage: string;
  afterImage: string;
  defaultMode?: 'contain' | 'cover';
  onModeChange?: (mode: 'contain' | 'cover') => void;
}

const STORAGE_KEY = 'natal_before_after_mode';

export default function BeforeAfter({ beforeImage, afterImage, defaultMode, onModeChange }: BeforeAfterProps) {
  const [isResizing, setIsResizing] = useState(false);
  
  // Persistent mode state: prioritize user's explicitly selected mode from localStorage
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'contain' || saved === 'cover') {
        return saved;
      }
    } catch (e) {
      console.warn("Could not read before/after mode from localStorage", e);
    }
    return defaultMode || 'contain';
  });

  const [modeNotice, setModeNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Sync mode changes across tabs and custom events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'contain' || e.newValue === 'cover')) {
        setFitMode(e.newValue);
      }
    };
    const handleCustomSync = (e: any) => {
      const mode = e.detail;
      if (mode === 'contain' || mode === 'cover') {
        setFitMode(mode);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('natal_before_after_mode_change', handleCustomSync);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('natal_before_after_mode_change', handleCustomSync);
    };
  }, []);

  const handleSelectMode = (newMode: 'contain' | 'cover') => {
    setFitMode(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
      window.dispatchEvent(new CustomEvent('natal_before_after_mode_change', { detail: newMode }));
    } catch (e) {
      console.warn('Could not save mode preference to localStorage:', e);
    }
    if (onModeChange) {
      onModeChange(newMode);
    }
    setModeNotice(newMode === 'cover' ? 'Fill Mode Locked' : 'Fit Mode Locked');
    setTimeout(() => {
      setModeNotice(null);
    }, 2200);
  };
  
  // Use a percentage (0-100) instead of raw pixels for better responsiveness
  const sliderPosition = useMotionValue(50); 
  const clipPathValue = useTransform(sliderPosition, (val) => `inset(0 ${100 - val}% 0 0)`);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDrag = (event: any, info: any) => {
    if (!containerWidth) return;
    
    // Calculate new percentage based on the drag delta
    const currentPercent = sliderPosition.get();
    const deltaPercent = (info.delta.x / containerWidth) * 100;
    
    let newPercent = currentPercent + deltaPercent;
    // Constrain between 0 and 100
    newPercent = Math.max(0, Math.min(100, newPercent));
    
    sliderPosition.set(newPercent);
  };

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    if (isResizing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    sliderPosition.set(newPercent);
  };

  const imageSizingClass = fitMode === 'contain' 
    ? 'w-full h-full object-contain object-center' 
    : 'w-full h-full object-cover object-center';

  return (
    <div 
      ref={containerRef}
      onClick={handleContainerClick}
      className="relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/10] lg:aspect-[16/10] min-h-[320px] sm:min-h-[440px] md:min-h-[520px] lg:min-h-[600px] max-h-[850px] overflow-hidden group select-none touch-pan-y bg-[#060606] cursor-ew-resize border border-gold/20"
    >
      {/* Architectural Studio Grid Background for Fit Mode Framing */}
      <div className="absolute inset-0 bg-[#060606] [background-image:radial-gradient(#d4af37_0.6px,transparent_0.6px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      {/* After Image (Base) */}
      <div className={`absolute inset-0 flex items-center justify-center ${fitMode === 'contain' ? 'p-1 sm:p-2' : 'p-0'}`}>
        <img 
          src={afterImage} 
          alt="After Transformation" 
          className={`${imageSizingClass} transition-all duration-300 pointer-events-none select-none`} 
          draggable={false} 
        />
        <div className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 bg-black-pure/90 backdrop-blur-md px-3 sm:px-4 py-1.5 min-w-[65px] sm:min-w-[80px] text-center border border-gold/60 shadow-xl pointer-events-none z-10">
          <span className="text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest font-mono">After</span>
        </div>
      </div>

      {/* Before Image (Clipped) */}
      <motion.div 
        className={`absolute inset-0 flex items-center justify-center ${fitMode === 'contain' ? 'p-1 sm:p-2' : 'p-0'} z-10`}
        style={{ clipPath: clipPathValue }}
      >
        <img 
          src={beforeImage} 
          alt="Before Transformation" 
          className={`${imageSizingClass} transition-all duration-300 pointer-events-none select-none`} 
          draggable={false} 
        />
        <div className="absolute top-3.5 left-3.5 sm:top-5 sm:left-5 bg-black-pure/90 backdrop-blur-md px-3 sm:px-4 py-1.5 min-w-[65px] sm:min-w-[80px] text-center border border-gold/60 shadow-xl pointer-events-none">
          <span className="text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest font-mono">Before</span>
        </div>
      </motion.div>

      {/* View Mode Toggle Pill (Fit Mode Default vs Fill Frame) */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-30 flex items-center bg-black-pure/95 backdrop-blur-md border border-gold/40 p-0.5 sm:p-1 rounded-sm shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectMode('contain');
          }}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-[9px] sm:text-[10px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
            fitMode === 'contain'
              ? 'bg-gold text-black-pure font-bold shadow-md'
              : 'text-gray-400 hover:text-gold hover:bg-white/5'
          }`}
          title="Fit Mode: Keep entire image visible without cropping"
        >
          <Scaling size={12} />
          <span>Fit Mode</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectMode('cover');
          }}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-[9px] sm:text-[10px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
            fitMode === 'cover'
              ? 'bg-gold text-black-pure font-bold shadow-md'
              : 'text-gray-400 hover:text-gold hover:bg-white/5'
          }`}
          title="Fill Mode: Fill entire frame edge-to-edge"
        >
          <Maximize2 size={12} />
          <span>Fill Mode</span>
        </button>
      </div>

      {/* Mode Lock Feedback Indicator */}
      {modeNotice && (
        <div className="absolute bottom-12 right-3 sm:bottom-14 sm:right-4 z-30 px-3 py-1 bg-black-pure/95 border border-gold text-gold text-[10px] font-mono uppercase tracking-wider shadow-lg rounded-sm pointer-events-none flex items-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{modeNotice}</span>
        </div>
      )}

      {/* Draggable Handle Container - Positioned precisely over the split line */}
      <motion.div 
        className="absolute top-0 bottom-0 z-20 w-1 flex items-center justify-center cursor-ew-resize touch-none"
        style={{ left: useTransform(sliderPosition, (val) => `${val}%`), x: '-50%' }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0}
        dragMomentum={false}
        onDrag={handleDrag}
        onDragStart={() => setIsResizing(true)}
        onDragEnd={() => setIsResizing(false)}
      >
        {/* The line itself */}
        <div className="absolute top-0 bottom-0 w-[2px] bg-gold shadow-[0_0_12px_rgba(212,175,55,0.7)]"></div>
        
        {/* The grab handle */}
        <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black-pure border-2 border-gold flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-transform duration-200 ${isResizing ? 'scale-90' : 'scale-100 hover:scale-110 active:scale-95'}`}>
          <MoveHorizontal className="text-gold w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </motion.div>
    </div>
  );
}
