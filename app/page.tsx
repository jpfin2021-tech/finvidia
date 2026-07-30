"use client";

import React, { useState, useEffect } from 'react';
import HeroBanner from '@/components/hero-banner';
import FranchiseSection from '@/components/franchise-section';
import CarouselRow from '@/components/carousel-row';
import { createClient } from '@/lib/supabase/client';
import { MediaItem } from '@/types/database';

type ExtendedMediaItem = MediaItem & {
  video_count: number;
  total_views: number;
};

export default function HomePage() {
  const [topRankedMovies, setTopRankedMovies] = useState<ExtendedMediaItem[]>([]);
  const [newReactions, setNewReactions] = useState<ExtendedMediaItem[]>([]);
  const [randomDiscovery, setRandomDiscovery] = useState<ExtendedMediaItem[]>([]);

  const loadHomepageData = async () => {
    try {
      const supabase = createClient();

      // 1. Fetch media items flat
      let allMedia: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('media_items')
          .select('id, media_type, title, release_year, studio_label, synopsis, poster_url, backdrop_url')
          .eq('media_type', 'movie')
          .range(page * 1000, (page + 1) * 1000 - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allMedia = allMedia.concat(data);
          if (data.length < 1000) hasMore = false;
          page++;
        }
      }

      // 2. Fetch video counts and view sums flat
      let allVideos: any[] = [];
      let vidPage = 0;
      let vidHasMore = true;

      while (vidHasMore) {
        const { data, error } = await supabase
          .from('videos')
          .select('id, media_id, view_count, published_at')
          .range(vidPage * 1000, (vidPage + 1) * 1000 - 1);

        if (error || !data || data.length === 0) {
          vidHasMore = false;
        } else {
          allVideos = allVideos.concat(data);
          if (data.length < 1000) vidHasMore = false;
          vidPage++;
        }
      }

      const videoStatsMap = new Map<string, { views: number; count: number }>();
      for (const v of allVideos) {
        if (!v.media_id) continue;
        const views = v.view_count || 0;
        if (!videoStatsMap.has(v.media_id)) {
          videoStatsMap.set(v.media_id, { views, count: 1 });
        } else {
          const stat = videoStatsMap.get(v.media_id)!;
          stat.views += views;
          stat.count += 1;
        }
      }

      const formatted: ExtendedMediaItem[] = allMedia
        .map((m: any) => {
          const stats = videoStatsMap.get(m.id) || { views: 0, count: 0 };
          return {
            id: m.id,
            media_type: m.media_type,
            title: m.title,
            release_year: m.release_year,
            studio_label: m.studio_label,
            synopsis: m.synopsis,
            poster_url: m.poster_url,
            backdrop_url: m.backdrop_url,
            video_count: stats.count,
            total_views: stats.views,
          };
        })
        .filter((m) => m.video_count > 0);

      // Top Ranked Movies
      const sortedByViews = [...formatted].sort((a, b) => b.total_views - a.total_views);
      setTopRankedMovies(sortedByViews.slice(0, 18));

      // Recent Cinema Releases
      const sortedByNew = [...formatted].sort((a, b) => b.release_year - a.release_year);
      setNewReactions(sortedByNew.slice(0, 18));

      // Random Discovery
      const shuffled = [...formatted].sort(() => 0.5 - Math.random());
      setRandomDiscovery(shuffled.slice(0, 18));
    } catch (err) {
      console.error('Error loading homepage catalog:', err);
    }
  };

  useEffect(() => {
    loadHomepageData();
  }, []);

  const handleShuffleDiscovery = () => {
    setRandomDiscovery((prev) => [...prev].sort(() => 0.5 - Math.random()));
  };

  return (
    <div className="pb-20 min-h-screen bg-[#09090b]">
      {/* Dynamic Rotating Spotlight Hero */}
      <HeroBanner />

      <div className="flex flex-col gap-8 mt-6">
        {/* Hollywood Franchises Showcase */}
        <FranchiseSection />

        {/* Leaderboard Top Ranked Films */}
        <CarouselRow
          title="Master Leaderboard Top Ranked Films"
          mediaList={topRankedMovies}
          viewAllLink="/rankings"
        />

        {/* Recently Added Cinema Reactions */}
        <CarouselRow
          title="Recent Cinema Releases & Classics"
          mediaList={newReactions}
          viewAllLink="/browse?sort=oc_year"
        />

        {/* Random Discovery */}
        <CarouselRow
          title="Random Discovery (Explore Something New)"
          mediaList={randomDiscovery}
          onShuffle={handleShuffleDiscovery}
          viewAllLink="/browse"
        />
      </div>
    </div>
  );
}