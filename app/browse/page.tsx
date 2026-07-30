"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MediaCard from '@/components/media-card';
import { createClient } from '@/lib/supabase/client';
import { MediaItem } from '@/types/database';
import { Search, ArrowUp, ArrowDown, SlidersHorizontal, RefreshCw, ChevronLeft, ChevronRight, Users, Tag } from 'lucide-react';

const ITEMS_PER_PAGE = 24;

const DEFAULT_GENRES = [
  { id: '1', name: 'Action', slug: 'action' },
  { id: '2', name: 'Adventure', slug: 'adventure' },
  { id: '3', name: 'Animation', slug: 'animation' },
  { id: '4', name: 'Comedy', slug: 'comedy' },
  { id: '5', name: 'Crime', slug: 'crime' },
  { id: '6', name: 'Drama', slug: 'drama' },
  { id: '7', name: 'Family', slug: 'family' },
  { id: '8', name: 'Fantasy', slug: 'fantasy' },
  { id: '9', name: 'Horror', slug: 'horror' },
  { id: '10', name: 'Mystery', slug: 'mystery' },
  { id: '11', name: 'Romance', slug: 'romance' },
  { id: '12', name: 'Sci-Fi', slug: 'science-fiction' },
  { id: '13', name: 'Thriller', slug: 'thriller' },
  { id: '14', name: 'War', slug: 'war' },
];

const GENRE_KEYWORDS: Record<string, string[]> = {
  action: ['action', 'wick', 'deadpool', 'fury', 'terminator', 'predator', 'aliens', 'avengers', 'batman', 'matrix', 'rambo', 'die hard', 'gladiator', 'hacksaw ridge', 'top gun', 'mission: impossible', 'fast', 'furious', 'indiana jones', 'star wars', 'marvel', 'dc', 'spider-man', 'iron man', 'thor', 'captain america', 'dark knight', 'x-men', 'transformers', 'jurassic', 'bond', 'bourne', 'kingsman', 'john wick', 'heat', 'speed', 'mad max'],
  comedy: ['comedy', 'vinny', 'robin hood', 'forrest gump', 'deadpool', 'tropic thunder', '300', 'barbie', 'ghostbusters', 'back to the future', 'men in black', 'home alone', 'hangover', 'superbad', 'anchorman', 'step brothers', 'jump street', 'shrek', 'toy story', 'pixar', 'lego', 'clueless', 'mean girls', 'ferris bueller', 'big lebowski', 'spaceballs', 'zoolander', 'my cousin vinny', 'mrs. doubtfire', 'liar liar', 'dumb and dumber'],
  horror: ['horror', 'resident evil', 'alien', 'thing', 'shining', 'conjuring', 'saw', 'scream', 'halloween', 'friday the 13th', 'nightmare', 'exorcist', 'quiet place', 'hereditary', 'get out', 'midsommar', 'it', 'psycho', 'texas chainsaw', 'evil dead', 'us', 'blair witch', 'paranormal', 'ring', 'grudge', 'insidious', 'babadook', 'chucky', 'nosferatu'],
  'science-fiction': ['science-fiction', 'sci-fi', 'interstellar', 'matrix', 'star wars', 'blade runner', 'dune', 'inception', 'aliens', 'terminator', 'back to the future', 'jurassic', 'avatar', 'arrival', 'fifth element', '2001', 'planet of the apes', 'district 9', 'gravity', 'martian', 'minority report', 'truman show', 'edge of tomorrow'],
  drama: ['drama', 'godfather', 'schindler', 'shawshank', 'pulp fiction', 'fight club', 'forrest gump', 'green mile', 'goodfellas', 'saving private ryan', '12 angry men', 'oppenheimer', 'whiplash', 'prestige', 'social network', 'departed', 'good will hunting', 'truman show', 'titanic', 'parasite', 'gladiator', 'braveheart'],
  war: ['war', 'saving private ryan', 'hacksaw ridge', 'fury', '1917', 'platoon', 'full metal jacket', 'apocalypse now', 'dunkirk', 'thin red line', 'black hawk down', 'inglourious basterds', 'schindler', 'patton', 'bridge on the river kwai'],
  fantasy: ['fantasy', 'lord of the rings', 'fellowship', 'two towers', 'return of the king', 'harry potter', 'hobbit', 'chronicles of narnia', 'princess bride', 'pirates of the caribbean', 'pan\'s labyrinth', 'labyrinth', 'willow', 'stardust', 'dungeons & dragons'],
  thriller: ['thriller', 'se7en', 'silence of the lambs', 'zodiac', 'shutter island', 'gone girl', 'prisoner', 'prisoners', 'memento', 'psycho', 'sixth sense', 'nightcrawler', 'no country for old men', 'black swan', 'misery', 'cape fear'],
  crime: ['crime', 'godfather', 'pulp fiction', 'goodfellas', 'scarface', 'departed', 'casino', 'heat', 'fargo', 'no country for old men', 'town', 'irishman', 'reservoir dogs', 'snatch', 'usual suspects'],
  adventure: ['adventure', 'indiana jones', 'lord of the rings', 'jurassic', 'pirates of the caribbean', 'star wars', 'mummy', 'jumanji', 'treasure', 'goonies', 'national treasure', 'interstellar', 'avatar'],
  animation: ['animation', 'animated', 'lion king', 'toy story', 'shrek', 'spider-verse', 'finding nemo', 'incredibles', 'up', 'wall-e', 'coco', 'ratatouille', 'monsters inc', 'spirited away', 'how to train your dragon', 'inside out'],
};

