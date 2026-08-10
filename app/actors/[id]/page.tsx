"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import VideoCard from '@/components/video-card';
import VideoModal from '@/components/video-modal';
import { Video } from '@/types/database';
import { User, Film, ArrowLeft, Tv, RefreshCw, Eye, Sparkles, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, List, Filter } from 'lucide-react';

interface ActorDetails {
  id: string;
  name: string;
  slug?: string;
  profile_img_url?: string;
}

function formatViewsShort(views?: number): string {
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

export default function ActorLandingPage() {
  const params = useParams();
  const router = useRouter();
  const rawIdentifier = params?.id as string;
  const actorIdentifier = Array.isArray(rawIdentifier) ? rawIdentifier[0] : rawIdentifier;

  const [actor, setActor] = useState<ActorDetails | null>(null);
  const [reactedMovies, setReactedMovies] = useState<any[]>([]);
  const [reactions, setReactions] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [imgError, setImgError] = useState(false);

  // Sorting & Pagination States
  const [filmSortBy, setFilmSortBy] = useState<'views' | 'year' | 'reactions' | 'title'>('views');
  const [filmSortDir, setFilmSortDir] = useState<'desc' | 'asc'>('desc');
  const [reactionSort, setReactionSort] = useState<'views' | 'newest' | 'oldest'>('views');
  const [reactionSortDir, setReactionSortDir] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState('1');
  const itemsPerPage = 12;

  useEffect(() => {
    async function loadActorDataFromDB() {
      if (!actorIdentifier) return;
      setLoading(true);
      setImgError(false);

      try {
        const supabase = createClient();
        const formattedParam = actorIdentifier.toLowerCase().trim();
        const rawName = formattedParam.replace(/-/g, ' ');

        // 1. Resolve Actor
        const { data: actorData } = await supabase
          .from('actors')
          .select('id, name, slug, profile_img_url')
          .or(`slug.ilike.${formattedParam},name.ilike.${rawName}`)
          .limit(1)
          .maybeSingle();

        if (!actorData) {
          setLoading(false);
          return;
        }

        setActor(actorData);

        // 2. Fetch reacted movies linked to actor from clean media_items
        const { data: mediaLinks } = await supabase
          .from('media_actors')
          .select(`
            media_items (
              id,
              title,
              slug,
              release_year,
              poster_url,
              backdrop_url,
              studio_label,
              videos (id, view_count, verification_status)
            )
          `)
          .eq('actor_id', actorData.id);

        let activeReactedMovies: any[] = [];
        if (mediaLinks && mediaLinks.length > 0) {
          activeReactedMovies = mediaLinks
            .map((item: any) => item.media_items)
            .filter(Boolean)
            .map((m: any) => {
              const verifiedVids = (m.videos || []).filter(
                (v: any) => v.verification_status === 'verified' || !v.verification_status
              );
              const totalViews = verifiedVids.reduce((sum: number, v: any) => sum + (v.view_count || 0), 0);
              return {
                ...m,
                reaction_count: verifiedVids.length,
                total_views: totalViews,
              };
            });
        }

        setReactedMovies(activeReactedMovies);

        if (activeReactedMovies.length === 0) {
          setLoading(false);
          return;
        }

        // 3. Fetch verified reaction videos
        const movieIds = activeReactedMovies.map((m) => m.id);
        const movieMap = new Map(activeReactedMovies.map((m) => [m.id, m]));

        let actorVids: any[] = [];
        let vidPage = 0;
        let vidHasMore = true;

        while (vidHasMore) {
          const { data: videoData, error } = await supabase
            .from('videos')
            .select(`
              id,
              yt_video_id,
              media_id,
              title,
              description,
              thumbnail_url,
              published_at,
              view_count,
              verification_status,
              channels (id, name, handle, avatar_url, slug)
            `)
            .in('media_id', movieIds)
            .eq('verification_status', 'verified')
            .range(vidPage * 1000, (vidPage + 1) * 1000 - 1);

          if (error || !videoData || videoData.length === 0) {
            vidHasMore = false;
          } else {
            actorVids = actorVids.concat(videoData);
            if (videoData.length < 1000) vidHasMore = false;
            vidPage++;
          }
        }

        const formattedReactions: Video[] = actorVids.map((v: any) => {
          const chan = v.channels || {};
          const chanName = chan.name || 'Creator';
          const parentMedia = movieMap.get(v.media_id);

          return {
            id: v.id,
            yt_video_id: v.yt_video_id,
            channel_id: chan.id || '',
            title: v.title,
            description: v.description,
            thumbnail_url: v.thumbnail_url,
            published_at: v.published_at,
            view_count: v.view_count || 0,
            channel_name: chanName,
            channel_handle: chan.handle || '',
            channel_avatar: chan.avatar_url || '',
            channel_slug: chan.slug || generateCleanSlug(chanName),
            media_item: parentMedia
              ? {
                  id: parentMedia.id,
                  media_type: 'movie',
                  title: parentMedia.title,
                  release_year: parentMedia.release_year,
                  poster_url: parentMedia.poster_url,
                  backdrop_url: parentMedia.backdrop_url,
                  studio_label: parentMedia.studio_label,
                  slug: parentMedia.slug || generateCleanSlug(parentMedia.title),
                }
              : undefined,
          };
        });

        setReactions(formattedReactions);
      } catch (err) {
        console.error('Error loading actor landing page:', err);
      } finally {
        setLoading(false);
      }
    }

    loadActorDataFromDB();
  }, [actorIdentifier]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 flex flex-col items-center justify-center text-zinc-400">
        <RefreshCw className="w-10 h-10 animate-spin text-red-600 mb-4" />
        <p className="text-sm font-medium">Loading Actor Profile...</p>
      </div>
    );
  }

  if (!actor) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 px-6 text-center text-zinc-400">
        <h2 className="text-xl font-bold text-white">Actor profile not found</h2>
        <button
          onClick={() => router.push('/movies')}
          className="mt-4 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
        >
          Return to Movie Index
        </button>
      </div>
    );
  }

  const sortedReactedMovies = [...reactedMovies].sort((a, b) => {
    let res = 0;
    if (filmSortBy === 'views') res = (b.total_views || 0) - (a.total_views || 0);
    else if (filmSortBy === 'reactions') res = (b.reaction_count || 0) - (a.reaction_count || 0);
    else if (filmSortBy === 'year') res = (b.release_year || 0) - (a.release_year || 0);
    else if (filmSortBy === 'title') res = a.title.localeCompare(b.title);

    return filmSortDir === 'desc' ? res : -res;
  });

  const sortedReactions = [...reactions].sort((a, b) => {
    let res = 0;
    if (reactionSort === 'views') res = (b.view_count || 0) - (a.view_count || 0);
    else if (reactionSort === 'oldest') res = new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
    else res = new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    return reactionSortDir === 'desc' ? res : -res;
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

  const totalViewsCombined = reactions.reduce((sum, v) => sum + (v.view_count || 0), 0);
  const avgViewsPerReaction = reactions.length > 0 ? Math.round(totalViewsCombined / reactions.length) : 0;
  const actorSlug = actor.slug || generateCleanSlug(actor.name);

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
      {/* Back Navigation */}
      <div className="px-6 md:px-12 pt-6 max-w-7xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Movie Index
        </button>
      </div>

      {/* Hero Banner */}
      <div className="px-6 md:px-12 max-w-7xl mx-auto my-6">
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-zinc-900 border-2 border-red-600 shadow-2xl flex-none flex items-center justify-center">
              {!imgError && actor.profile_img_url ? (
                <Image
                  src={actor.profile_img_url}
                  alt=""
                  fill
                  priority
                  unoptimized
                  onError={() => setImgError(true)}
                  className="object-cover"
                />
              ) : (
                <User className="w-9 h-9 text-red-500" />
              )}
            </div>
            <div>
              <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider flex items-center gap-1 w-fit mb-2">
                <Sparkles className="w-3 h-3 fill-current text-white" />
                Featured Cast Profile
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
                {actor.name}
              </h1>
              <p className="text-xs md:text-sm text-zinc-400 font-medium mt-1">
                Indexed reaction portfolio and verified reacted filmography.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-black/60 border border-zinc-800 rounded-xl p-4 flex-none">
            <div className="pr-4 border-r border-zinc-800">
              <p className="text-[10px] font-bold uppercase text-zinc-400">Reacted Films</p>
              <p className="text-xl font-black text-white flex items-center gap-1.5 mt-0.5">
                <Film className="w-4 h-4 text-red-500" />
                {reactedMovies.length}
              </p>
            </div>
            <div className="pr-4 border-r border-zinc-800">
              <p className="text-[10px] font-bold uppercase text-zinc-400">Total Views</p>
              <p className="text-xl font-black text-amber-400 flex items-center gap-1.5 mt-0.5">
                <Eye className="w-4 h-4 text-amber-400" />
                {formatViewsShort(totalViewsCombined)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-zinc-400">Avg / Reaction</p>
              <p className="text-xl font-black text-zinc-200 mt-0.5">
                {formatViewsShort(avgViewsPerReaction)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reacted Filmography Header & Filmography Sub-Page Link */}
      <div className="px-6 md:px-12 max-w-7xl mx-auto mt-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Film className="w-5 h-5 text-red-500" /> Reacted Films ({reactedMovies.length})
            </h2>

            <Link
              href={`/actors/${actorSlug}/filmography`}
              className="bg-zinc-800 hover:bg-red-600 border border-zinc-700 hover:border-red-500 text-zinc-200 hover:text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <List className="w-3.5 h-3.5" />
              <span>Full Career Filmography →</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <button
              onClick={() => setFilmSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-600 text-red-500 transition-all cursor-pointer"
              title={`Sort Order: ${filmSortDir === 'desc' ? 'Descending' : 'Ascending'}`}
            >
              {filmSortDir === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
            </button>
            <Filter className="w-4 h-4 text-red-500" />
            <span>Sort Films:</span>
            <select
              value={filmSortBy}
              onChange={(e: any) => setFilmSortBy(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-600 cursor-pointer"
            >
              <option value="views">Total Reaction Views</option>
              <option value="reactions">Most Creator Reactions</option>
              <option value="year">Release Year</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Poster Cards Grid */}
      <div className="px-6 md:px-12 max-w-7xl mx-auto mb-12">
        {sortedReactedMovies.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 bg-zinc-950/60 border border-zinc-800 rounded-2xl p-6">
            <p className="text-sm font-bold text-white">No reacted films found for {actor.name} yet.</p>
            <Link
              href={`/actors/${actorSlug}/filmography`}
              className="mt-3 inline-block text-xs text-red-500 font-bold hover:underline"
            >
              View Full Career Filmography List
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {sortedReactedMovies.map((m) => {
              const filmSlug = m.slug || generateCleanSlug(m.title);

              return (
                <Link
                  key={m.id}
                  href={`/movies/${filmSlug}`}
                  className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/60 rounded-xl overflow-hidden p-2.5 transition-all duration-300 hover:scale-105 shadow-md flex flex-col justify-between"
                >
                  <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-zinc-950 mb-2">
                    <Image
                      src={m.poster_url || '/placeholder.png'}
                      alt={m.title}
                      fill
                      sizes="180px"
                      className="object-cover"
                    />
                    {m.release_year > 0 && (
                      <span className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-[10px] font-black text-white px-2 py-0.5 rounded border border-white/10">
                        {m.release_year}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white group-hover:text-red-400 transition-colors line-clamp-1 mt-1">
                      {m.title}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 pt-1.5 mt-1 border-t border-zinc-800/80">
                      <span className="flex items-center gap-1 text-amber-400">
                        <Eye className="w-3 h-3" />
                        {formatViewsShort(m.total_views)}
                      </span>
                      <span className="flex items-center gap-1 text-zinc-300">
                        <Tv className="w-3 h-3 text-red-500" />
                        {m.reaction_count}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Creator Reactions Feed */}
      <div className="px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Tv className="w-6 h-6 text-red-600" />
            <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Actor Creator Reactions ({reactions.length})
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <button
              onClick={() => setReactionSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-600 text-red-500 transition-all cursor-pointer"
              title={`Toggle Sort Direction (${reactionSortDir === 'desc' ? 'Descending' : 'Ascending'})`}
            >
              {reactionSortDir === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
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

        {renderPaginationControl()}
      </div>

      <VideoModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}