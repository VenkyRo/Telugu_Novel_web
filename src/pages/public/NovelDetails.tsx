/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Eye, Bookmark, Award, Clock, ArrowRight } from 'lucide-react';
import { Novel, Chapter } from '../../types';

interface NovelDetailsProps {
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const NovelDetails: React.FC<NovelDetailsProps> = ({ addToast }) => {
  const { slug } = useParams<{ slug: string }>();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Partial<Chapter>[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadNovelDetails = async () => {
      try {
        const res = await fetch(`/api/novels/${slug}`);
        const data = await res.json();

        if (data.success && data.novel) {
          setNovel(data.novel);
          setChapters(data.chapters || []);
        } else {
          addToast(data.message || 'Error loading novel information.', 'error');
          navigate('/');
        }
      } catch (err) {
        console.error('Fetch novel details error:', err);
        addToast('Connection failed. Please refresh.', 'error');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadNovelDetails();
  }, [slug, navigate, addToast]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-36 bg-neutral-50 min-h-screen">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent animate-spin rounded-full"></div>
        <p className="text-neutral-500 text-sm mt-3.5 font-semibold font-sans">Loading novel details...</p>
      </div>
    );
  }

  if (!novel) return null;

  return (
    <div className="bg-neutral-50 min-h-screen py-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* --- NOVEL LANDING METAS SECTION --- */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-8 shadow-sm flex flex-col md:flex-row gap-8 mb-10 overflow-hidden animate-fade-in">
          {/* Cover Art Box */}
          <div className="relative aspect-[3/4] w-full md:w-72 bg-neutral-100 rounded-xl overflow-hidden shadow-md shrink-0 self-center md:self-start">
            <img
              src={novel.coverImageUrl}
              alt={novel.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-black/60 text-white backdrop-blur-md border border-white/10 shrink-0">
                {novel.category}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase text-white backdrop-blur-md text-center ${
                novel.novelStatus === 'ONGOING' ? 'bg-orange-600/90' : 'bg-emerald-600/90'
              }`}>
                {novel.novelStatus === 'ONGOING' ? 'Ongoing' : 'Completed'}
              </span>
            </div>
          </div>

          {/* Details Column info */}
          <div className="flex-1 space-y-5">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-neutral-800 tracking-tight leading-tight">
                {novel.title}
              </h1>
              <p className="text-sm font-sans font-medium text-neutral-500">Author: <span className="text-neutral-800 font-bold underline font-sans">{novel.author}</span></p>
            </div>

            {/* Micro details panel indicators */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-xs font-semibold text-neutral-600">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-orange-500 shrink-0" />
                <div>
                  <p className="text-neutral-400 font-medium">Chapters</p>
                  <p className="font-mono mt-0.5 text-neutral-800 font-bold">{chapters.length} Chapters</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-orange-500 shrink-0" />
                <div>
                  <p className="text-neutral-400 font-medium">Total Views</p>
                  <p className="font-mono mt-0.5 text-neutral-800 font-bold">{novel.totalViews || 0} Views</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
                <div>
                  <p className="text-neutral-400 font-medium">Published Date</p>
                  <p className="font-mono mt-0.5 text-neutral-800 font-bold">
                    {new Date(novel.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                <div>
                  <p className="text-neutral-400 font-medium">Last Updated</p>
                  <p className="font-mono mt-0.5 text-neutral-800 font-bold">
                    {new Date(novel.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary details */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm uppercase text-neutral-400 tracking-wider">About the Novel (Description)</h3>
              <p className="text-neutral-700 text-sm sm:text-base leading-relaxed whitespace-pre-line font-sans p-4 rounded-xl bg-neutral-50/70 border border-neutral-200/50">
                {novel.description}
              </p>
            </div>

            {/* Tags section */}
            {novel.tags && novel.tags.length > 0 && (
              <div className="flex flex-wrap gap-2.5 pt-2">
                {novel.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-lg text-xs font-mono font-medium border border-neutral-300 text-neutral-500 bg-white">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- CHAPTERS DIRECTORY LOGS --- */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-neutral-200 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-display font-extrabold text-neutral-800 tracking-tight flex items-center gap-2">
                <Award className="w-5.25 h-5.25 text-orange-500" />
                Table of Chapters
              </h2>
              <p className="text-xs text-neutral-500 mt-1">All chapters are arranged in logical order. Click any chapter to begin reading.</p>
            </div>
            
            {chapters.length > 0 && (
              <Link
                to={`/read/${chapters[0]._id}`}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all shrink-0 flex items-center gap-1 active:scale-[0.98]"
              >
                <span>Read First Chapter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {chapters.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-xl leading-relaxed">
              The author is currently adding chapters to this novel. Please stay tuned.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chapters.map((chapter) => (
                <Link
                  key={chapter._id}
                  to={`/read/${chapter._id}`}
                  className="group flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-white hover:bg-orange-500/5 hover:border-orange-500/35 transition-all duration-300"
                >
                  <div className="space-y-1 pr-4">
                    <p className="text-xs font-mono font-bold text-orange-500 uppercase tracking-widest">
                      Chapter {chapter.chapterNumber}
                    </p>
                    <p className="font-display font-extrabold text-neutral-800 group-hover:text-orange-500 transition-colors line-clamp-1 leading-normal text-sm sm:text-base">
                      {chapter.title}
                    </p>
                  </div>
                  
                  <span className="shrink-0 p-2 rounded-xl bg-neutral-100 group-hover:bg-orange-500 text-neutral-500 group-hover:text-white transition-all transform group-hover:translate-x-1.5 duration-200">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