type ExtendedMediaItem = MediaItem & {
  video_count: number;
  total_views: number;
  avg_views_per_reactor: number;
  actors?: { name: string }[];
};

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filterParam = searchParams.get('filter') || 'all';
  const genreParam = searchParams.get('genre') || 'all';
  const queryParam = searchParams.get('q') || '';
  const sortParam = (searchParams.get('sort') as any) || 'views';

  const [mediaList, setMediaList] = useState<ExtendedMediaItem[]>([]);
  const [genres, setGenres] = useState(DEFAULT_GENRES);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'views' | 'avg_views' | 'reactions' | 'alpha' | 'oc_year'>(sortParam);
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [localSearch, setLocalSearch] = useState(queryParam);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterParam, genreParam, queryParam, sortBy]);

  useEffect(() => {
    setLocalSearch(queryParam);
  }, [queryParam]);

  useEffect(() => {
    async function fetchGenres() {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('genres').select('*').order('name');
        if (data && data.length > 0) {
          setGenres(data.map((g: any) => ({ id: g.id, name: g.name, slug: g.slug || g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') })));
        }
      } catch (err) {
        console.error('Error fetching genres:', err);
      }
    }
    fetchGenres();
  }, []);

  useEffect(() => {
    async function fetchMediaCatalog() {
      setLoading(true);
      try {
        const supabase = createClient();

        let allData: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('media_items')
            .select(`
              id,
              media_type,
              title,
              release_year,
              studio_label,
              synopsis,
              poster_url,
              backdrop_url,
              media_directors (
                directors (id, name, slug)
              ),
              media_actors (
                actors (id, name, slug)
              ),
              media_genres (
                genres (id, name, slug)
              ),
              videos (id, view_count)
            `)
            .eq('media_type', 'movie')
            .range(page * 1000, (page + 1) * 1000 - 1);

          if (error || !data || data.length === 0) {
            hasMore = false;
          } else {
            allData = allData.concat(data);
            if (data.length < 1000) hasMore = false;
            page++;
          }
        }

        if (allData) {
          let formatted: ExtendedMediaItem[] = allData.map((m: any) => {
            const vids = m.videos || [];
            const viewsSum = vids.reduce((sum: number, v: any) => sum + (v.view_count || 0), 0);
            const count = vids.length;
            const avgViews = count > 0 ? Math.round(viewsSum / count) : 0;

            return {
              id: m.id,
              media_type: m.media_type,
              title: m.title,
              release_year: m.release_year,
              studio_label: m.studio_label,
              synopsis: m.synopsis,
              poster_url: m.poster_url,
              backdrop_url: m.backdrop_url,
              directors: m.media_directors?.map((md: any) => md.directors).filter(Boolean) || [],
              actors: m.media_actors?.map((ma: any) => ma.actors).filter(Boolean) || [],
              genres: m.media_genres?.map((mg: any) => mg.genres).filter(Boolean) || [],
              video_count: count,
              total_views: viewsSum,
              avg_views_per_reactor: avgViews,
            };
          });

          if (filterParam === 'multi') {
            formatted = formatted.filter((m) => m.video_count > 1);
          }

          if (genreParam !== 'all') {
            const cleanTarget = genreParam.toLowerCase();
            const keywords = GENRE_KEYWORDS[cleanTarget] || [cleanTarget];

            formatted = formatted.filter((m) => {
              const databaseMatch = m.genres?.some((g) => g.slug === cleanTarget || g.name.toLowerCase() === cleanTarget);
              if (databaseMatch) return true;

              const titleLower = m.title.toLowerCase();
              return keywords.some((kw) => titleLower.includes(kw));
            });
          }

          if (queryParam.trim()) {
            const term = queryParam.toLowerCase();
            formatted = formatted.filter((m) => {
              const titleMatch = m.title.toLowerCase().includes(term);
              const directorMatch = m.directors?.some((d) => d.name.toLowerCase().includes(term));
              const actorMatch = m.actors?.some((a) => a.name.toLowerCase().includes(term));
              const studioMatch = m.studio_label?.toLowerCase().includes(term);
              const yearMatch = m.release_year?.toString().includes(term);

              return titleMatch || directorMatch || actorMatch || studioMatch || yearMatch;
            });
          }

          formatted.sort((a, b) => {
            if (sortBy === 'views') return b.total_views - a.total_views;
            if (sortBy === 'avg_views') return b.avg_views_per_reactor - a.avg_views_per_reactor;
            if (sortBy === 'reactions') return b.video_count - a.video_count;
            if (sortBy === 'oc_year') return b.release_year - a.release_year;
            return a.title.localeCompare(b.title);
          });

          if (sortDirection === 'asc') {
            formatted.reverse();
          }

          setMediaList(formatted);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMediaCatalog();
  }, [filterParam, genreParam, queryParam, sortBy]);

  // Instant in-memory sort reversal without re-fetching
  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    setMediaList((prev) => [...prev].reverse());
  };

  const updateFilter = (newFilter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newFilter === 'all') params.delete('filter');
    else params.set('filter', newFilter);
    router.push(`/browse?${params.toString()}`);
  };

  const updateGenre = (newGenreSlug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newGenreSlug === 'all') params.delete('genre');
    else params.set('genre', newGenreSlug);
    router.push(`/browse?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (localSearch.trim()) params.set('q', localSearch.trim());
    else params.delete('q');
    router.push(`/browse?${params.toString()}`);
  };

  const totalPages = Math.ceil(mediaList.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMedia = mediaList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="pt-24 pb-16 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6 mb-8 border-b border-zinc-800 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              <SlidersHorizontal className="w-7 h-7 text-red-600" />
              Movie Reaction Index
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Browse master movie catalog. Click any film to watch all available creator reactions.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search title, actor, director, year..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-red-600"
            />
          </form>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateFilter('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                filterParam === 'all'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              All Films ({mediaList.length})
            </button>
            <button
              onClick={() => updateFilter('multi')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                filterParam === 'multi'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Multi-Reactor Films
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            {/* Instant In-Memory Sort Direction Toggle Button */}
            <button
              onClick={toggleSortDirection}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-600 text-red-500 transition-all cursor-pointer"
              title={`Toggle Sort Direction (${sortDirection === 'desc' ? 'Descending' : 'Ascending'})`}
            >
              {sortDirection === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
            </button>

            <span className="font-semibold">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-600 cursor-pointer font-medium"
            >
              <option value="views">Total Reaction Views</option>
              <option value="avg_views">Avg Views per Reaction</option>
              <option value="reactions">Total Reactions Indexed</option>
              <option value="alpha">Alphabetical by Film Title (A–Z)</option>
              <option value="oc_year">Original Theatrical Release Date</option>
            </select>
          </div>
        </div>

        {/* Prominent Genre Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-2 no-scrollbar text-xs border-t border-zinc-800/80">
          <span className="text-zinc-400 font-extrabold flex items-center gap-1 flex-none mr-1 uppercase tracking-wider text-[11px]">
            <Tag className="w-3.5 h-3.5 text-red-500" /> Genres:
          </span>
          <button
            onClick={() => updateGenre('all')}
            className={`px-4 py-1.5 rounded-full font-black flex-none transition-all cursor-pointer border ${
              genreParam === 'all'
                ? 'bg-red-600 text-white border-red-600 shadow-md'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
            }`}
          >
            All Genres
          </button>
          {genres.map((g) => (
            <button
              key={g.id}
              onClick={() => updateGenre(g.slug)}
              className={`px-3.5 py-1.5 rounded-full font-bold flex-none transition-all cursor-pointer border ${
                genreParam === g.slug
                  ? 'bg-amber-500 text-black border-amber-500 font-extrabold shadow-md'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-zinc-500 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
          <p className="text-sm font-medium">Filtering Master Cinema Catalog...</p>
        </div>
      ) : paginatedMedia.length === 0 ? (
        <div className="py-20 text-center bg-zinc-900/50 rounded-2xl border border-zinc-800 p-8">
          <h3 className="text-lg font-bold text-white">No movies found</h3>
          <p className="text-sm text-zinc-400 mt-1">
            Try searching for a different genre, title, actor, or director.
          </p>
          <button
            onClick={() => router.push('/browse')}
            className="mt-4 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {paginatedMedia.map((media) => (
              <MediaCard key={media.id} media={media} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-800 pt-8 mt-12">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <span className="text-xs text-zinc-400 font-semibold">
                Page <span className="text-white font-bold">{currentPage}</span> of{' '}
                <span className="text-white font-bold">{totalPages}</span>
              </span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="pt-32 text-center text-zinc-400">Loading catalog...</div>}>
      <BrowseContent />
    </Suspense>
  );
}