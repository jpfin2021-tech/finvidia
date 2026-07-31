"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { LoungeClient, FirstScreenPlaybackState, LoungeDevice } from '@/lib/lounge-client';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, ChevronUp, ChevronDown, Tv, Sparkles, Radio, CheckCircle2 } from 'lucide-react';

interface RemotePopoutProps {
  loungeClient: LoungeClient;
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function RemotePopout({ loungeClient }: RemotePopoutProps) {
  const [playbackState, setPlaybackState] = useState<FirstScreenPlaybackState>(
    loungeClient.getPlaybackState()
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [device, setDevice] = useState<LoungeDevice | null>(null);

  useEffect(() => {
    // Subscribe to timecode telemetry from the TV
    const unsubscribe = loungeClient.subscribe((newState) => {
      setPlaybackState(newState);
    });
    return () => unsubscribe();
  }, [loungeClient]);

  const isPlaying = playbackState.playerState === 'PLAYING';

  const handleTogglePlayPause = () => {
    if (isPlaying) {
      loungeClient.dispatchCommand({ type: 'PAUSE' });
    } else {
      loungeClient.dispatchCommand({ type: 'PLAY' });
    }
  };

  const handleSeek = (secondsDelta: number) => {
    const target = Math.max(0, playbackState.currentTimeSeconds + secondsDelta);
    loungeClient.dispatchCommand({ type: 'SEEK', seconds: target });
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetSeconds = parseFloat(e.target.value);
    loungeClient.dispatchCommand({ type: 'SEEK', seconds: targetSeconds });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pointer-events-none">
      <div className="max-w-xl mx-auto pointer-events-auto">
        {/* EXPANDED FULL-SHEET REMOTE CONTROL */}
        {isExpanded && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-t-2xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 mb-2">
            {/* Sheet Handle Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  First-Screen Remote Control
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Target Output Device Status */}
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-3 mb-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Tv className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-zinc-500">Connected First Screen</p>
                  <p className="font-extrabold text-white">NVIDIA Shield Pro (Living Room)</p>
                </div>
              </div>
              <span className="bg-emerald-950 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-800/50 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Sync
              </span>
            </div>

            {/* Media Info & Timecode Progress */}
            <div className="mb-5 text-center">
              <h3 className="font-extrabold text-base text-white line-clamp-1 mb-1">
                Dune: Part Two (2024)
              </h3>
              <p className="text-xs text-zinc-400 font-medium mb-3 flex items-center justify-center gap-1">
                <span>Active Reactor:</span>
                <strong className="text-red-400">Popcorn In Bed</strong>
                <CheckCircle2 className="w-3.5 h-3.5 text-red-500 fill-red-500/20" />
              </p>

              {/* Timecode Scrub Bar */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={playbackState.durationSeconds || 100}
                  value={playbackState.currentTimeSeconds}
                  onChange={handleScrub}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <div className="flex justify-between text-[11px] font-mono text-zinc-500 font-bold px-0.5">
                  <span>{formatSeconds(playbackState.currentTimeSeconds)}</span>
                  <span>{formatSeconds(playbackState.durationSeconds)}</span>
                </div>
              </div>
            </div>

            {/* Bi-Directional Transport Control Buttons */}
            <div className="flex items-center justify-center gap-6 my-2">
              <button
                onClick={() => handleSeek(-10)}
                className="p-3 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 active:scale-95 transition-transform"
                title="Skip Back 10 Seconds"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={handleTogglePlayPause}
                className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-950 active:scale-95 transition-transform"
              >
                {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => handleSeek(10)}
                className="p-3 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 active:scale-95 transition-transform"
                title="Skip Forward 10 Seconds"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* DOCKED MINI-PLAYER REMOTE BAR (ALWAYS VISIBLE WHEN CONNECTED) */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-zinc-950/95 border border-zinc-800/90 backdrop-blur-xl rounded-2xl p-2.5 shadow-2xl flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-xl bg-red-600/20 border border-red-600/50 flex-none flex items-center justify-center">
              <Tv className="w-5 h-5 text-red-500" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-red-500 tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Playing on Shield Pro
              </p>
              <h4 className="font-extrabold text-xs text-white truncate">
                Dune: Part Two (2024)
              </h4>
              <p className="text-[10px] text-zinc-400 font-mono">
                {formatSeconds(playbackState.currentTimeSeconds)} / {formatSeconds(playbackState.durationSeconds)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-none" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleTogglePlayPause}
              className="p-2.5 rounded-full bg-red-600 text-white shadow-md active:scale-90 transition-transform"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
            >
              <ChevronUp className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}