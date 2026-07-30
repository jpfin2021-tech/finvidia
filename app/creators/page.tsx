"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Users, Eye, Tv, Search, ArrowUpDown, RefreshCw, CheckCircle2 } from 'lucide-react';

interface CreatorItem {
  id: string;
  name: string;
  handle: string;
  slug: string;
  avatar_url?: string;
  total_views: number;
  video_count: number;
  avg_views_per_video: number;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${Math.round(views / 1000)}K`;
  return views.toLocaleString();
}

export default function CreatorDirectoryPage() {
  const [creators, setCreators] = useState<CreatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'views' | 'reactions' | 'avg_views' | 'alpha'>('views');

  useEffect(() => {
    async function fetchCreatorDirectory() {
      setLoading(true);
      try {
        const supabase = createClient();

        // High-speed single SELECT query reading cached metrics
        const { data: channelsData, error } = await supabase
          .from('channels')
          .select('id, name, handle, avatar_url, slug, total_views, video_count, avg_views_per_video');

        if (!error && channelsData) {
          const formatted: CreatorItem[] = channelsData.map((c: any) => ({
            id: c.id,
            name: c.name,
            handle: c.handle,
            slug: c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            avatar_url: c.avatar_url,
            total_views: c.total_views || 0,
            video_count: c.video_count || 0,
            avg_views_per_video: c.avg_views_per_video || 0,
          }));
          setCreators(formatted);
        }
      } catch (err) {
        console.error('Error loading creator directory:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCreatorDirectory();
  }, []);

  const sortedCreators = [...creators].sort((a, b) => {
    if (sortBy === 'views') return b.total_views - a.total_views;
    if (sortBy === 'reactions') return b.video_count - a.video_count;
    if (sortBy === 'avg_views') return b.avg_views_per_video - a.avg_views_per_video;
    return a.name.localeCompare(b.name);
  });

  const filteredCreators = sortedCreators.filter((c) => {
    const term = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.handle.toLowerCase().includes(term);
  });

  const totalPlatformViews = creators.reduce((sum, c) => sum + c.total_views, 0);

  return (
    <div className="pt-24 pb-20 px-6 md:px-12 max-w-7xl mx-auto min-h-screen bg-[#09090b]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800 pb-8 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider flex items-center gap-3 text-white">
            <Users className="w-8 h-8 text-red-600" />
            Tracked Creator Network ({creators.length})
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Browse verified reaction channels, viewership density, and total indexed film reviews.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3">
          <Eye className="w-6 h-6 text-amber-400" />
          <div>
            <p className="text-[11px] font-bold uppercase text-zinc-400">Total Creator Viewership</p>
            <p className="text-2xl font-black text-white">{formatViews(totalPlatformViews)} Views</p>
          </div>
        </div>
      </div>

      {/* Filter & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search creators by channel name or handle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-red-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 self-end sm:self-center">
          <ArrowUpDown className="w-3.5 h-3.5 text-red-500" />
          <span className="font-semibold">Sort Creators:</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-600 cursor-pointer font-medium"
          >
            <option value="views">Total Reaction Views</option>
            <option value="reactions">Total Reactions Indexed</option>
            <option value="avg_views">Avg Views per Reaction</option>
            <option value="alpha">Alphabetical by Channel (A–Z)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-zinc-500 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
          <p className="text-sm font-medium">Loading Tracked Creator Network...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredCreators.map((creator) => (
            <Link
              key={creator.id}
              href={`/creators/${creator.slug}`}
              className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/60 rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border-2 border-red-600/60 shadow-md flex-none">
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
                      <div className="w-full h-full bg-red-600 text-white font-black text-lg flex items-center justify-center">
                        {creator.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <span className="bg-red-950/80 text-red-400 text-[11px] font-extrabold px-2.5 py-1 rounded border border-red-900/40 flex items-center gap-1">
                    <Tv className="w-3 h-3" />
                    {creator.video_count} Movies
                  </span>
                </div>

                <h3 className="font-extrabold text-lg text-white group-hover:text-red-400 transition-colors line-clamp-1 flex items-center gap-1.5">
                  {creator.name}
                  <CheckCircle2 className="w-4 h-4 text-red-500 fill-red-500/20 flex-none" />
                </h3>
                <p className="text-xs text-zinc-500 font-medium mb-4">{creator.handle}</p>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                <div>
                  <p className="text-[10px] uppercase font-bold text-zinc-500">Total Views</p>
                  <p className="text-base font-black text-amber-400 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    {formatViews(creator.total_views)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-zinc-500">Avg / Reaction</p>
                  <p className="text-xs font-bold text-zinc-300">
                    {formatViews(creator.avg_views_per_video)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}