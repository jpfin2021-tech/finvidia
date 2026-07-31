"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, Search, Users, Tv, Eye, ChevronLeft, ChevronRight, Filter, ArrowUp, ArrowDown } from 'lucide-react';

interface CreatorItem {
  id: string;
  name: string;
  handle: string;
  slug: string;
  avatar_url?: string;
  yt_channel_id: string;
  video_count: number;
  total_views: number;
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

export default function CreatorDirectoryPage() {
  const [creators, setCreators] = useState<CreatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'views' | 'reactions' | 'name'>('views');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 18;

  useEffect(() => {
    async function loadCreators() {
      setLoading(true);
      try {
        const supabase = createClient();

        let allChannels: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('channels')
            .select(`
              id,
              name,
              handle,
              slug,
              avatar_url,
              yt_channel_id,
              videos (id, view_count)
            `)
            .range(page * 1000, (page + 1) * 1000 - 1);

          if (error || !data || data.length === 0) {
            hasMore = false;
          } else {
            allChannels = allChannels.concat(data);
            if (data.length < 1000) hasMore = false;
            page++;
          }
        }

        const formatted: CreatorItem[] = allChannels.map((c: any) => {
          const vids = c.videos || [];
          const totalViews = vids.reduce((sum: number, v: any) => sum + (v.view_count || 0), 0);

          return {
            id: c.id,
            name: c.name,
            handle: c.handle || '@' + generateCleanSlug(c.name),
            slug: c.slug || generateCleanSlug(c.name),
            avatar_url: c.avatar_url,
            yt_channel_id: c.yt_channel_id,
            video_count: vids.length,
            total_views: totalViews,
          };
        });

        setCreators(formatted);
      } catch (err) {
        console.error('Error loading creator directory:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCreators();
  }, []);

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const filteredCreators = creators.filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q);
  });

  const sortedCreators = [...filteredCreators].sort((a, b) => {
    let res = 0;
    if (sortBy === 'reactions') res = b.video_count - a.video_count;
    else if (sortBy === 'name') res = a.name.localeCompare(b.name);
    else res = b.total_views - a.total_views;

    return sortDirection === 'desc' ? res : -res;
  });

  const totalPages = Math.ceil(sortedCreators.length / itemsPerPage) || 1;
  const paginatedCreators = sortedCreators.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 flex flex-col items-center justify-center text-zinc-400">
        <RefreshCw className="w-10 h-10 animate-spin text-red-600 mb-4" />
        <p className="text-sm font-medium">Loading Creator Directory...</p>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-20 min-h-screen bg-[#09090b]">
      <div className="px-6 md:px-12 max-w-7xl mx-auto my-6">
        <div className="border-b border-zinc-800 pb-6 mb-6">
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            <Users className="w-8 h-8 text-red-600" />
            Creator Directory ({filteredCreators.length})
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-1 font-medium">
            Explore indexed movie reaction channels, video archives, and channel analytics.
          </p>
        </div>

        {/* Filter and Sort Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search creator name or @handle..."
              value={searchTerm}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-red-600"
            />
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
              <option value="reactions">Most Reactions</option>
              <option value="name">Channel Name (A-Z)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedCreators.map((creator) => (
            <Link
              key={creator.id}
              href={`/creators/${creator.slug}`}
              className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/60 rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] shadow-xl flex flex-col justify-between"
            >
              <div className="flex items-center gap-3.5 mb-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border border-red-600 flex-none">
                  {creator.avatar_url ? (
                    <Image
                      src={creator.avatar_url}
                      alt={creator.name}
                      fill
                      unoptimized
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-red-600 text-white font-black text-base flex items-center justify-center">
                      {creator.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-sm text-white group-hover:text-red-400 transition-colors truncate">
                    {creator.name}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium truncate">
                    {creator.handle}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 pt-3 border-t border-zinc-800/80">
                <span className="flex items-center gap-1 text-zinc-300">
                  <Tv className="w-3.5 h-3.5 text-red-500" />
                  {creator.video_count} Reactions
                </span>

                <span className="flex items-center gap-1 text-amber-400">
                  <Eye className="w-3.5 h-3.5" />
                  {formatViews(creator.total_views)}
                </span>
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
      </div>
    </div>
  );
}