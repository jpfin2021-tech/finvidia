"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, Search, Clapperboard, Filter, Tv, Eye, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface ExtendedMediaItem {
  id: string;
  media_type: string;
  title: string;
  release_year: number;
  synopsis?: string;
  poster_url?: string;
  backdrop_url?: string;
  studio_label?: string;
  total_views?: number;
  reaction_count?: number;
  avg_views_per_video?: number;
  directors?: { id: string; name: string; slug: string }[];
  actors?: { id: string; name: string; slug: string }[];
  genres?: { id: string; name: string; slug: string }[];
}

function formatViews(views?: number): string {
  if (!views || views === 0) return '0 Views';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${Math.round(views / 1000)}K`;
  return views.toLocaleString();
}

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryParam = searchParams.get('q') || '';
  const genreParam = searchParams.get('genre') || '';

  const [mediaItems, setMediaItems] = useState<ExtendedMediaItem[]>([]);
  const [genres, setGenres] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchQuery] = useState(queryParam);
  const [selectedGenre, setSelectedGenre] = useState(genreParam);
  const [filterMode, setFilterMode] = useState<'all' | 'multi'>('all');
  const [sortBy, setSortBy] = useState<'views' | 'avg_views' | 'reactions' | 'year' | 'title'>('views');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 18;

  useEffect(() => {
    async function loadDirectoryData() {
      setLoading(true);
      try {
        const supabase = createClient();

        const { data: genreData } = await supabase.from('genres').select('id, name, slug').order('name');
        if (genreData) setGenres(genreData);

        let allMedia: any[] = [];
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
              synopsis,
              poster_url,
              backdrop_url,
              studio_label,
              videos (id, view_count),
              media_directors (
                directors (id, name, slug)
              ),
              media_actors (
                actors (id, name, slug)
              ),
              media_genres (
                genres (id, name, slug)
              )
            `)
            .range(page * 1000, (page + 1) * 1000 - 1);

          if (error || !data || data.length === 0) {
            hasMore = false;
          } else {
            allMedia = allMedia.concat(data);
            if (data.length < 1000) hasMore = false;
            page++;
          }
        }

        const formattedMedia: ExtendedMediaItem[] = allMedia.map((m: any) => {
          const vids = m.videos || [];
          const totalViews = vids.reduce((sum: number, v: any) => sum + (v.view_count || 0), 0);
          const reactionCount = vids.length;

          return {
            id: m.id,
            media_type: m.media_type || 'movie',
            title: m.title,
            release_year: m.release_year,
            synopsis: m.synopsis,
            poster_url: m.poster_url,
            backdrop_url: m.backdrop_url,
            studio_label: m.studio_label,
            total_views: totalViews,
            reaction_count: reactionCount,
            avg_views_per_video: reactionCount > 0 ? Math.round(totalViews / reactionCount) : 0,
            directors: m.media_directors?.map((md: any) => md.directors).filter(Boolean) || [],
            actors: m.media_actors?.map((ma: any) => ma.actors).filter(Boolean) || [],
            genres: m.media_genres?.map((mg: any) => mg.genres).filter(Boolean) || [],
          };
        });

        setMediaItems(formattedMedia);
      } catch (err) {
        console.error('Error loading browse directory:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDirectoryData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (selectedGenre) params.set('genre', selectedGenre);
    router.push(`/browse?${params.toString()}`);
  };

  const handleGenreSelect = (slug: string) => {
    setCurrentPage(1);
    const newGenre = selectedGenre === slug ? '' : slug;
    setSelectedGenre(newGenre);
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (newGenre) params.set('genre', newGenre);
    router.push(`/browse?${params.toString()}`);
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const filteredItems = mediaItems.filter((item) => {
    if (filterMode === 'multi' && (item.reaction_count || 0) < 2) return false;

    if (selectedGenre) {
      const hasGenre = item.genres?.some((g: { slug: string }) => g.slug === selectedGenre);
      if (!hasGenre) return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchYear = item.release_year.toString().includes(q);
      const matchDirector = item.directors?.some((d: { name: string }) => d.name.toLowerCase().includes(q));
      const matchActor = item.actors?.some((a: { name: string }) => a.name.toLowerCase().includes(q));
      const matchStudio = item.studio_label?.toLowerCase().includes(q);
      if (!matchTitle && !matchYear && !matchDirector && !matchActor && !matchStudio) return false;
    }

    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    let res = 0;
    if (sortBy === 'avg_views') res = (b.avg_views_per_video || 0) - (a.avg_views_per_video || 0);
    else if (sortBy === 'reactions') res = (b.reaction_count || 0) - (a.reaction_count || 0);
    else if (sortBy === 'year') res = b.release_year - a.release_year;
    else if (sortBy === 'title') res = a.title.localeCompare(b.title);
    else res = (b.total_views || 0) - (a.total_views || 0);

    return sortDirection === 'desc' ? res : -res;
  });

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage) || 1;
  const paginatedItems = sortedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 flex flex-col items-center justify-center text-zinc-400">
        <RefreshCw className="w-10 h-10 animate-spin text-red-600 mb-4" />
        <p className="text-sm font-medium">Loading Movie Directory...</p>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-20 min-h-screen bg-[#09090b]">
      <div className="px-6 md:px-12 max-w-7xl mx-auto my-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight uppercase flex items-center gap-2">
              <Clapperboard className="w-8 h-8 text-red-600" />
              Movie Reaction Index
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 mt-1 font-medium">
              Browse master movie catalog. Click any film to watch all available creator reactions.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search title, director, actor, reactor..."
              value={searchTerm}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-red-600"
            />
          </form>
        </div>

        <div className="my-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              <button
                onClick={() => { setFilterMode('all'); setCurrentPage(1); }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'all' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
              >
                All Films ({sortedItems.length})
              </button>
              <button
                onClick={() => { setFilterMode('multi'); setCurrentPage(1); }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'multi' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Multi-Reactor Films
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <button
                onClick={toggleSortDirection}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-600 text-red-500 transition-all cursor-pointer"
                title={`Sort Order: ${sortDirection === 'desc' ? 'Descending' : 'Ascending'}`}
              >
                {sortDirection === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
              </button>

              <Filter className="w-4 h-4 text-red-500" />
              <span>Sort By:</span>
              <select
                value={sortBy}
                onChange={(e: any) => { setSortBy(e.target.value); setCurrentPage(1); }}
                className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-600 cursor-pointer"
              >
                <option value="views">Total Reaction Views</option>
                <option value="avg_views">Views Per Reaction</option>
                <option value="reactions">Most Creator Reactions</option>
                <option value="year">Release Year</option>
                <option value="title">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>

          {genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="text-[11px] font-bold text-zinc-500 uppercase mr-1">Genres:</span>
              <button
                onClick={() => handleGenreSelect('')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                  !selectedGenre ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                All Genres
              </button>
              {genres.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleGenreSelect(g.slug)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                    selectedGenre === g.slug ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {sortedItems.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <p className="text-base font-bold text-zinc-400">No movies match your filter criteria.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedGenre(''); setFilterMode('all'); setCurrentPage(1); }}
              className="mt-3 text-xs text-red-500 font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {paginatedItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/media/${item.id}`}
                  className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/60 rounded-xl overflow-hidden p-2.5 transition-all duration-300 hover:scale-[1.02] shadow-md flex flex-col justify-between"
                >
                  <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-zinc-950 mb-2">
                    <Image
                      src={item.poster_url || '/placeholder.png'}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 45vw, 220px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {item.release_year > 0 && (
                      <span className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-[10px] font-black text-white px-2 py-0.5 rounded border border-white/10">
                        {item.release_year}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-xs text-white group-hover:text-red-400 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    {item.studio_label && (
                      <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
                        {item.studio_label}
                      </p>
                    )}

                    {(item.total_views !== undefined || item.reaction_count !== undefined) && (
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 border-t border-zinc-800/80 pt-2 mt-2">
                        {item.total_views !== undefined && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Eye className="w-3 h-3" />
                            {formatViews(sortBy === 'avg_views' ? item.avg_views_per_video : item.total_views)}
                          </span>
                        )}
                        {item.reaction_count !== undefined && (
                          <span className="flex items-center gap-1 text-zinc-300">
                            <Tv className="w-3 h-3 text-red-500" />
                            {item.reaction_count}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Touch-Friendly Page Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-800/80 pt-6 mt-8">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-red-600 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <span className="text-xs font-bold text-zinc-400">
                  Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-red-600 transition-all flex items-center gap-1 cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090b] pt-32 flex flex-col items-center justify-center text-zinc-400">
        <RefreshCw className="w-10 h-10 animate-spin text-red-600 mb-4" />
        <p className="text-sm font-medium">Loading Movie Directory...</p>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}