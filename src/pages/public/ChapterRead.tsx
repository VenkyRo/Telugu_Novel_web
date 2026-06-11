/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useTransition } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ArrowRight, Heart, Bookmark, MessageSquare, BookOpen, AlertCircle, Send, CheckCircle } from 'lucide-react';
import { Chapter, Comment } from '../../types';

interface ChapterReadProps {
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const ChapterRead: React.FC<ChapterReadProps> = ({ addToast }) => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [novelTitle, setNovelTitle] = useState('');
  const [novelSlug, setNovelSlug] = useState('');
  const [loading, setLoading] = useState(true);

  // Likes & Bookmarks State
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Navigation state
  const [navInfo, setNavInfo] = useState<{
    previousChapterId: string | null;
    previousChapterTitle: string | null;
    nextChapterId: string | null;
    nextChapterTitle: string | null;
  } | null>(null);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [commenting, setCommenting] = useState(false);

  const [isPending, startTransition] = useTransition();

  // 1. Fetch main chapter details
  useEffect(() => {
    const loadChapter = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/chapters/${chapterId}`);
        const data = await res.json();

        if (data.success && data.chapter) {
          const chap: Chapter = data.chapter;
          setChapter(chap);
          setNovelTitle(data.novelTitle);
          setNovelSlug(data.novelSlug);

          // Update interaction metrics
          setLikesCount(chap.likedBy ? chap.likedBy.length : 0);
          if (user) {
            setIsLiked(chap.likedBy ? chap.likedBy.includes(user._id) : false);
          }

          // Trigger subsequent items fetches
          fetchNavigation(chap._id);
          fetchComments(chap._id);
          if (user) fetchBookmarkStatus(chap._id);
        } else {
          addToast(data.message || 'Chapter draft cannot be read by public accounts.', 'error');
          navigate('/');
        }
      } catch (err) {
        console.error('Fetch read chapter error:', err);
        addToast('Connection failed. Please refresh the page.', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (chapterId) loadChapter();
  }, [chapterId, user, navigate, addToast]);

  // 2. Fetch sequences navigation
  const fetchNavigation = async (cid: string) => {
    try {
      const res = await fetch(`/api/chapters/${cid}/navigation`);
      const data = await res.json();
      if (data.success) {
        setNavInfo({
          previousChapterId: data.previousChapterId,
          previousChapterTitle: data.previousChapterTitle,
          nextChapterId: data.nextChapterId,
          nextChapterTitle: data.nextChapterTitle
        });
      }
    } catch (err) {
      console.error('Fetch navigation metadata error:', err);
    }
  };

  // 3. Fetch APPROVED-only comments
  const fetchComments = async (cid: string) => {
    try {
      const res = await fetch(`/api/chapters/${cid}/comments`);
      const data = await res.json();
      if (data.success) {
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error('Fetch comments error:', err);
    }
  };

  // 4. Fetch bookmark status for current user & chapter
  const fetchBookmarkStatus = async (cid: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/bookmarks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.bookmarks) {
        const active: any[] = data.bookmarks;
        setIsBookmarked(active.some(b => b.chapter?._id === cid));
      }
    } catch (err) {
      console.error('Fetch bookmarks error:', err);
    }
  };

  // 5. Trigger Thumbs Up / Likes
  const handleLikeToggle = async () => {
    if (!user || !token) {
      addToast('Please log in to like this narrative.', 'info');
      navigate('/login');
      return;
    }

    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const res = await fetch(`/api/chapters/${chapterId}/like`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setIsLiked(!isLiked);
        setLikesCount(data.likesCount);
        addToast(isLiked ? 'Like removed.' : 'Liked this chapter! ❤️', 'success');
      } else {
        addToast(data.message || 'Action barred. Account validation expired.', 'error');
      }
    } catch (err) {
      console.error('Toggle likes error:', err);
      addToast('Server connection error.', 'error');
    }
  };

  // 6. Trigger Bookmarking
  const handleBookmarkToggle = async () => {
    if (!user || !token) {
      addToast('Please log in to bookmark chapters.', 'info');
      navigate('/login');
      return;
    }

    try {
      const method = isBookmarked ? 'DELETE' : 'POST';
      const res = await fetch(`/api/bookmarks/${chapterId}`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setIsBookmarked(!isBookmarked);
        addToast(isBookmarked ? 'Bookmark removed.' : 'Bookmarked this chapter! 🔖', 'success');
      } else {
        addToast(data.message || 'Bookmark action error.', 'error');
      }
    } catch (err) {
      console.error('Toggle bookmarks error:', err);
      addToast('Bookmark operation timed out.', 'error');
    }
  };

  // 7. Submit comment formulation (Pushed to PENDING)
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      addToast('Please log in to add a comment.', 'info');
      navigate('/login');
      return;
    }

    if (!commentInput.trim()) {
      addToast('Please enter your comment content.', 'error');
      return;
    }

    setCommenting(true);
    try {
      const res = await fetch(`/api/chapters/${chapterId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: commentInput })
      });
      const data = await res.json();

      if (data.success) {
        addToast('Your comment has been submitted. It will be published after admin approval.', 'success');
        setCommentInput('');
      } else {
        addToast(data.message || 'Comment submit failed.', 'error');
      }
    } catch (err) {
      console.error('Submit comment error:', err);
      addToast('Failed to connect to the comments gateway.', 'error');
    } finally {
      setCommenting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-36 bg-[#fbfbf9] min-h-screen">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent animate-spin rounded-full"></div>
        <p className="text-neutral-500 text-sm mt-3 font-semibold font-sans">Loading chapter view...</p>
      </div>
    );
  }

  if (!chapter) return null;

  // Split unlimited-length story contents by line breaks safely to guarantee formatting
  const paragraphs = chapter.content
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  const navigateToChapter = (id: string | null) => {
    if (id) {
      startTransition(() => {
        navigate(`/read/${id}`);
      });
    }
  };

  return (
    <div className="bg-[#fcfcf9] min-h-screen pb-24 pt-6 font-sans select-text select-all-touch">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* TOP COMPACT NAV CARD */}
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200/60 pb-4 mb-6">
          <Link
            to={`/novels/${novelSlug}`}
            className="text-xs sm:text-sm font-sans font-semibold text-neutral-500 hover:text-orange-500 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-orange-500" />
            <span>Back to {novelTitle}</span>
          </Link>

          {/* Quick counts */}
          <div className="text-[11px] font-mono font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200 px-3 py-1 rounded-lg">
            {chapter.views} Views
          </div>
        </div>

        {/* --- NARRATIVE BODY SHELF --- */}
        <article className="bg-white border border-neutral-200/50 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] px-6 py-10 sm:px-12 sm:py-14 mb-8">
          {/* Header Title */}
          <div className="text-center border-b border-neutral-100 pb-6 mb-8">
            <span className="text-xs sm:text-sm font-mono font-bold text-orange-500 uppercase tracking-widest block mb-2">
              Chapter {chapter.chapterNumber}
            </span>
            <h1 className="text-2xl sm:text-4xl font-display font-black text-neutral-800 tracking-tight leading-normal mb-3">
              {chapter.title}
            </h1>
            <p className="text-xs text-neutral-400 font-sans italic">Novel: {novelTitle}</p>
          </div>

          {/* Standard story passage parsed correctly */}
          <div className="telugu-story-content font-sans prose prose-neutral max-w-none prose-lg">
            {paragraphs.map((para, idx) => (
              <p key={idx} className="font-sans text-neutral-800 font-normal leading-relaxed text-left text-base sm:text-lg mb-6">
                {para}
              </p>
            ))}
          </div>

          {/* Core Thumbs Up interaction triggers */}
          <div className="mt-12 pt-6 border-t border-neutral-100 flex flex-wrap items-center justify-center gap-6">
            {/* Thumbs Up Likes click */}
            <button
              onClick={handleLikeToggle}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-sm font-semibold transition-all shadow-sm cursor-pointer ${
                isLiked
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-neutral-400'}`} />
              <span>Like ({likesCount})</span>
            </button>

            {/* Bookmark Click */}
            <button
              onClick={handleBookmarkToggle}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-sm font-semibold transition-all shadow-sm cursor-pointer ${
                isBookmarked
                  ? 'bg-orange-50 border-orange-200 text-orange-600'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-orange-500 text-orange-500' : 'text-neutral-400'}`} />
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
          </div>
        </article>

        {/* --- MANUAL ON-SCREEN BUTTONS PREVIOUS / NEXT --- */}
        {navInfo && (
          <div className="grid grid-cols-2 gap-4 mb-10">
            {navInfo.previousChapterId ? (
              <button
                onClick={() => navigateToChapter(navInfo.previousChapterId)}
                className="flex flex-col items-start p-4 rounded-xl border border-neutral-200 bg-white hover:bg-orange-50/20 text-left cursor-pointer transition-all shrink-0"
              >
                <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold flex items-center gap-1 mb-1">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  PREVIOUS
                </span>
                <span className="text-xs sm:text-sm font-display font-extrabold text-neutral-800 line-clamp-1">
                  {navInfo.previousChapterTitle}
                </span>
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-neutral-200 text-center flex items-center justify-center text-xs text-neutral-400 italic">
                First Chapter
              </div>
            )}

            {navInfo.nextChapterId ? (
              <button
                onClick={() => navigateToChapter(navInfo.nextChapterId)}
                className="flex flex-col items-end p-4 rounded-xl border border-neutral-200 bg-white hover:bg-orange-50/20 text-right cursor-pointer transition-all shrink-0"
              >
                <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold flex items-center gap-1 mb-1">
                  NEXT
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs sm:text-sm font-display font-extrabold text-neutral-800 line-clamp-1">
                  {navInfo.nextChapterTitle}
                </span>
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-neutral-200 text-center flex items-center justify-center text-xs text-neutral-400 italic">
                End of Published Chapters
              </div>
            )}
          </div>
        )}

        {/* --- COMMENTS SUBMIT & PREVIEW --- */}
        <section className="bg-white border border-neutral-200/80 rounded-2xl p-5 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-lg font-display font-bold text-neutral-800 tracking-tight flex items-center gap-2 border-b border-neutral-100 pb-3">
            <MessageSquare className="w-5 h-5 text-orange-500" />
            Comments ({comments.length})
          </h2>

          {/* New Comment Submission Form Box */}
          {user ? (
            <form onSubmit={handleCommentSubmit} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-neutral-800 w-8 h-8 rounded-full flex items-center justify-center text-orange-500 font-display font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-neutral-800">{user.name}</p>
                  <p className="text-neutral-400">Share your thoughts</p>
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Write your comment about this chapter here..."
                  className="w-full text-sm font-sans p-3.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-neutral-50/20 resize-none"
                />
              </div>

              <div className="flex justify-between items-center bg-orange-50/50 rounded-xl p-3 border border-orange-500/10">
                <p className="text-[11px] text-orange-700 font-sans flex items-center gap-1 leading-normal">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  Submitted comments will appear publicly after admin approval.
                </p>
                <button
                  type="submit"
                  disabled={commenting}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-lg transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-1 shadow shrink-0"
                >
                  {commenting ? 'Submitting...' : 'Comment'}
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200/50 text-center text-sm text-neutral-600 leading-relaxed font-sans">
              Please{' '}
              <Link to="/login" className="text-orange-500 font-extrabold hover:underline">
                login to participate and place comments
              </Link>
              .
            </div>
          )}

          {/* Comments List Container */}
          {comments.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400 italic bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
              Be the first to share a comment on this chapter!
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {comments.map((comm) => (
                <div key={comm._id} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex gap-3 animate-fade-in">
                  <div className="bg-orange-500 text-white w-9 h-9 rounded-full flex items-center justify-center font-display font-extrabold text-sm shrink-0 shadow-sm shadow-orange-500/10">
                    {comm.user ? comm.user.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs sm:text-sm font-semibold text-neutral-800">
                        {comm.user ? comm.user.name : 'Unknown Reader'}
                      </p>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {new Date(comm.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-sans font-normal whitespace-pre-line">
                      {comm.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* --- STICKY MOBILE NAVIGATION CONTROLS FOOTER --- */}
      {navInfo && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-neutral-900/95 border-t border-neutral-800 shadow-2xl px-4 py-3.5 flex items-center justify-between gap-4 backdrop-blur-md">
          {navInfo.previousChapterId ? (
            <button
              onClick={() => navigateToChapter(navInfo.previousChapterId)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-200 hover:text-white transition-all text-xs font-semibold shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-orange-500" />
              <span>Previous ({navInfo.previousChapterTitle?.split(':')[0]?.replace('Chapter ', '')})</span>
            </button>
          ) : (
            <span className="text-[10px] text-neutral-500 italic">First Chapter</span>
          )}

          {/* Central bookmark shortcut on floating bar */}
          <button
            onClick={handleBookmarkToggle}
            className={`p-2 rounded-full border transition-all ${
              isBookmarked ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-neutral-800 border-neutral-700 text-neutral-400'
            }`}
            title="Bookmark"
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>

          {navInfo.nextChapterId ? (
            <button
              onClick={() => navigateToChapter(navInfo.nextChapterId)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-all text-xs font-semibold shrink-0"
            >
              <span>Next ({navInfo.nextChapterTitle?.split(':')[0]?.replace('Chapter ', '')})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-[10px] text-neutral-500 italic">Last Chapter</span>
          )}
        </div>
      )}

    </div>
  );
};
