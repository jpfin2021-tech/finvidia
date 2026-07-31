"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import VideoCard from '@/components/video-card';
import VideoModal from '@/components/video-modal';
import { Video } from '@/types/database';
import { ExternalLink, ArrowLeft, Tv, RefreshCw, Eye, Sparkles, CheckCircle2, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface CreatorDetails {
  id: string;
  name: string;
  handle: string;
  slug?: string;
  avatar_url?: string;
  yt_channel_id: string;
}

function formatViewCount(views?: number): string {
  if (!views || views === 0) return '0 Views';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M Views`;
  if (views >= 1000) return `${Math.round(views / 1000)}K Views`;
  return `${views.toLocaleString()} Views`;
}

function generateCleanSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CreatorHubPage() {
  const params = useParams();
  const router = useRouter();
  const rawIdentifier = params?.id as string;
  const creatorIdentifier = Array.isArray(rawIdentifier) ? rawIdentifier[0] : rawIdentifier;

  const [creator, setCreator] = useState<CreatorDetails | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [reactionSort, setReactionSort] = useState<'views' | 'newest' | 'oldest'>('views');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState('1');
  const itemsPerPage = 12;

  useEffect(() => {
    async function loadCreatorHub() {
      if (!creatorIdentifier) return;
      setLoading(true);
      try {
        const supabase = createClient();

        const formattedSearchParam = creatorIdentifier.toLowerCase().trim();
        const { data: chanData } = await supabase
          .from('channels')
          .select('id, name, handle, slug, avatar_url, yt_channel_id')
          .or(`id.eq.${creatorIdentifier},handle.ilike.%${formattedSearchParam}%`)
          .maybeSingle();

        let activeChan = chanData;

        if (!activeChan) {
          const { data: allChans } = await supabase.from('channels').select('*');
          if (allChans) {
            activeChan = allChans.find((c: any) => {
              const cleanSlug = generateCleanSlug(c.name);
              return (
                cleanSlug === formattedSearchParam ||
                c.name.toLowerCase().replace(/[^a-z0-9]+/g, '') === formattedSearchParam.replace(/[^a-z0-9]+/g, '') ||
                c.handle.toLowerCase().replace('@', '') === formattedSearchParam.replace('@', '')
              );
            });
          }
        }

        if (!activeChan) {
          console.error('Creator profile not found for:', creatorIdentifier);
          setLoading(false);
          return;
        }

        setCreator(activeChan);

        let allVids: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('videos')
            .select(`
              id,
              yt_video_id,
              title,
              description,
              thumbnail_url,
              published_at,
              view_count,
              media_items (id, title, release_year, poster_url)
            `)
            .eq('channel_id', activeChan.id)
            .range(page * 1000, (page + 1) * 1000 - 1);

          if (error || !data || data.length === 0) {
            hasMore = false;
          } else {
            allVids = allVids.concat(data);
            if (data.length < 1000) hasMore = false;
            page++;
          }
        }

        const formattedVideos: Video[] = allVids.map((v: any) => ({
          id: v.id,
          yt_video_id: v.yt_video_id,
          channel_id: activeChan.id,
          title: v.title,
          description: v.description,
          thumbnail_url: v.thumbnail_url,
          published_at: v.published_at,
          view_count: v.view_count || 0,
          channel_name: activeChan.name,
          channel_handle: activeChan.handle,
          channel_avatar: activeChan.avatar_url,
          channel_slug: activeChan.slug || generateCleanSlug(activeChan.name),
          media_item: v.media_items ? {
            id: v.media_items.id,
            media_type: 'movie',
            title: v.media_items.title,
            release_year: v.media_items.release_year,
            poster_url: v.media_items.poster_url,
            backdrop_url: '',
          } : undefined
        }));

        setVideos(formattedVideos);
      } catch (err) {
        console.error('Error loading creator hub:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCreatorHub();
  }, [creatorIdentifier]);

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    setVideos((prev) => [...prev].reverse());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 flex flex-col items-center justify-center text-zinc-400">
        <RefreshCw className="w-10 h-10 animate-spin text-red-600 mb-4" />
        <p className="text-sm font-medium">Loading Creator Profile...</p>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 px-6 text-center text-zinc-400">
        <h2 className="text-xl font-bold text-white">Creator channel not found</h2>
        <button
          onClick={() => router.push('/creators')}
          className="mt-4 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg"
        >
          Return to Creator Directory
        </button>
      </div>
    );
  }

  const sortedReactions = [...videos].sort((a, b) => {
    let res = 0;
    if (reactionSort === 'views') res = (b.view_count || 0) - (a.view_count || 0);
    else if (reactionSort === 'oldest') res = new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
    else res = new Date(b.published_at).getTime() - new Date(a.published_at).getTime();

    return sortDirection === 'desc' ? res : -res;
  });

  const totalPages = Math.ceil(sortedReactions.length / itemsPerPage) || 1;
  const paginatedReactions = sortedReactions.slice(
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

  const totalViewsCombined = videos.reduce((sum, v) => sum + (v.view_count || 0), 0);
  const avgViewsPerVideo = videos.length > 0 ? Math.round(totalViewsCombined / videos.length) : 0;

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
      <div className="px-6 md:px-12 pt-6">
        <button
          onClick={() => router.back()}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Creator Directory
        </button>
      </div>

      <div className="px-6 md:px-12 max-w-7xl mx-auto my-6">
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-full overflow-hidden bg-zinc-800 border-2 border-red-600 shadow-2xl flex-none">
              {creator.avatar_url ? (
                <Image
                  src={creator.avatar_url}
                  alt={creator.name}
                  fill
                  priority
                  unoptimized
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-red-600 text-white font-black text-2xl flex items-center justify-center">
                  {creator.name.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
                  {creator.name}
                </h1>
                <CheckCircle2 className="w-6 h-6 text-red-500 fill-red-500/20 flex-none" />
                <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
              </div>
              <p className="text-sm text-zinc-400 font-medium mt-0.5">{creator.handle}</p>
              <a
                href={`https://www.youtube.com/channel/${creator.yt_channel_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-bold mt-2"
              >
                <span>Official YouTube Channel</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-black/60 border border-zinc-800 rounded-xl p-4">
            <div className="pr-4 border-r border-zinc-800">
              <p className="text-[10px] font-bold uppercase text-zinc-400">Indexed Movies</p>
              <p className="text-xl font-black text-white flex items-center gap-1.5 mt-0.5">
                <Tv className="w-4 h-4 text-red-500" />
                {videos.length}
              </p>
            </div>
            <div className="pr-4 border-r border-zinc-800">
              <p className="text-[10px] font-bold uppercase text-zinc-400">Total Views</p>
              <p className="text-xl font-black text-amber-400 flex items-center gap-1.5 mt-0.5">
                <Eye className="w-4 h-4 text-amber-400" />
                {formatViewCount(totalViewsCombined)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-zinc-400">Avg / Reaction</p>
              <p className="text-xl font-black text-zinc-200 mt-0.5">
                {formatViewCount(avgViewsPerVideo)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 max-w-7xl mx-auto mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 mb-4 gap-4">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            Movie Reactions ({videos.length})
          </h2>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <button
              onClick={toggleSortDirection}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-600 text-red-500 transition-all cursor-pointer"
              title={`Toggle Sort Direction (${sortDirection === 'desc' ? 'Descending' : 'Ascending'})`}
            >
              {sortDirection === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
            </button>

            <span>Sort Reactions:</span>
            <select
              value={reactionSort}
              onChange={(e: any) => { setReactionSort(e.target.value); setCurrentPage(1); setJumpPageInput('1'); }}
              className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-600 cursor-pointer"
            >
              <option value="views">Most Views (Highest Popularity)</option>
              <option value="newest">Upload Date (Newest First)</option>
              <option value="oldest">Upload Date (Oldest First)</option>
            </select>
          </div>
        </div>

        {/* Top Pagination Control */}
        {renderPaginationControl()}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedReactions.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onSelect={setSelectedVideo}
            />
          ))}
        </div>

        {/* Bottom Pagination Control */}
        {renderPaginationControl()}
      </div>

      <VideoModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}