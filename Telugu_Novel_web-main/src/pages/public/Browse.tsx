/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, BookOpen, Clock, SlidersHorizontal, Trash2, ArrowUpDown } from 'lucide-react';
import { Novel } from '../../types';
import { NovelCard } from './Home';

interface BrowseProps {
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const Browse: React.FC<BrowseProps> = ({ addToast }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);

  // Read URL params as active filters
  const searchQuery = searchParams.get('search') || '';
  const categoryFilter = searchParams.get('category') || '';
  const sortOption = searchParams.get('sort') || 'latest';

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const loadBooks = async () => {
      setLoading(true);
      try {
        // Build API request URL incorporating filters
        let url = `/api/novels?sort=${sortOption}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        if (categoryFilter) url += `&category=${encodeURIComponent(categoryFilter)}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.novels) {
          setNovels(data.novels);
        } else {
          addToast('Error loading novels catalogue.', 'error');
        }
      } catch (err) {
        console.error('Fetch catalogue error:', err);
        addToast('Connection failure to platform backend.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadBooks();
  }, [searchQuery, categoryFilter, sortOption, addToast]);

  const updateSearchParam = (key: string, value: string) => {
    startTransition(() => {
      const copy = new URLSearchParams(searchParams);
      if (value) {
        copy.set(key, value);
      } else {
        copy.delete(key);
      }
      setSearchParams(copy);
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      setSearchParams({});
    });
  };

  const categories = ['Romance', 'Thriller', 'Mystery', 'Drama', 'Fantasy', 'Comedy', 'Historical'];

  return (
    <div className="bg-neutral-50 min-h-screen py-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* TOP PATHS INDICATOR */}
        <div className="mb-6 flex flex-wrap justify-between items-center gap-4 border-b border-neutral-200 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-neutral-800 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6.5 h-6.5 text-[#f97316]" />
              Explore Novels
            </h1>
            <p className="text-xs text-neutral-500 mt-1">Discover and read premium light novels in our library catalog.</p>
          </div>

          <div className="text-xs font-mono font-semibold bg-neutral-100 text-neutral-600 px-3.5 py-1.5 border border-neutral-200 rounded-xl">
            {novels.length} novels available
          </div>
        </div>

        {/* --- FILTERS & CONTROLS DASHBOARD --- */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 mb-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-sm font-semibold text-neutral-700 pb-2 border-b border-neutral-100">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-orange-500" />
              Refine Search Catalog
            </span>
            {(searchQuery || categoryFilter || sortOption !== 'latest') && (
              <button
                onClick={clearFilters}
                className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4.5 h-4.5 text-neutral-400 shrink-0" />
              <input
                type="text"
                placeholder="Keyword search..."
                value={searchQuery}
                onChange={(e) => updateSearchParam('search', e.target.value)}
                className="pl-9 pr-4 py-2 w-full text-sm font-sans border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-neutral-50/30"
              />
            </div>

            {/* Category Selector */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => updateSearchParam('category', e.target.value)}
                className="pl-4 pr-10 py-2 w-full text-sm font-sans border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-neutral-50/30 appearance-none cursor-pointer"
              >
                <option value="">All Genres</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-3 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-neutral-400"></div>
            </div>

            {/* Sort Strategy */}
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => updateSearchParam('sort', e.target.value)}
                className="pl-4 pr-10 py-2 w-full text-sm font-sans border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-neutral-50/30 appearance-none cursor-pointer"
              >
                <option value="latest">Latest Updated</option>
                <option value="popular">Most Popular</option>
                <option value="alphabetical">Alphabetical Order</option>
              </select>
              <div className="absolute right-3.5 top-3 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-neutral-400"></div>
            </div>

            {/* Clear Filters helper comment */}
            <div className="flex items-center text-xs text-neutral-400 italic">
              * Results update automatically as filters change
            </div>
          </div>
        </div>

        {/* --- NOVEL RESULTS GRID --- */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent animate-spin rounded-full"></div>
            <p className="text-neutral-500 text-sm mt-3 font-medium">Applying filters...</p>
          </div>
        ) : novels.length === 0 ? (
          <div className="bg-white border border-neutral-200 shadow-sm rounded-2xl p-16 text-center text-neutral-500 flex flex-col items-center justify-center max-w-lg mx-auto leading-relaxed">
            <p className="text-lg font-bold text-neutral-800">No Results Found</p>
            <p className="text-sm text-neutral-500 mt-2">Try changing your search terms or clearing selected visual filters to search again.</p>
            <button
              onClick={clearFilters}
              className="mt-6 px-5 py-2.5 bg-orange-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all hover:bg-orange-600"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            {novels.map((novel) => (
              <NovelCard key={novel._id} novel={novel} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
