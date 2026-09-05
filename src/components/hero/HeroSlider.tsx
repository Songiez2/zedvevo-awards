import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getActiveBanners } from '@/lib/api';
import type { HeroBanner } from '@/types/index';

const SLIDE_INTERVAL = 6000;

export default function HeroSlider() {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [kenDir, setKenDir] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    getActiveBanners()
      .then(setBanners)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const go = useCallback((idx: number) => {
    setCurrent(idx);
    setKenDir(prev => !prev);
  }, []);

  const next = useCallback(() => {
    setBanners(prev => { go((current + 1) % prev.length); return prev; });
  }, [current, go]);

  const prev = useCallback(() => {
    setBanners(prev => { go((current - 1 + prev.length) % prev.length); return prev; });
  }, [current, go]);

  useEffect(() => {
    if (paused || banners.length < 2) return;
    timerRef.current = setTimeout(() => {
      setCurrent(c => (c + 1) % banners.length);
      setKenDir(d => !d);
    }, SLIDE_INTERVAL);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, paused, banners.length]);

  const handleInteraction = () => {
    setPaused(true);
    setTimeout(() => setPaused(false), 8000);
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { handleInteraction(); diff > 0 ? next() : prev(); }
  };

  if (loading) return (
    <div className="relative w-full" style={{ height: 'min(70vh, 560px)' }}>
      <Skeleton className="w-full h-full rounded-none" />
    </div>
  );

  if (!banners.length) return null;

  const banner = banners[current];

  return (
    <section
      className="relative w-full overflow-hidden select-none"
      style={{ height: 'min(70vh, 560px)' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides */}
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        >
          {/* Ken Burns image */}
          <div
            className={`absolute inset-0 ${i === current ? (kenDir ? 'animate-ken-burns' : 'animate-ken-burns-reverse') : ''}`}
            style={{
              backgroundImage: `url(${b.image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      ))}

      {/* Content overlay */}
      <div className="absolute inset-0 z-20 flex items-end">
        <div className="w-full max-w-7xl mx-auto px-6 pb-12 md:pb-16">
          <div key={current} className="animate-slide-fade-in max-w-xl">
            <p className="text-accent text-xs md:text-sm font-semibold uppercase tracking-widest mb-2">ZedVevo</p>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-3 text-balance">
              {banner.title}
            </h1>
            {banner.subtitle && (
              <p className="text-white/80 text-sm md:text-base mb-5 text-pretty">{banner.subtitle}</p>
            )}
            {banner.button_text && banner.button_url && (
              <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground border-0">
                <Link to={banner.button_url}>{banner.button_text}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Prev/Next */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => { handleInteraction(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full glass-dark flex items-center justify-center text-white/80 hover:text-white transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => { handleInteraction(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full glass-dark flex items-center justify-center text-white/80 hover:text-white transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => { handleInteraction(); go(i); }}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-6 h-2 bg-accent' : 'w-2 h-2 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
