import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface SectionRowProps {
  title: string;
  viewAllLink?: string;
  children: ReactNode;
  loading?: boolean;
  skeletonCount?: number;
  skeletonClassName?: string;
  className?: string;
  /** When true, renders a wrapping grid instead of a horizontal scroll row */
  grid?: boolean;
}

export default function SectionRow({
  title, viewAllLink, children, loading, skeletonCount = 6,
  skeletonClassName = 'h-48 w-40', className = '', grid = false,
}: SectionRowProps) {
  return (
    <section className={`py-6 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-accent transition-colors font-medium"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        {loading ? (
          <div className={grid
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3'
            : 'flex gap-3 overflow-x-hidden'
          }>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <Skeleton key={i} className={`${grid ? 'w-full' : 'shrink-0'} rounded-lg ${skeletonClassName}`} />
            ))}
          </div>
        ) : grid ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {children}
          </div>
        ) : (
          <div className="scroll-row -mx-4 px-4">
            <div className="flex gap-3 w-max pb-1">
              {children}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
