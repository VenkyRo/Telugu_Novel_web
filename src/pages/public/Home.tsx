/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, BookOpen, Clock, Eye, SlidersHorizontal, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Novel } from '../../types';

interface HomeProps {
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const Home: React.FC<HomeProps> = ({ addToast }) => {
  const [latestNovels, setLatestNovels] = useState<Novel[]>([]);
  const [popularNovels, setPopularNovels] = useState<Novel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load Novels catalog on mount
  useEffect(() => {
    const fetchNovels = async () => {
      try {
        const res = await fetch('/api/novels');
        const data = await res.json();
        
        if (data.success && data.novels) {
          const loaded: Novel[] = data.novels;
          // Sort for Latest (Newest created/updated)
          const latest = [...loaded]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 4);
          
          // Sort for Popular (Most viewed)
          const popular = [...loaded]
            .sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0))
            .slice(0, 4);

          setLatestNovels(latest);
          setPopularNovels(popular);
        } else {
          addToast('Error loading public library catalogue.', 'error');
        }
      } catch (err) {
        console.error('Fetch home novels error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNovels();
  }, [addToast]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/novels?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const categories = [
    { title: 'Romance', id: 'Romance', icon: '🌸', color: 'bg-rose-50 hover:bg-rose-100/70 text-rose-700 hover:border-rose-300' },
    { title: 'Thriller', id: 'Thriller', icon: '🕵️‍♂️', color: 'bg-indigo-50 hover:bg-indigo-100/70 text-indigo-700 hover:border-indigo-300' },
    { title: 'Mystery', id: 'Mystery', icon: '🔍', color: 'bg-amber-50 hover:bg-amber-100/70 text-amber-700 hover:border-amber-300' },
    { title: 'Drama', id: 'Drama', icon: '🎭', color: 'bg-teal-50 hover:bg-teal-100/70 text-teal-700 hover:border-teal-300' }
  ];

  return (
    <div className="bg-neutral-50 min-h-screen">
      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden bg-neutral-900 px-4 py-16 sm:py-24 text-center border-b border-orange-500/10">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 opacity-15 select-none pointer-events-none">
          <div className="absolute -left-10 -top-10 w-80 h-80 bg-orange-500/40 rounded-full blur-3xl"></div>
          <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-amber-500/30 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-4 animate-pulse">
            📚 Continuous Light Novel Streams
          </span>
          <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight leading-tight sm:leading-none">
            Captivating <br className="sm:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
              Light Novel
            </span> Sanctuary
          </h1>
          <p className="mt-4 text-base sm:text-lg text-neutral-300 max-w-2xl mx-auto font-sans leading-relaxed">
            Savor the sweetness of stories. Enjoy a wide variety of light novels. Step into magnificent worlds shaped by creative writers and storytellers.
          </p>

          {/* Integrated Search Console */}
          <form onSubmit={handleSearchSubmit} className="mt-8 max-w-lg mx-auto relative flex items-center group">
            <Search className="absolute left-4 w-5 h-5 text-neutral-400 group-focus-within:text-orange-400 transition-colors shrink-0" />
            <input
              type="text"
              placeholder="Search novels by title, author, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-28 py-3.5 w-full text-sm sm:text-base font-sans bg-neutral-800 text-white rounded-2xl border border-neutral-700/60 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 shadow-xl placeholder-neutral-500 transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-xs rounded-xl shadow transition-all active:scale-95"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* 2. MAIN APP CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* CATEGORIES SECTORS */}
        <section className="mb-12 animate-fade-in">
          <h2 className="text-xl font-display font-bold text-neutral-800 tracking-tight mb-5 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-orange-500" />
            Browse Categories
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/novels?category=${cat.id}`)}
                className={`flex items-center gap-3 p-4 rounded-2xl border border-neutral-200/60 shadow-sm cursor-pointer transition-all duration-300 ${cat.color}`}
              >
                <span className="text-2xl shrink-0" role="img">{cat.icon}</span>
                <div className="text-left">
                  <p className="font-semibold text-sm sm:text-base">{cat.title}</p>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mt-0.5">Explore Category</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent animate-spin rounded-full"></div>
            <p className="text-neutral-500 text-sm font-medium mt-4">Loading Light Novels Catalogue...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* 3. LATEST NOVELS SECTION */}
            <section className="animate-fade-in-up">
              <div className="flex justify-between items-end mb-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-display font-extrabold text-neutral-800 tracking-tight flex items-center gap-2">
                    <Clock className="w-5.5 h-5.5 text-[#f97316]" />
                    Latest Novels
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">Freshly updated series and publisher drafts</p>
                </div>
                <Link to="/novels" className="text-semibold text-sm text-[#f97316] hover:text-orange-600 hover:underline flex items-center gap-1 shrink-0">
                  <span>View All</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              {latestNovels.length === 0 ? (
                <div className="p-8 text-center bg-white border border-neutral-200 rounded-2xl text-neutral-500">
                  Currently, no light novels are available.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {latestNovels.map((novel) => (
                    <NovelCard key={novel._id} novel={novel} />
                  ))}
                </div>
              )}
            </section>

            {/* 4. POPULAR NOVELS SECTION */}
            <section className="animate-fade-in-up-delay bg-gradient-to-br from-orange-50/50 to-amber-50/20 p-6 sm:p-8 rounded-2xl border border-orange-500/5 shadow-inner">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-display font-extrabold text-neutral-800 tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-5.5 h-5.5 text-orange-500" />
                    Popular Stories
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">Highly viewed and top rated light novels</p>
                </div>
                <Link to="/novels?sort=popular" className="text-semibold text-sm text-[#f97316] hover:text-orange-600 hover:underline flex items-center gap-1 shrink-0">
                  <span>Popular Novels</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              {popularNovels.length === 0 ? (
                <div className="p-8 text-center bg-white border border-neutral-200 rounded-2xl text-neutral-500">
                  No popular novels are ready yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {popularNovels.map((novel) => (
                    <NovelCard key={novel._id} novel={novel} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

interface NovelCardProps {
  novel: Novel & { publishedChaptersCount?: number };
}

export const NovelCard: React.FC<NovelCardProps> = ({ novel }) => {
  return (
    <div className="group bg-white rounded-2xl border border-neutral-200/70 overflow-hidden shadow-sm hover:shadow-lg hover:border-orange-500/20 transition-all duration-300 flex flex-col h-full animate-fade-in">
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden shrink-0">
        <img
          src={novel.coverImageUrl}
          alt={novel.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md">
            {novel.category}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase text-white backdrop-blur-md ${
            novel.novelStatus === 'ONGOING' ? 'bg-orange-600/80' : 'bg-emerald-600/80'
          }`}>
            {novel.novelStatus === 'ONGOING' ? 'Ongoing' : 'Completed'}
          </span>
        </div>
      </div>

      {/* Novel Body details */}
      <div className="p-4 flex flex-col justify-between flex-1">
        <div className="space-y-1.5">
          <h3 className="font-display font-bold text-base sm:text-lg text-neutral-800 line-clamp-1 group-hover:text-orange-500 transition-colors">
            {novel.title}
          </h3>
          <p className="text-xs font-mono text-neutral-400">Author: {novel.author}</p>
          <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed h-10 font-sans">
            {novel.shortSummary}
          </p>
        </div>

        {/* Counts indicators footer */}
        <div className="mt-4 pt-3.5 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono font-semibold text-neutral-500 shrink-0">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-orange-500" />
            <span>{novel.publishedChaptersCount || 0} Chapters</span>
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-neutral-400" />
            <span>{novel.totalViews || 0} Views</span>
          </span>
        </div>

        <Link
          to={`/novels/${novel.slug}`}
          className="mt-4 w-full py-2.5 bg-neutral-50 hover:bg-orange-500 hover:text-white border border-neutral-200 hover:border-orange-500 text-center text-neutral-700 font-sans font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 shrink-0"
        >
          <span>Start Reading</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
