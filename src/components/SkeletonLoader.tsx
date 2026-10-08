import React from 'react';

/**
 * Subtle luxury skeleton shimmer matching Natal's deep-black and gold palette.
 */
export function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-white/[0.04] border border-white/[0.06] rounded-none before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-gold/[0.12] before:to-transparent ${className}`}
    />
  );
}

/**
 * Skeleton loader for Project & Creation cards
 */
export function ProjectCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`proj-skeleton-${i}`}
          className="group relative flex flex-col bg-black-rich border border-gold/20 overflow-hidden shadow-2xl h-full w-full flex-grow animate-pulse"
        >
          {/* Gold Top Accent Line */}
          <div className="h-1 bg-gradient-to-r from-gold/40 via-yellow-200/40 to-amber-600/40 shrink-0" />

          {/* Image placeholder */}
          <div className="relative aspect-[16/9] lg:aspect-[16/10] overflow-hidden shrink-0 bg-black-pure/80 p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1.5">
              <SkeletonPulse className="w-16 h-4 border-gold/30" />
            </div>
            <div className="w-full flex justify-between items-end">
              <SkeletonPulse className="w-20 h-3" />
              <div className="w-4 h-4 rounded-full bg-gold/10 border border-gold/20" />
            </div>
          </div>

          {/* Content Section */}
          <div className="p-2 sm:p-2.5 lg:p-4 flex-grow flex flex-col justify-between space-y-2">
            <div>
              <SkeletonPulse className="w-3/4 h-4 mb-2" />
              <SkeletonPulse className="w-full h-3 mb-1" />
              <SkeletonPulse className="w-2/3 h-3" />
            </div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <SkeletonPulse className="w-16 h-3" />
              <SkeletonPulse className="w-20 h-6 border-gold/20" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Skeleton loader for table or list rows (Leads, Users, Notifications)
 */
export function TableRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`row-skeleton-${i}`}
          className="p-3 sm:p-4 bg-black-pure/70 border border-gold/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gold/10 border border-gold/30 shrink-0 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gold/20" />
            </div>
            <div className="space-y-1.5 min-w-0">
              <SkeletonPulse className="w-32 sm:w-44 h-3.5" />
              <div className="flex items-center gap-2">
                <SkeletonPulse className="w-24 h-2.5" />
                <SkeletonPulse className="w-16 h-2.5" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            <SkeletonPulse className="w-20 h-6 border-gold/20" />
            <SkeletonPulse className="w-16 h-6 border-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for services, testimonials, or transformations
 */
export function CardSkeleton({ count = 3, height = 'h-48' }: { count?: number; height?: string }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`card-skeleton-${i}`}
          className={`bg-black-pure/80 border border-gold/20 p-4 sm:p-5 flex flex-col justify-between animate-pulse ${height}`}
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <SkeletonPulse className="w-24 h-4 border-gold/30" />
              <div className="w-6 h-6 rounded-full bg-gold/10" />
            </div>
            <SkeletonPulse className="w-3/4 h-5" />
            <SkeletonPulse className="w-full h-3" />
            <SkeletonPulse className="w-4/5 h-3" />
          </div>
          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
            <SkeletonPulse className="w-16 h-3" />
            <SkeletonPulse className="w-20 h-6 border-gold/20" />
          </div>
        </div>
      ))}
    </>
  );
}
