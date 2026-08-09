"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import VideoModal from '@/components/video-modal';
import VideoCard from '@/components/video-card';
import { MediaItem, Video } from '@/types/database';
import { buildAmazonPrimeVideoLink, buildAmazonPhysicalBlurayLink, buildJustWatchLink } from '@/lib/affiliate';
import { ExternalLink, Building, User, ArrowLeft, Tv, RefreshCw, Eye, Tag, Star, Users, ShoppingBag, Film, Disc } from 'lucide-react';

export function formatViewCount(views?: number): string {
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

export default function MovieHubPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;
  const mediaIdentifier = Array.isArray(rawId) ? rawId[0] : rawId;

  const [media, setMedia] = useState<MediaItem | null>(null);
  const [reactions, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [reactionSort, setReactionSort] = useState<'views' | 'newest' | 'oldest'>('views');

  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [avgRating, setAvgRating] = useState<number>(0.0);
  const [totalRatings, setTotalRatings] = useState<number>(0);

  useEffect(() => {
    async function loadMediaHub() {
      if (!mediaIdentifier) return;
      setLoading(true);

      try {
        const supabase = createClient();
        const targetSlug = generateCleanSlug(mediaIdentifier);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mediaIdentifier);

        let mediaData: any = null;

        if (isUuid) {
          const { data } = await supabase
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
              slug,
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
            .eq('id', mediaIdentifier)
            .maybeSingle();
          mediaData = data;
        }

        if (!mediaData) {
          const { data: allMedia } = await supabase
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
              slug,
              media_directors (
                directors (id, name, slug)
              ),
              media_actors (
                actors (id, name, slug)
              ),
              media_genres (
                genres (id, name, slug)
              )
            `);

          if (allMedia) {
            mediaData = allMedia.find((m: any) => {
              const titleSlug = generateCleanSlug(m.title);
              const dbSlug = m.slug ? generateCleanSlug(m.slug) : '';
              return (
                m.id === mediaIdentifier ||
                dbSlug === targetSlug ||
                titleSlug === targetSlug
              );
            });
          }
        }

        if (!mediaData) {
          console.error('Error fetching movie page for:', mediaIdentifier);
          setLoading(false);
          return;
        }

        const formattedMedia: MediaItem = {
          id: mediaData.id,
          media_type: mediaData.media_type,
          title: mediaData.title,
          release_year: mediaData.release_year,
          studio_label: mediaData.studio_label,
          synopsis: mediaData.synopsis,
          poster_url: mediaData.poster_url,
          backdrop_url: mediaData.backdrop_url,
          directors: (mediaData as any).media_directors?.map((md: any) => md.directors).filter(Boolean) || [],
          actors: (mediaData as any).media_actors?.map((ma: any) => ma.actors).filter(Boolean) || [],
          genres: (mediaData as any).media_genres?.map((mg: any) => mg.genres).filter(Boolean) || [],
        };
        
        setMedia(formattedMedia);

        const { data: videoData } = await supabase
          .from('videos')
          .select(`
            id,
            yt_video_id,
            channel_id,
            title,
            description,
            thumbnail_url,
            published_at,
            view_count,
            ai_summary,
            ai_timestamps,
            individual_reactors,
            channels (
              id,
              handle,
              name,
              avatar_url,
              slug
            )
          `)
          .eq('media_id', mediaData.id)
          .eq('verification_status', 'verified');

        if (videoData) {
          const formattedVideos: Video[] = videoData.map((v: any) => {
            const chanName = v.channels?.name || 'Creator';
            return {
              id: v.id,
              yt_video_id: v.yt_video_id,
              channel_id: v.channel_id,
              title: v.title,
              description: v.description,
              thumbnail_url: v.thumbnail_url,
              published_at: v.published_at,
              view_count: v.view_count || 0,
              ai_summary: v.ai_summary,
              ai_timestamps: v.ai_timestamps || [],
              individual_reactors: v.individual_reactors || [],
              channel_name: chanName,
              channel_handle: v.channels?.handle,
              channel_avatar: v.channels?.avatar_url,
              channel_slug: v.channels?.slug || generateCleanSlug(chanName),
              media_item: {
                ...formattedMedia,
                slug: generateCleanSlug(formattedMedia.title)
              }
            } as any;
          });
          setVideos(formattedVideos);
        }
      } catch (err) {
        console.error('Error loading movie page:', err);
      } finally {
        setLoading(false);
      }
    }

    loadMediaHub();
  }, [mediaIdentifier]);

  const handleRateFilm = (stars: number) => {
    setUserRating(stars);
    const newTotal = totalRatings + 1;
    const newAvg = Number(((avgRating * totalRatings + stars) / newTotal).toFixed(1));
    setAvgRating(newAvg);
    setTotalRatings(newTotal);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 flex flex-col items-center justify-center text-zinc-400">
        <RefreshCw className="w-10 h-10 animate-spin text-red-600 mb-4" />
        <p className="text-sm font-medium">Loading Movie Details...</p>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 px-6 text-center text-zinc-400">
        <h2 className="text-xl font-bold text-white">Movie title not found</h2>
        <button
          onClick={() => router.push('/browse')}
          className="mt-4 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg"
        >
          Return to Movie Index
        </button>
      </div>
    );
  }

  const sortedReactions = [...reactions].sort((a, b) => {
    if (reactionSort === 'views') return (b.view_count || 0) - (a.view_count || 0);
    if (reactionSort === 'oldest') return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });

  const totalViewsCombined = reactions.reduce((sum, v) => sum + (v.view_count || 0), 0);
  const amazonPrimeUrl = buildAmazonPrimeVideoLink(media.title, media.release_year);
  const amazonPhysicalUrl = buildAmazonPhysicalBlurayLink(media.title);
  const justWatchUrl = buildJustWatchLink(media.title);

  return (
    <div className="pt-16 pb-20 min-h-screen bg-[#09090b]">
      {/* Back Navigation */}
      <div className="px-6 md:px-12 pt-6">
        <button
          onClick={() => router.back()}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Movie Index
        </button>
      </div>

      {/* Hero Header */}
      <div className="relative w-full min-h-[460px] bg-zinc-950 overflow-hidden my-4 border-b border-zinc-800 pb-8">
        <div className="absolute inset-0">
          <Image
            src={media.backdrop_url || media.poster_url || '/placeholder.png'}
            alt={media.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-30 filter blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
        </div>

        <div className="relative max-w-5xl z-20 pt-12 px-6 md:px-12 flex flex-col md:flex-row items-start md:items-end gap-6">
          <div className="relative w-36 md:w-52 aspect-[2/3] rounded-xl overflow-hidden border-2 border-zinc-700 shadow-2xl flex-none hidden sm:block">
            <Image
              src={media.poster_url || '/placeholder.png'}
              alt={media.title}
              fill
              sizes="(max-width: 768px) 144px, 208px"
              className="object-cover"
            />
          </div>

          <div className="flex flex-col gap-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-red-600 text-white text-xs font-black uppercase px-2.5 py-1 rounded tracking-wider">
                Official Film
              </span>
              {media.release_year > 0 && (
                <span className="bg-zinc-800/90 text-zinc-300 text-xs font-bold px-2.5 py-1 rounded border border-zinc-700">
                  {media.release_year}
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
              {media.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-zinc-300">
              {media.directors?.[0] && (
                <Link
                  href={`/browse?q=${encodeURIComponent(media.directors[0].name)}`}
                  className="flex items-center gap-1.5 font-medium hover:text-red-400 transition-colors group"
                >
                  <User className="w-4 h-4 text-red-500" />
                  Director: <strong className="text-white underline decoration-zinc-600 group-hover:decoration-red-500">{media.directors[0].name}</strong>
                </Link>
              )}
              {media.studio_label && (
                <Link
                  href={`/browse?q=${encodeURIComponent(media.studio_label)}`}
                  className="flex items-center gap-1.5 font-medium hover:text-red-400 transition-colors group"
                >
                  <Building className="w-4 h-4 text-red-500" />
                  Studio: <strong className="text-white underline decoration-zinc-600 group-hover:decoration-red-500">{media.studio_label}</strong>
                </Link>
              )}
            </div>

            {media.genres && media.genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <Tag className="w-3.5 h-3.5 text-zinc-500 mr-0.5" />
                {media.genres.map((g) => (
                  <Link
                    key={g.id}
                    href={`/browse?genre=${g.slug}`}
                    className="bg-zinc-800/80 hover:bg-amber-500 hover:text-black text-zinc-300 text-[11px] font-bold px-2.5 py-0.5 rounded border border-zinc-700/80 transition-all"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 rounded-lg px-3.5 py-2 w-fit mt-1">
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="font-black text-sm text-white">
                  {totalRatings > 0 ? avgRating : 'N/A'}
                </span>
                <span className="text-[11px] text-zinc-500">/ 5.0</span>
              </div>
              <div className="border-l border-zinc-700 h-4" />
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRateFilm(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-0.5 transition-transform hover:scale-125 cursor-pointer"
                    title={`Rate ${star} Stars`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        (hoverRating || userRating) >= star
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-zinc-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-400 font-semibold">
                {userRating > 0 ? 'Your Score Saved!' : totalRatings > 0 ? `(${totalRatings} votes)` : '(No votes yet)'}
              </span>
            </div>

            <p className="text-zinc-300 text-xs md:text-sm line-clamp-3 max-w-3xl leading-relaxed mt-1">
              {media.synopsis || "Explore creator reactions and commentary for this title."}
            </p>

            {/* KEY CAST PILLS -> DIRECT ROUTE TO /actors/[slug] */}
            {media.actors && media.actors.length > 0 && (
              <div className="pt-1">
                <p className="text-xs font-bold text-zinc-400 mb-1.5 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-red-500" /> Key Cast:
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {media.actors.map((actor) => {
                    const actorSlug = generateCleanSlug(actor.name);
                    return (
                      <Link
                        key={actor.id}
                        href={`/actors/${actorSlug}`}
                        className="bg-zinc-900/90 hover:bg-red-600 hover:text-white text-zinc-300 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-zinc-800 transition-all cursor-pointer"
                      >
                        {actor.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-zinc-800/80 mt-2">
              <p className="text-[11px] font-black uppercase text-zinc-400 tracking-wider mb-2 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-red-500" /> Watch Official Film (Stream / Rent / Buy):
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={amazonPrimeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Film className="w-3.5 h-3.5 fill-black" />
                  <span>Prime Video Digital</span>
                  <ExternalLink className="w-3 h-3 text-black/70" />
                </a>
                <a
                  href={amazonPhysicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg border border-zinc-700 transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Disc className="w-3.5 h-3.5 text-amber-400" />
                  <span>4K Disc / Blu-ray</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </a>
                <a
                  href={justWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-zinc-800 hover:bg-red-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg border border-zinc-700 transition-all flex items-center gap-1.5 shadow-md"
                >
                  <span>JustWatch Streaming Guide</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reactions Feed */}
      <div className="px-6 md:px-12 max-w-7xl mx-auto mt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Tv className="w-6 h-6 text-red-600" />
            <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Available Reactions ({reactions.length})
              {totalViewsCombined > 0 && (
                <span className="text-xs normal-case font-normal text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-red-500" />
                  {formatViewCount(totalViewsCombined)} Total
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>Sort Reactions:</span>
            <select
              value={reactionSort}
              onChange={(e: any) => setReactionSort(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-600 cursor-pointer"
            >
              <option value="views">Most Views (Highest Popularity)</option>
              <option value="newest">Upload Date (Newest First)</option>
              <option value="oldest">Upload Date (Oldest First)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedReactions.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onSelect={setSelectedVideo}
            />
          ))}
        </div>
      </div>

      <VideoModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}