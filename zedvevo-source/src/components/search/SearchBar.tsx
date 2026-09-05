import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Music2, Video as VideoIcon, User, Trophy, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { globalSearch } from '@/lib/api';
import type { SearchResult } from '@/types/index';

function ResultIcon({ type }: { type: SearchResult['type'] }) {
  if (type === 'song') return <Music2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  if (type === 'video') return <VideoIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  if (type === 'artist') return <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  return <Trophy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const navigate = useNavigate();

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await globalSearch(q, 'all', 'relevance', 8);
      setResults(res);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => doSearch(query), 280);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (r: SearchResult) => {
    setOpen(false);
    setQuery('');
    if (r.type === 'song') navigate(`/music?id=${r.id}`);
    else if (r.type === 'video') navigate(`/videos?id=${r.id}`);
    else if (r.type === 'artist') navigate(`/search?q=${encodeURIComponent(r.title)}&filter=artists`);
    else navigate(`/awards`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    setQuery('');
  };

  const showDropdown = open && (loading || results.length > 0 || query.length >= 2);

  return (
    <div ref={containerRef} className="relative w-full max-w-xs lg:max-w-sm">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search music, videos, artists…"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="w-full h-8 pl-8 pr-8 bg-muted rounded-md text-sm border border-border focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-foreground/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 z-[200] bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          )}
          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="px-3 py-2.5 text-xs text-muted-foreground">No results for "{query}"</div>
          )}
          {!loading && results.slice(0, 8).map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/60 text-left transition-colors"
              onClick={() => handleSelect(r)}
            >
              <div className="h-8 w-8 rounded shrink-0 bg-muted overflow-hidden flex items-center justify-center">
                {r.cover_url
                  ? <img src={r.cover_url} alt={r.title} className="w-full h-full object-cover" />
                  : <ResultIcon type={r.type} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
              </div>
              <span className="text-[10px] text-muted-foreground/50 uppercase shrink-0">{r.type}</span>
            </button>
          ))}
          {!loading && results.length > 0 && (
            <button
              onClick={() => {
                setOpen(false);
                navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                setQuery('');
              }}
              className="w-full px-3 py-2 text-xs text-accent font-medium hover:bg-muted/60 border-t border-border text-left"
            >
              See all results for "{query}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
