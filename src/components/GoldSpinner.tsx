import React from 'react';

interface GoldSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeMap = {
  xs: 'w-3 h-3 border-[1.5px]',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[2.5px]',
  xl: 'w-12 h-12 border-[3px]',
};

export default function GoldSpinner({ size = 'md', className = '', label }: GoldSpinnerProps) {
  const sizeClasses = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`} role="status" aria-label={label || 'Loading'}>
      <div className="relative flex items-center justify-center shrink-0">
        {/* Subtle glowing background aura */}
        <span className="absolute inset-0 rounded-full bg-gold/20 blur-[3px] animate-pulse pointer-events-none" />
        
        {/* Animated circular gold spinner */}
        <div
          className={`${sizeClasses} rounded-full border-gold/25 border-t-gold border-r-amber-400 animate-spin shadow-[0_0_12px_rgba(212,175,55,0.4)]`}
        />
      </div>

      {label && (
        <span className="text-xs font-mono uppercase tracking-widest text-gold font-semibold select-none">
          {label}
        </span>
      )}
    </div>
  );
}
