"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, Search, Users, Filter, Tv, Eye, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface CreatorItem {
  id: string;
  name: string;
  handle?: string;
  slug: string;
  avatar_url?: string;
  total_reactions: number;
  total_views: number;
  avg_views_per_reaction: number;
}

function formatViews(views?: number): string {
  if (!views || views === 0) return '0 Views';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${Math.round(views / 1000)}K`;
  return views.toLocaleString();
}

function generateCleanSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function CreatorsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get('q') || '';

  const [creators, setCreators] = useState<CreatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchQuery] = useState(queryParam);
  const [sortBy, setSortBy] = useState<'views' | 'avg_views' | 'reactions' | 'name'>('views');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState('1');
  const itemsPerPage = 12;

  useEffect(() => {
    async function loadCreators() {
      setLoading(true);
      try {
        const supabase = createClient();

        const { data: channelData } = await supabase
          .from('channels')
          .select(`
            id,
            name,
            handle,
            slug,
            avatar_url,
            videos (
              id,
              view_count,
              verification_status
            )
          `);

        if (channelData) {
          const formatted: CreatorItem[] = channelData.map((c: any) => {
            const verifiedVideos = (c.videos || []).filter(
              (v: any) => v.verification_status === 'verified' || !v.verification_status
            );
            const totalViews = verifiedVideos.reduce((sum: number, v: any) => sum + (v.view_count || 0), 0);
            const totalReactions = verifiedVideos.length;

            return {
              id: c.id,
              name: c.name,
              handle: c.handle,
              slug: c.slug || generateCleanSlug(c.name),
              avatar_url: c.avatar_url,
              total_reactions: totalReactions,
              total_views: totalViews,
              avg_views_per_reaction: totalReactions > 0 ? Math.round(totalViews / totalReactions) : 0,
            };
          });

          setCreators(formatted);
        }
      } catch (err) {
        console.error('Error loading creators:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCreators();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setJumpPageInput('1');
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    router.push(`/creators?${params.toString()}`);
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const filteredItems = creators.filter((c) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchName = c.name.toLowerCase().includes(q);
      const matchHandle = c.handle?.toLowerCase().includes(q);
      if (!matchName && !matchHandle) return false;
    }
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    let res = 0;
    if (sortBy === 'avg_views') res = b.avg_views_per_reaction - a.avg_views_per_reaction;
    else if (sortBy === 'reactions') res = b.total_reactions - a.total_reactions;
    else if (sortBy === 'name') res = a.name.localeCompare(b.name);
    else res = b.total_views - a.total_views;

    return sortDirection === 'desc' ? res : -res;
  });

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage) || 1;
  const paginatedItems = sortedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    const validPage = Math.max(1, Math.min(totalPages, newPage));
    setCurrentPage(validPage);
    setJumpPageInput(validPage.toString());
  };

  const handlePageJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpPageInput, 10);
    if (!isNaN(parsed)) {
      handlePageChange(parsed);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 flex flex-col items-center justify-center text-zinc-400">
        <RefreshCw className="w-10 h-10 animate-spin text-red-600 mb-4" />
        <p className="text-sm font-medium">Loading Creator Directory...</p>
      </div>
    );
  }

  const renderPaginationControl = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 py-4 border-y border-zinc-800/80 my-4">
        <button
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
          className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-red-600 transition-all flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <form onSubmit={handlePageJumpSubmit} className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
          <span>Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpPageInput}
            onChange={(e) => setJumpPageInput(e.target.value)}
            onBlur={handlePageJumpSubmit}
            className="w-12 bg-zinc-900 border border-zinc-700 text-center font-bold text-white text-xs rounded-lg py-1 focus:outline-none focus:border-red-600"
          />
          <span>of <strong className="text-white">{totalPages}</strong></span>
        </form>
        <button
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
          className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-red-600 transition-all flex items-center gap-1 cursor-pointer"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="pt-20 pb-20 min-h-screen bg-[#09090b]">
      <div className="px-6 md:px-12 max-w-7xl mx-auto my-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6 mb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight uppercase flex items-center gap-2">
              <Users className="w-8 h-8 text-red-600" />
              Creator Directory ({creators.length})
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 mt-1 font-medium">
              Explore indexed movie reaction channels, video archives, and channel analytics
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search creator name or @handle..."
              value={searchTerm}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-red-600"
            />
          </form>
        </div>

        <div className="flex items-center justify-end gap-2 text-xs text-zinc-400 mb-6">
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
            onChange={(e: any) => { setSortBy(e.target.value); setCurrentPage(1); setJumpPageInput('1'); }}
            className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-600 cursor-pointer"
          >
            <option value="views">Total Reaction Views</option>
            <option value="avg_views">Views Per Reaction</option>
            <option value="reactions">Most Reactions</option>
            <option value="name">Channel Name (A-Z)</option>
          </select>
        </div>

        {renderPaginationControl()}

        {sortedItems.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            <p className="text-base font-bold text-zinc-400">No creators found matching "{searchTerm}".</p>
            <button
              onClick={() => { setSearchQuery(''); setCurrentPage(1); setJumpPageInput('1'); }}
              className="mt-3 text-xs text-red-500 font-bold hover:underline cursor-pointer"
            >
              Reset Search
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedItems.map((c) => (
                <Link
                  key={c.id}
                  href={`/creators/${c.slug}`}
                  className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/60 rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] shadow-xl flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-950 border border-zinc-700 flex-none">
                      <Image
                        src={c.avatar_url || '/placeholder.png'}
                        alt={c.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-sm text-white group-hover:text-red-400 transition-colors truncate">
                        {c.name}
                      </h3>
                      {c.handle && (
                        <p className="text-[11px] text-zinc-400 font-medium truncate">
                          {c.handle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 border-t border-zinc-800/80 pt-3 mt-1">
                    <span className="flex items-center gap-1 text-zinc-300">
                      <Tv className="w-3.5 h-3.5 text-red-500" />
                      {c.total_reactions} Reactions
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <Eye className="w-3.5 h-3.5" />
                      {formatViews(sortBy === 'avg_views' ? c.avg_views_per_reaction : c.total_views)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {renderPaginationControl()}
          </>
        )}
      </div>
    </div>
  );
}

export default function CreatorsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090b] pt-32 flex flex-col items-center justify-center text-zinc-400">
        <RefreshCw className="w-10 h-10 animate-spin text-red-600 mb-4" />
        <p className="text-sm font-medium">Loading Creator Directory...</p>
      </div>
    }>
      <CreatorsContent />
    </Suspense>
  );
}