"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, Tv, Trophy, Search, ChevronDown, Sparkles, Film, ExternalLink, MessageSquare } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

interface FAQCategory {
  title: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

export default function FAQPage() {
  const [openItems, setOpenIndex] = useState<Record<string, boolean>>({
    'gen-1': true, // Open first question by default
    'tv-1': true,
  });

  const toggleItem = (id: string) => {
    setOpenIndex((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const faqCategories: FAQCategory[] = [
    {
      title: "General & Platform",
      icon: <HelpCircle className="w-5 h-5 text-red-600" />,
      items: [
        {
          id: "gen-1",
          question: "What is FinVIDIA?",
          answer: "FinVIDIA is the premier searchable index and database for YouTube movie reaction channels, timestamps, and creator commentary. We catalog reactions by film title, reactor, director, actor, studio, and franchise—giving movie reaction fans a clean, structured way to discover and track reaction content."
        },
        {
          id: "gen-2",
          question: "Do views on FinVIDIA count toward the creator's official YouTube channel?",
          answer: "Yes, 100%. Every embedded player on FinVIDIA runs through YouTube's official player, and our deep-links open directly inside the official YouTube mobile app. All watch time, view counts, and ad impressions go straight to the original content creator."
        },
        {
          id: "gen-3",
          question: "How often is the database updated?",
          answer: "New creator channels, movie indexes, and freshly published reaction videos are ingested and updated regularly to keep rankings, view metrics, and search directories accurate."
        }
      ]
    },
    {
      title: "Playback & TV Handoff",
      icon: <Tv className="w-5 h-5 text-red-600" />,
      items: [
        {
          id: "tv-1",
          question: "How do I watch reactions on my TV or Shield Pro?",
          answer: (
            <span>
              When browsing on mobile or desktop, clicking <strong className="text-white">"Open YouTube App (Cast)"</strong> in any video modal or card deep-links directly into your native YouTube app. From there, you can use your phone's built-in Google Cast button to throw the video onto your NVIDIA Shield Pro, smart TV, or streaming device instantly.
            </span>
          )
        },
        {
          id: "tv-2",
          question: "What are the interactive Chapter TOC markers?",
          answer: "Our AI reaction summaries break down key moments, intro commentary, movie start times, pause discussions, and final reviews into timestamped chapter markers. Tapping any marker jumps the video directly to that exact second."
        }
      ]
    },
    {
      title: "Rankings & Metrics",
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
      items: [
        {
          id: "rank-1",
          question: "How is the Master Leaderboard calculated?",
          answer: (
            <span>
              The Leaderboard ranks films based on the aggregate total view count of all indexed creator reactions for that title. You can also sort by <strong className="text-white">Views Per Reaction</strong> (averaging total views by the number of reactors) to see which movies drive the highest viewer engagement per video.
            </span>
          )
        },
        {
          id: "rank-2",
          question: "What is the difference between 'Total Views' and 'Views Per Reaction'?",
          answer: (
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><strong className="text-white">Total Reaction Views:</strong> The combined view count of every creator reaction indexed for a specific film.</li>
              <li><strong className="text-white">Views Per Reaction:</strong> The average view count per reaction video, highlighting titles that pull massive numbers even if only a few creators have covered them.</li>
            </ul>
          )
        }
      ]
    },
    {
      title: "Features & Discovery",
      icon: <Search className="w-5 h-5 text-red-600" />,
      items: [
        {
          id: "feat-1",
          question: "How does the Search function work?",
          answer: "Our master search bar indexes titles, directors, lead actors, studios, and creator handles. Searching an actor like Tom Hanks or a director like Christopher Nolan returns every indexed film they are attached to, along with every reactor who has covered those films."
        },
        {
          id: "feat-2",
          question: "Where can I watch or buy the actual official movie featured in a reaction?",
          answer: "Every official film landing page features direct links to stream, rent, or purchase the official movie—including Prime Video digital links, 4K Disc / Blu-ray physical media links, and JustWatch streaming availability guides."
        },
        {
          id: "feat-3",
          question: "How do I request a missing creator channel or reaction video?",
          answer: "If a creator or specific reaction video isn't indexed yet, you can submit the channel handle or video URL, and our indexing pipeline will queue it for database inclusion."
        }
      ]
    }
  ];

  return (
    <div className="pt-20 pb-20 min-h-screen bg-[#09090b]">
      <div className="px-6 md:px-12 max-w-5xl mx-auto my-6">
        
        {/* Header */}
        <div className="border-b border-zinc-800 pb-6 mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 bg-red-950/60 border border-red-900/50 px-3 py-1 rounded-full text-red-400 text-xs font-black uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            Knowledge Base
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
            Frequently Asked Questions
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-2 font-medium max-w-2xl">
            Everything you need to know about FinVIDIA, reactor indexing, TV casting, and database navigation.
          </p>
        </div>

        {/* Accordion Categories */}
        <div className="space-y-8">
          {faqCategories.map((cat, catIdx) => (
            <div key={catIdx} className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 shadow-xl">
              
              <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-800 pb-3">
                {cat.icon}
                <h2 className="text-lg font-black text-white uppercase tracking-wider">
                  {cat.title}
                </h2>
              </div>

              <div className="space-y-3">
                {cat.items.map((item) => {
                  const isOpen = !!openItems[item.id];

                  return (
                    <div
                      key={item.id}
                      className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden transition-all duration-200"
                    >
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-left font-extrabold text-sm text-white hover:text-red-400 transition-colors cursor-pointer gap-4"
                      >
                        <span>{item.question}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-zinc-400 flex-none transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-red-500" : ""
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-zinc-300 font-medium leading-relaxed border-t border-zinc-900 animate-in fade-in duration-200">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>

        {/* Quick Links Footer Box */}
        <div className="mt-12 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
          <div>
            <h3 className="font-extrabold text-base text-white flex items-center justify-center sm:justify-start gap-2">
              <Film className="w-4 h-4 text-red-600" /> Ready to explore?
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Dive into our master directory or check out the current top-performing films.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/browse"
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md"
            >
              Browse Movies
            </Link>
            <Link
              href="/rankings"
              className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-zinc-700 transition-all"
            >
              Leaderboard
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}