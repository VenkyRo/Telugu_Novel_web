/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Bookmark as BookmarkIcon, Mail, Calendar, Trash2, BookOpen, LogOut, ShieldAlert } from 'lucide-react';

interface ProfileProps {
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const Profile: React.FC<ProfileProps> = ({ addToast }) => {
  const { user, token, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/bookmarks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.bookmarks) {
        setBookmarks(data.bookmarks);
      } else {
        addToast('Failed to load bookmarks list.', 'error');
      }
    } catch (err) {
      console.error('Fetch profile bookmarks error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      addToast('Please log in first to view your profile.', 'info');
      navigate('/login');
      return;
    }
    fetchBookmarks();
  }, [token, navigate, addToast]);

  const handleDeleteBookmark = async (e: React.MouseEvent, chapterId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return;

    try {
      const res = await fetch(`/api/bookmarks/${chapterId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        addToast('Bookmark removed successfully!', 'success');
        // Update local state listing
        setBookmarks(bookmarks.filter(b => b.chapter._id !== chapterId));
      } else {
        addToast(data.message || 'Bookmark removal error.', 'error');
      }
    } catch (err) {
      console.error('Remove bookmark error:', err);
      addToast('Bookmark delete action failed.', 'error');
    }
  };

  const handleLogoutClick = () => {
    logout();
    addToast('Logged out successfully.', 'success');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="bg-neutral-50 min-h-screen py-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* --- PROFILE SUMMARY CARD --- */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-sm mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-orange-500 text-white w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-display font-black text-xl sm:text-2xl shadow-md shadow-orange-500/15 shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-1">
                <div className="flex items-center flex-wrap gap-2 text-neutral-800">
                  <h1 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight">
                    {user.name}
                  </h1>
                  {isAdmin && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest bg-orange-600/10 text-orange-600 border border-orange-500/20">
                      ADMIN
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs sm:text-sm font-sans text-neutral-500">
                  <p className="flex items-center gap-1.5 leading-normal">
                    <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>{user.email}</span>
                  </p>
                  <p className="flex items-center gap-1.5 leading-normal">
                    <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>Member Since: {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Panel Buttons */}
            <div className="flex flex-wrap gap-3 w-full md:w-auto self-stretch md:self-auto pt-3 md:pt-0 border-t border-neutral-100 md:border-t-0 justify-end">
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-neutral-800 hover:text-white bg-neutral-100 hover:bg-neutral-900 font-mono font-bold text-xs border border-neutral-200 transition-all shadow-sm"
                >
                  <ShieldAlert className="w-4 h-4 text-orange-500" />
                  GO TO ADMIN PANEL
                </Link>
              )}

              <button
                onClick={handleLogoutClick}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-semibold text-xs cursor-pointer transition-all shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>
        </div>

        {/* --- BOOKMARKS CATALOG SECTION --- */}
        <section className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl font-display font-extrabold text-neutral-800 tracking-tight flex items-center gap-2 border-b border-neutral-100 pb-4 mb-6">
            <BookmarkIcon className="w-5.5 h-5.5 text-orange-500" />
            Saved Bookmarks ({bookmarks.length})
          </h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent animate-spin rounded-full"></div>
              <p className="text-neutral-500 text-xs mt-3.5 font-medium">Loading bookmarks...</p>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-16 px-6 bg-neutral-50 border border-neutral-200 rounded-xl leading-relaxed max-w-md mx-auto">
              <BookOpen className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-800 font-bold text-sm">No Bookmarks Found</p>
              <p className="text-neutral-400 text-xs mt-1.5">Bookmark your favorite novel chapters while reading, and they will appear here.</p>
              <Link
                to="/novels"
                className="inline-block mt-5 px-4.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                Browse Novels
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {bookmarks.map((bookmark) => (
                <Link
                  key={bookmark._id}
                  to={`/read/${bookmark.chapter._id}`}
                  className="group bg-white rounded-xl border border-neutral-200/90 shadow-sm hover:shadow hover:border-orange-500/25 transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-4 flex gap-4">
                    {/* Cover element */}
                    <div className="w-16 h-20 bg-neutral-100 rounded-lg overflow-hidden shrink-0 shadow-sm">
                      <img
                        src={bookmark.novel.coverImageUrl}
                        alt={bookmark.novel.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                    {/* Chapter details */}
                    <div className="space-y-1 pr-1 flex-1">
                      <p className="text-[10px] uppercase font-mono font-bold text-orange-500 block">
                        {bookmark.novel.category} • Chapter {bookmark.chapter.chapterNumber}
                      </p>
                      <h4 className="font-display font-bold text-sm text-neutral-800 line-clamp-1 group-hover:text-orange-500 transition-colors leading-tight">
                        {bookmark.chapter.title}
                      </h4>
                      <p className="text-[11px] text-neutral-400 font-sans line-clamp-1 leading-normal">
                        Novel: {bookmark.novel.title}
                      </p>
                    </div>
                  </div>

                  {/* Bookmark bottom action pane */}
                  <div className="bg-neutral-50 px-4 py-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] shrink-0 font-medium">
                    <span className="text-neutral-400 font-sans">
                      Saved on: {new Date(bookmark.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>

                    <button
                      onClick={(e) => handleDeleteBookmark(e, bookmark.chapter._id)}
                      className="text-rose-500 hover:text-rose-700/90 flex items-center gap-1 font-bold transition-all hover:bg-rose-50 px-2 py-1 rounded"
                      title="Remove bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
