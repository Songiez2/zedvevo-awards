import BackToHome from '@/components/common/BackToHome';
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Music2, Video as VideoIcon, User, Trophy, Loader2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { globalSearch } from '@/lib/api';
import type { SearchResult, SearchFilter, SearchSort } from '@/types/index';

const FILTERS: { value: SearchFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'music', label: 'Music' },
  { value: 'videos', label: 'Videos' },
  { value: 'artists', label: 'Artists' },
  { value: 'awards', label: 'Awards' },
];

const SORTS: { value: SearchSort; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'most_played', label: 'Most Played' },
  { value: 'most_downloaded', label: 'Most Downloaded' },
  { value: 'most_viewed', label: 'Most Viewed' },
];

function ResultRow({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  const icons = { song: Music2, video: VideoIcon, artist: User, nominee: Trophy };
  const Icon = icons[result.type];
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 text-left transition-colors group"
    >
      <div className="h-12 w-12 rounded-md shrink-0 bg-muted overflow-hidden flex items-center justify-center">
        {result.cover_url
          ? <img src={result.cover_url} alt={result.title} className="w-full h-full object-cover" />
          : <Icon className="h-5 w-5 text-muted-foreground" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-accent">{result.title}</p>
        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{result.type}</Badge>
    </button>
  );
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(params.get('q') || '');
  const [filter, setFilter] = useState<SearchFilter>((params.get('filter') as SearchFilter) || 'all');
  const [sort, setSort] = useState<SearchSort>('relevance');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = async (q: string, f: SearchFilter, s: SearchSort) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await globalSearch(q, f, s, 40);
      setResults(res);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const q = params.get('q') || '';
    const f = (params.get('filter') as SearchFilter) || 'all';
    setQuery(q); setFilter(f);
    if (q) doSearch(q, f, sort);
  }, [params]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setParams({ q: query.trim(), filter });
  };

  const handleFilterChange = (f: SearchFilter) => {
    setFilter(f);
    if (query.trim()) doSearch(query, f, sort);
  };

  const handleSortChange = (s: SearchSort) => {
    setSort(s);
    if (query.trim()) doSearch(query, filter, s);
  };

  const handleSelect = (r: SearchResult) => {
    if (r.type === 'song') navigate(`/music?id=${r.id}`);
    else if (r.type === 'video') navigate(`/videos?id=${r.id}`);
    else if (r.type === 'artist') navigate(`/search?q=${encodeURIComponent(r.title)}&filter=artists`);
    else navigate(`/awards`);
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <BackToHome />
        {/* Search form */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search songs, videos, artists, awards…"
              className="pl-9"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={!query.trim()}>Search</Button>
        </form>

        {/* Filters + sort */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  filter === f.value
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={sort} onValueChange={v => handleSortChange(v as SearchSort)}>
              <SelectTrigger className="h-7 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-16">
            <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No results found for <strong>"{query}"</strong></p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try different keywords or filters</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground mb-3">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            <div className="divide-y divide-border/50">
              {results.map(r => (
                <ResultRow key={`${r.type}-${r.id}`} result={r} onClick={() => handleSelect(r)} />
              ))}
            </div>
          </>
        )}

        {!searched && (
          <div className="text-center py-16">
            <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground/60 text-sm">Enter a search term to find music, videos, artists and more</p>
          </div>
        )}
      </div>
    </div>
  );
}
