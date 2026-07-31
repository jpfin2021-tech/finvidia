"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { LoungeClient, FirstScreenPlaybackState } from '@/lib/lounge-client';
import { Play, Pause, RotateCcw, RotateCw, ChevronDown, ChevronUp, Tv, Radio, X } from 'lucide-react';

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function RemotePopout() {
  const loungeClient = useMemo(() => new LoungeClient(), []);

  const [playbackState, setPlaybackState] = useState<FirstScreenPlaybackState>(
    loungeClient.getPlaybackState()
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [pairCodeInput, setPairCodeInput] = useState('');
  const [showPairModal, setShowPairModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('finvidia_lounge_token');
    if (savedToken) {
      setIsConnected(true);
    }

    const unsubscribe = loungeClient.subscribe((newState) => {
      setPlaybackState(newState);
    });
    return () => unsubscribe();
  }, [loungeClient]);

  const isPlaying = playbackState.playerState === 'PLAYING';

  const handleConnectPairCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairCodeInput.trim()) return;

    try {
      const res = await fetch('/api/lounge/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairCode: pairCodeInput.trim() }),
      });

      const data = await res.json();

      if (data.success && data.loungeToken) {
        localStorage.setItem('finvidia_lounge_token', data.loungeToken);
        setIsConnected(true);
        setShowPairModal(false);
        alert('Successfully linked to NVIDIA Shield Pro!');
      } else {
        alert(data.error || 'Could not pair with TV code. Please check YouTube Settings on your Shield Pro.');
      }
    } catch (err) {
      alert('Error connecting to YouTube pairing service.');
    }
  };

  const handleTogglePlayPause = async () => {
    const token = localStorage.getItem('finvidia_lounge_token');
    if (!token) {
      setShowPairModal(true);
      return;
    }

    await fetch('/api/lounge/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loungeToken: token,
        command: { type: isPlaying ? 'PAUSE' : 'PLAY' },
      }),
    });
  };

  const handleSeek = async (secondsDelta: number) => {
    const token = localStorage.getItem('finvidia_lounge_token');
    if (!token) return;

    const target = Math.max(0, playbackState.currentTimeSeconds + secondsDelta);
    await fetch('/api/lounge/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loungeToken: token,
        command: { type: 'SEEK', seconds: target },
      }),
    });
  };

  return (
    <>
      {/* Pair Code Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setShowPairModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Tv className="w-6 h-6 text-red-600" />
              <h3 className="font-extrabold text-base text-white">Pair NVIDIA Shield Pro</h3>
            </div>

            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Open the standard <strong className="text-white">YouTube App</strong> on your Shield Pro, go to <strong className="text-white">Settings → Link with TV Code</strong>, and enter the 12-digit code below:
            </p>

            <form onSubmit={handleConnectPairCode} className="space-y-3">
              <input
                type="text"
                placeholder="e.g. 123 456 789 012"
                value={pairCodeInput}
                onChange={(e) => setPairCodeInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-center text-sm font-mono tracking-widest text-white rounded-xl p-3 focus:outline-none focus:border-red-600"
                autoFocus
              />
              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-3 rounded-xl transition-all"
              >
                Link Shield Pro & Connect
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pointer-events-none">
        <div className="max-w-xl mx-auto pointer-events-auto">
          {isConnected && isExpanded && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-t-2xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 mb-2">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    Shield Pro Controller
                  </span>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-6 my-2">
                <button
                  onClick={() => handleSeek(-10)}
                  className="p-3 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 active:scale-95 transition-transform cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={handleTogglePlayPause}
                  className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-950 active:scale-95 transition-transform cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={() => handleSeek(10)}
                  className="p-3 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 active:scale-95 transition-transform cursor-pointer"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Compact Mini Bar */}
          <div className="bg-zinc-950/95 border border-zinc-800/90 backdrop-blur-xl rounded-2xl p-2.5 shadow-2xl flex items-center justify-between gap-3">
            <div
              onClick={() => isConnected ? setIsExpanded(!isExpanded) : setShowPairModal(true)}
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
            >
              <div className="relative w-9 h-9 rounded-xl bg-red-600/20 border border-red-600/50 flex-none flex items-center justify-center">
                <Tv className="w-4 h-4 text-red-500" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-red-500 tracking-wider flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`} />
                  {isConnected ? 'Connected to Shield Pro' : 'First-Screen Sync'}
                </p>
                <h4 className="font-bold text-xs text-white truncate">
                  {isConnected ? 'NVIDIA Shield Controller' : 'Tap to Link Shield Pro'}
                </h4>
              </div>
            </div>

            {isConnected ? (
              <div className="flex items-center gap-2 flex-none">
                <button
                  onClick={handleTogglePlayPause}
                  className="p-2 rounded-full bg-red-600 text-white shadow-md active:scale-90 transition-transform cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <ChevronUp className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPairModal(true)}
                className="bg-red-600 hover:bg-red-500 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg flex-none transition-all cursor-pointer"
              >
                Pair Shield
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}