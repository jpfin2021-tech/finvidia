"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronDown, ChevronUp, Trophy, Search, Film, Tv, Sparkles, ShoppingBag } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

export default function FAQPage() {
  const [openIndexes, setOpenIndexes] = useState<{ [key: string]: boolean }>({});

  const toggleAccordion = (sectionIdx: number, itemIdx: number) => {
    const key = `${sectionIdx}-${itemIdx}`;
    setOpenIndexes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const faqData: FAQSection[] = [
    {
      title: "GENERAL & PLATFORM",
      items: [
        {
          question: "What is FinVIDIA?",
          answer: (
            <p>
              FinVIDIA is an indexed directory and analytics platform built specifically for movie reaction content. We index verified YouTube reaction videos and map them directly to official domestic movie listings, creator channels, and cast members.
            </p>
          ),
        },
        {
          question: "How are movies added to the catalog?",
          answer: (
            <p>
              Movies enter our live production catalog as soon as at least one verified reaction video from an indexed creator channel is mapped to the film.
            </p>
          ),
        },
      ],
    },
    {
      title: "LEADERBOARD & ANALYTICS",
      items: [
        {
          question: "How is the Master Leaderboard calculated?",
          answer: (
            <p>
              The Master Leaderboard ranks films based on total aggregate reaction viewership across all verified creator reaction videos published on YouTube.
            </p>
          ),
        },
        {
          question: "What is the difference between 'Total Views' and 'Views Per Reaction'?",
          answer: (
            <p>
              <strong>Total Views</strong> is the sum of all view counts across all verified reaction videos for a movie. <strong>Views Per Reaction</strong> divides total views by the number of reaction videos, giving a measure of average creator performance per upload.
            </p>
          ),
        },
      ],
    },
    {
      title: "FEATURES & DISCOVERY",
      items: [
        {
          question: "How does the Search function work?",
          answer: (
            <p>
              Our search bar indexes movie titles, release years, studio labels, director names, key cast members, and creator handles directly from our database.
            </p>
          ),
        },
        {
          question: "Where can I watch or buy the actual official movie featured in a reaction?",
          answer: (
            <p>
              Every official Movie Hub page includes direct affiliate links to stream on Prime Video Digital, purchase physical 4K UHD / Blu-ray media on Amazon, or check full streaming availability via JustWatch.
            </p>
          ),
        },
        {
          question: "How do I request a missing creator channel or reaction video?",
          answer: (
            <p>
              We continuously audit YouTube for new reaction uploads. To submit a channel for verification, reach out to our team via the social links or moderation desk.
            </p>
          ),
        },
      ],
    },
  ];

  return (
    <div className="pt-20 pb-20 min-h-screen bg-[#09090b]">
      <div className="px-6 md:px-12 max-w-4xl mx-auto my-6">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-6 mb-8">
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            <HelpCircle className="w-8 h-8 text-red-600" />
            Frequently Asked Questions
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-1 font-medium">
            Everything you need to know about the FinVIDIA movie reaction platform and index.
          </p>
        </div>

        {/* FAQ Accordion Sections */}
        <div className="space-y-8">
          {faqData.map((section, sIdx) => (
            <div key={sIdx} className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 md:p-6 shadow-xl">
              <h2 className="text-xs font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 fill-red-500" />
                {section.title}
              </h2>

              <div className="space-y-3">
                {section.items.map((item, iIdx) => {
                  const key = `${sIdx}-${iIdx}`;
                  const isOpen = !!openIndexes[key];

                  return (
                    <div
                      key={iIdx}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden transition-colors"
                    >
                      <button
                        onClick={() => toggleAccordion(sIdx, iIdx)}
                        className="w-full p-4 text-left font-bold text-sm text-white flex items-center justify-between gap-4 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <span>{item.question}</span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-red-500 flex-none" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-500 flex-none" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-zinc-300 border-t border-zinc-800/60 leading-relaxed font-medium">
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

        {/* Updated Bottom Call To Action */}
        <div className="mt-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div>
            <h3 className="font-extrabold text-sm text-white uppercase flex items-center gap-2">
              <Film className="w-4 h-4 text-red-500" /> Ready to explore?
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Dive into our master directory or check out the current top-performing films.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/movies"
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
            >
              Browse Movies
            </Link>
            <Link
              href="/rankings"
              className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-zinc-700 transition-all cursor-pointer"
            >
              Leaderboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}