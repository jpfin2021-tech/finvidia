"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, AlertTriangle, RefreshCw, Search, ExternalLink, Tv, CheckCircle2 } from 'lucide-react';

interface AuditVideo {
  id: string;
  yt_video_id: string;
  title: string;
  published_at: string;
  view_count: number;
  channel_name: string;
  channel_handle: string;
  media_title?: string;
  media_year?: number;
  media_id?: string;
}

interface ChannelHealth {
  id: string;
  name: string;
  handle: string;
  video_count: number;
}

export default function AdminAuditPage() {
  const [videos, setVideos] = useState<AuditVideo[]>([]);
  const [channels, setChannels] = useState<ChannelHealth[]>([]);
  const [totalIndexed, setTotalIndexed] = useState<number>(0);
  const [totalMatched, setTotalMatched] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  const [syncing, setSyncing] = useState(false);
  const [syncCurrentChannel, setSyncCurrentChannel] = useState<string>('');
  const [syncProgress, setSyncProgress] = useState<number>(0);

  const [searchQuery, setSearchQuery] = useState('');

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

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
            published_at,
            view_count,
            media_id,
            channels (id, name, handle),
            media_items (id, title, release_year)
          `)
          .range(page * 1000, (page + 1) * 1000 - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allVids = allVids.concat(data);
          if (data.length < 1000) hasMore = false;
          page++;
        }
      }

      // Uncapped Channel Count Calculation from All Vids
      const channelCountMap = new Map<string, { id: string; name: string; handle: string; count: number }>();

      for (const v of allVids) {
        if (!v.channels) continue;
        const cid = v.channels.id;
        if (!channelCountMap.has(cid)) {
          channelCountMap.set(cid, {
            id: cid,
            name: v.channels.name,
            handle: v.channels.handle,
            count: 1,
          });
        } else {
          channelCountMap.get(cid)!.count += 1;
        }
      }

      const formattedChans: ChannelHealth[] = Array.from(channelCountMap.values()).map((c) => ({
        id: c.id,
        name: c.name,
        handle: c.handle,
        video_count: c.count,
      })).sort((a, b) => b.video_count - a.video_count);

      setChannels(formattedChans);

      const formattedVids: AuditVideo[] = allVids.map((v: any) => ({
        id: v.id,
        yt_video_id: v.yt_video_id,
        title: v.title,
        published_at: v.published_at,
        view_count: v.view_count || 0,
        channel_name: v.channels?.name || 'Unknown Creator',
        channel_handle: v.channels?.handle || '',
        media_title: v.media_items?.title,
        media_year: v.media_items?.release_year,
        media_id: v.media_items?.id,
      }));

      setVideos(formattedVids);
      setTotalIndexed(formattedVids.length);
      setTotalMatched(formattedVids.filter((v) => v.media_id).length);
    } catch (err) {
      console.error('Error loading admin audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  const triggerBatchSync = async () => {
    setSyncing(true);
    setSyncProgress(0);

    const totalChannels = 28;

    for (let i = 0; i < totalChannels; i++) {
      try {
        setSyncProgress(i + 1);
        const res = await fetch(`/api/sync?channel_index=${i}`);
        const data = await res.json();
        if (data.logs && data.logs.length > 0) {
          setSyncCurrentChannel(data.logs[data.logs.length - 1]);
        }
      } catch (err) {
        console.error(`Error syncing channel index ${i}:`, err);
      }
    }

    setSyncing(false);
    setSyncCurrentChannel('Full Batch Sync Complete!');
    await loadAuditData();
  };

  const filteredVideos = videos.filter((v) => {
    const term = searchQuery.toLowerCase();
    return (
      v.title.toLowerCase().includes(term) ||
      v.channel_name.toLowerCase().includes(term) ||
      (v.media_title && v.media_title.toLowerCase().includes(term))
    );
  });

  return (
    <div className="pt-24 pb-20 px-6 md:px-12 max-w-7xl mx-auto min-h-screen bg-[#09090b]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800 pb-8 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-red-600" />
            Backend IT Audit Dashboard
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Master Movie Relational Inspector & Ingestion Diagnostics.
          </p>
        </div>

        <button
          onClick={triggerBatchSync}
          disabled={syncing}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs px-6 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? `Syncing Creator ${syncProgress} of 28...` : 'Trigger Full Unlimited Backlog Sync'}
        </button>
      </div>

      {/* Batch Sync Progress Bar */}
      {syncing && (
        <div className="mb-8 bg-zinc-900 border border-red-600/40 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-xs font-bold text-white mb-2">
            <span>Syncing Channel {syncProgress} of 28</span>
            <span className="text-red-400 font-mono">{Math.round((syncProgress / 28) * 100)}%</span>
          </div>
          <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden mb-2">
            <div
              className="bg-red-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(syncProgress / 28) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-400 font-mono truncate">{syncCurrentChannel}</p>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs font-bold uppercase text-zinc-400">Total Indexed Videos</p>
          <p className="text-3xl font-black text-white mt-1">{totalIndexed.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs font-bold uppercase text-zinc-400">Matched to Master Movie</p>
          <p className="text-3xl font-black text-emerald-400 mt-1">{totalMatched.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs font-bold uppercase text-zinc-400">Unmatched / Rejected</p>
          <p className="text-3xl font-black text-amber-400 mt-1">{(totalIndexed - totalMatched).toLocaleString()}</p>
        </div>
      </div>

      {/* Creator Health Breakdown Table */}
      <div className="mb-12 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60 p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Tv className="w-5 h-5 text-red-500" /> Tracked Creator Channels ({channels.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2">
          {channels.map((chan) => (
            <Link
              key={chan.id}
              href={`/creators/${chan.id}`}
              className="bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-red-600/40 rounded-lg p-3 flex items-center justify-between transition-colors"
            >
              <div>
                <p className="text-xs font-bold text-white hover:text-red-400">{chan.name}</p>
                <p className="text-[10px] text-zinc-500">{chan.handle}</p>
              </div>
              <span className="bg-red-950 text-red-400 text-xs font-black px-2.5 py-1 rounded border border-red-900/40">
                {chan.video_count} Movies
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Video Audit Inspector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Audit by raw title, movie name, or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-red-600"
          />
        </div>

        <p className="text-xs text-zinc-400 font-semibold self-end sm:self-center">
          Showing <span className="text-white font-bold">{filteredVideos.length}</span> Ingested Videos
        </p>
      </div>

      {loading ? (
        <div className="py-24 text-center text-zinc-500 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
          <p className="text-sm font-medium">Auditing Full Database Matrix...</p>
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="p-4">Raw YouTube Title</th>
                  <th className="p-4">Creator</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Matched Film</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {filteredVideos.slice(0, 100).map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 font-bold text-white max-w-md truncate">{v.title}</td>
                    <td className="p-4 text-zinc-400">{v.channel_name}</td>
                    <td className="p-4">
                      {v.media_id ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Matched 1:1
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Unmatched
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-amber-400 font-bold">
                      {v.media_title ? `${v.media_title} (${v.media_year})` : '—'}
                    </td>
                    <td className="p-4 text-right">
                      {v.media_id && (
                        <Link
                          href={`/media/${v.media_id}`}
                          className="text-zinc-400 hover:text-white inline-flex items-center gap-1 text-xs font-bold"
                        >
                          <span>Hub</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}