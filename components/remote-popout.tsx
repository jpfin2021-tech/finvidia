"use client";

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, RotateCw, ChevronDown, ChevronUp, Tv, Radio, X, Unlink, RefreshCw } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [pairCodeInput, setPairCodeInput] = useState('');
  const [showPairModal, setShowPairModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(3600);
  const [activeTitle, setActiveTitle] = useState('NVIDIA Shield Controller');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('finvidia_lounge_token');
    if (savedToken) {
      setIsConnected(true);
    }

    const handleExternalCast = (e: any) => {
      if (e.detail?.title) setActiveTitle(e.detail.title);
      setIsPlaying(true);
      setIsConnected(true);
      setIsExpanded(true);
    };

    window.addEventListener('finvidia_cast_start', handleExternalCast);
    return () => window.removeEventListener('finvidia_cast_start', handleExternalCast);
  }, []);

  const handleConnectPairCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairCodeInput.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/lounge/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairCode: pairCodeInput.trim() }),
      });

      const data = await res.json();

      if (data.success && data.loungeToken) {
        localStorage.setItem('finvidia_lounge_token', data.loungeToken);
        localStorage.setItem('finvidia_screen_id', data.screenId || '');
        setIsConnected(true);
        setShowPairModal(false);
        setPairCodeInput('');
      } else {
        alert(data.error || 'Could not pair with TV code. Please check YouTube Settings on your Shield Pro.');
      }
    } catch (err) {
      alert('Error connecting to YouTube pairing service.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = () => {
    localStorage.removeItem('finvidia_lounge_token');
    localStorage.removeItem('finvidia_screen_id');
    setIsConnected(false);
    setIsExpanded(false);
  };

  const dispatchRemoteCommand = async (command: any) => {
    const token = localStorage.getItem('finvidia_lounge_token') || '';

    if (!token) {
      setShowPairModal(true);
      return;
    }

    try {
      const res = await fetch('/api/lounge/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loungeToken: token,
          command,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        if (res.status === 401) {
          localStorage.removeItem('finvidia_lounge_token');
          setIsConnected(false);
          setShowPairModal(true);
        }
      }
    } catch (err) {
      console.error('Command failed:', err);
    }
  };

  const handleTogglePlayPause = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    dispatchRemoteCommand({ type: nextState ? 'PLAY' : 'PAUSE' });
  };

  const handleSeek = (delta: number) => {
    const nextTime = Math.max(0, currentTime + delta);
    setCurrentTime(nextTime);
    dispatchRemoteCommand({ type: 'SEEK', seconds: nextTime });
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
              <h3 className="font-extrabold text-base text-white">
                {isConnected ? 'Shield Pro Linked' : 'Pair First-Screen TV'}
              </h3>
            </div>

            {isConnected ? (
              <div className="space-y-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Your phone is linked to your Shield Pro. Tapping reactions across FinVIDIA will send them directly to your TV.
                </p>
                <button
                  onClick={handleUnlink}
                  className="w-full bg-red-950/80 hover:bg-red-600 text-red-400 hover:text-white border border-red-900/50 font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Unlink className="w-4 h-4" /> Unlink & Enter Fresh TV Code
                </button>
              </div>
            ) : (
              <form onSubmit={handleConnectPairCode} className="space-y-3">
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  Open YouTube on your Shield Pro, go to <strong className="text-white">Settings → Link with TV Code</strong>, and enter the 12-digit code:
                </p>
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
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Save & Link TV</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Docked Mobile Remote Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pointer-events-none">
        <div className="max-w-xl mx-auto pointer-events-auto">
          {isConnected && isExpanded && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-t-2xl p-5 shadow-2xl mb-2 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    Master TV Remote Control
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPairModal(true)}
                    className="text-[11px] text-zinc-400 hover:text-white font-semibold underline pr-2 cursor-pointer"
                  >
                    TV Settings
                  </button>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mb-5 text-center">
                <h4 className="font-extrabold text-sm text-white line-clamp-1 mb-1">
                  {activeTitle}
                </h4>
                <p className="text-[11px] text-zinc-400 font-medium mb-3">
                  Playing live on NVIDIA Shield Pro
                </p>

                <div className="space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    value={currentTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setCurrentTime(val);
                      dispatchRemoteCommand({ type: 'SEEK', seconds: val });
                    }}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-zinc-500 font-bold px-0.5">
                    <span>{formatSeconds(currentTime)}</span>
                    <span>{formatSeconds(duration)}</span>
                  </div>
                </div>
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

          {/* Compact Bottom Mini Remote Bar */}
          <div className="bg-zinc-950/95 border border-zinc-800/90 backdrop-blur-xl rounded-2xl p-2.5 shadow-2xl flex items-center justify-between gap-3">
            <div
              onClick={() => isConnected ? setIsExpanded(!isExpanded) : setShowPairModal(true)}
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
            >
              <div className="relative w-9 h-9 rounded-xl bg-red-600/20 border border-red-600/50 flex-none flex items-center justify-center">
                <Tv className="w-4 h-4 text-red-500" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 text-red-500">
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`} />
                  {isConnected ? 'TV Sync Active' : 'First-Screen Remote'}
                </p>
                <h4 className="font-bold text-xs text-white truncate">
                  {isConnected ? activeTitle : 'Tap to Pair Shield Pro'}
                </h4>
              </div>
            </div>

            {isConnected ? (
              <div className="flex items-center gap-2 flex-none">
                <button
                  onClick={handleTogglePlayPause}
                  className="p-2.5 rounded-full bg-red-600 text-white shadow-md active:scale-90 transition-transform cursor-pointer"
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