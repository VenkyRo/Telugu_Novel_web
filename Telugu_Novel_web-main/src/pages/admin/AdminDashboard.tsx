/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, BookOpen, Clock, Users, Eye, Heart, Bookmark, MessageSquare, AlertCircle, CheckCircle, Trash2, ArrowRight } from 'lucide-react';
import { AnalyticsSummary } from '../../types';

interface AdminDashboardProps {
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ addToast }) => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [recentNovels, setRecentNovels] = useState<any[]>([]);
  const [recentChapters, setRecentChapters] = useState<any[]>([]);
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentNovels(data.recentNovels || []);
        setRecentChapters(data.recentChapters || []);
        setRecentComments(data.recentComments || []);
        setRecentUsers(data.recentUsers || []);
      } else {
        addToast(data.message || 'Error loading executive dashboard statistics.', 'error');
        navigate('/');
      }
    } catch (err) {
      console.error('Fetch admin stats error:', err);
      addToast('Core server metrics query timed out.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [token, navigate, addToast]);

  // Approve a pending comment directly from the quick overview dashboard
  const handleQuickApproveComment = async (commentId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/comments/${commentId}/approve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        addToast('Comment approved successfully!', 'success');
        // Refresh values
        fetchDashboardStats();
      } else {
        addToast(data.message || 'Approve error.', 'error');
      }
    } catch (err) {
      console.error('Approve comment error:', err);
    }
  };

  // Delete/Reject a pending comment directly from the quick overview dashboard
  const handleQuickDeleteComment = async (commentId: string) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        addToast('Comment deleted successfully.', 'success');
        fetchDashboardStats();
      } else {
        addToast(data.message || 'Reject error.', 'error');
      }
    } catch (err) {
      console.error('Reject comment error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-36 bg-neutral-955 min-h-screen">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent animate-spin rounded-full"></div>
        <p className="text-neutral-400 text-sm mt-3.5 font-semibold font-mono">LOADING GOVERNANCE METRICS...</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 text-neutral-100 min-h-screen py-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
        
        {/* WELCOME BANNER HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-950/40 p-6 rounded-2xl border border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6.5 h-6.5 text-[#f97316]" />
              <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white">
                Admin Governance Dashboard
              </h1>
            </div>
            <p className="text-neutral-400 text-xs sm:text-sm font-sans mt-1">
              Centralized governance platform for catalog monitoring, chapters control, and comments moderation.
            </p>
          </div>

          <div className="text-xs font-mono font-bold bg-orange-600/10 text-orange-400 border border-orange-500/20 px-3.5 py-2.5 rounded-xl">
            Logged In as Administrative Author: {user?.name}
          </div>
        </div>

        {/* --- STATISTICAL ANALYTICS CARD GRID --- */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* CARD 1: NOVELS CATALOG */}
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs font-mono font-bold uppercase text-neutral-400 tracking-wider">Total Novels</span>
                <span className="p-2 bg-blue-500/10 rounded-xl text-blue-400 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </span>
              </div>
              <div>
                <p className="text-3xl font-mono font-bold tracking-tight text-white mb-2">{stats.totalNovels}</p>
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 font-bold border-t border-neutral-950 pt-2 shrink-0">
                  <span className="text-emerald-400">{stats.publishedNovels} Published</span>
                  <span className="text-orange-400">{stats.draftNovels} Drafts</span>
                </div>
              </div>
            </div>

            {/* CARD 2: CHAPTERS DATA */}
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs font-mono font-bold uppercase text-neutral-400 tracking-wider">Total Chapters</span>
                <span className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </span>
              </div>
              <div>
                <p className="text-3xl font-mono font-bold tracking-tight text-white mb-2">{stats.totalChapters}</p>
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 font-bold border-t border-neutral-950 pt-2 shrink-0">
                  <span className="text-emerald-400">{stats.publishedChapters} Published</span>
                  <span className="text-orange-400">{stats.draftChapters} Drafts</span>
                </div>
              </div>
            </div>

            {/* CARD 3: USERS SYSTEM */}
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs font-mono font-bold uppercase text-neutral-400 tracking-wider">Registered Readers</span>
                <span className="p-2 bg-amber-500/10 rounded-xl text-amber-400 shrink-0">
                  <Users className="w-5 h-5" />
                </span>
              </div>
              <div>
                <p className="text-3xl font-mono font-bold tracking-tight text-white mb-2">{stats.totalRegisteredUsers}</p>
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 font-bold border-t border-neutral-950 pt-2 shrink-0">
                  <span className="text-emerald-400">Active Readers</span>
                  <span className="text-rose-400">{stats.totalBannedUsers} Banned</span>
                </div>
              </div>
            </div>

            {/* CARD 4: GLOBAL READERSHIP */}
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs font-mono font-bold uppercase text-neutral-400 tracking-wider">Readership Report</span>
                <span className="p-2 bg-purple-500/10 rounded-xl text-purple-400 shrink-0">
                  <Eye className="w-5 h-5" />
                </span>
              </div>
              <div>
                <p className="text-3xl font-mono font-bold tracking-tight text-white mb-2">{stats.totalChapterViews}</p>
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 font-bold border-t border-neutral-950 pt-2 shrink-0">
                  <span className="text-rose-400 flex items-center gap-0.5"><Heart className="w-3 h-3 fill-current" /> {stats.totalLikes} Likes</span>
                  <span className="text-orange-400 flex items-center gap-0.5"><Bookmark className="w-3 h-3 fill-current" /> {stats.totalBookmarks} Saves</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* --- DYNAMIC UTILITY MANAGER QUICK CHANNELS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Link to="/admin/novels" className="p-5 rounded-2xl border border-neutral-800 bg-neutral-950/40 hover:bg-neutral-950/80 transition-all flex items-center justify-between shrink-0">
            <div className="space-y-1">
              <p className="font-display font-bold text-[#f97316] text-sm">Manage Novels</p>
              <p className="text-xs text-neutral-400">Manage Novels Catalogue ({stats?.totalNovels})</p>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-400" />
          </Link>

          <Link to="/admin/users" className="p-5 rounded-2xl border border-neutral-800 bg-neutral-950/40 hover:bg-neutral-950/80 transition-all flex items-center justify-between shrink-0">
            <div className="space-y-1">
              <p className="font-display font-bold text-[#f97316] text-sm">Moderate Readers</p>
              <p className="text-xs text-neutral-400">Review & Administer Readers Directory</p>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-400" />
          </Link>

          <Link to="/admin/comments" className="p-5 rounded-2xl border border-neutral-800 bg-neutral-950/40 hover:bg-neutral-950/80 transition-all flex items-center justify-between shrink-0">
            <div className="space-y-1">
              <p className="font-display font-bold text-[#f97316] text-sm">Comment Moderation</p>
              <p className="text-xs text-neutral-400">Moderate Pending Comments ({stats?.pendingComments})</p>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-400" />
          </Link>
        </div>

        {/* --- REVIEW QUEUES PANEL LAYOUTS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT COLUMN: PENDING COMMENTS REVIEW QUEUE */}
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-3.5">
              <h3 className="font-display font-bold text-base sm:text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-500" />
                Pending Comments ({stats?.pendingComments || 0})
              </h3>
              <Link to="/admin/comments" className="text-xs font-mono font-bold text-[#f97316] hover:underline">
                View All Queue
              </Link>
            </div>

            {recentComments.length === 0 ? (
              <p className="text-xs text-neutral-500 italic py-6 text-center">
                No pending comments. Everything is clear!
              </p>
            ) : (
              <div className="space-y-4">
                {recentComments.map((comment) => (
                  <div key={comment._id} className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-4 text-xs">
                        <span className="font-bold text-neutral-200">{comment.userName}</span>
                        <span className="font-mono text-[10px] text-neutral-500">
                          {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-neutral-400">
                        Novel: {comment.novelTitle} • Chapter {comment.chapterNumber}
                      </p>
                      <p className="text-xs pt-1.5 text-neutral-300 line-clamp-2">
                        "{comment.content}"
                      </p>
                    </div>

                    <div className="flex gap-2 justify-end self-stretch border-t border-neutral-800/60 pt-2 shrink-0">
                      <button
                        onClick={() => handleQuickApproveComment(comment._id)}
                        className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] rounded-lg cursor-pointer transition-colors shrink-0"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleQuickDeleteComment(comment._id)}
                        className="flex items-center gap-1 px-3 py-1 bg-rose-600/15 hover:bg-rose-600 text-rose-400 hover:text-white font-semibold text-[10px] rounded-lg cursor-pointer transition-colors shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: RECENTLY REGISTERED USERS QUEUE */}
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-3.5">
              <h3 className="font-display font-bold text-base sm:text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                Recent Reader Registrations
              </h3>
              <Link to="/admin/users" className="text-xs font-mono font-bold text-[#f97316] hover:underline">
                Manage Users
              </Link>
            </div>

            {recentUsers.length === 0 ? (
              <p className="text-xs text-neutral-500 italic py-6 text-center">
                No readers have registered yet.
              </p>
            ) : (
              <div className="divide-y divide-neutral-800/80">
                {recentUsers.map((user) => (
                  <div key={user._id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-bold text-neutral-200">{user.name}</p>
                      <p className="text-[11px] font-mono text-neutral-500">{user.email}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-mono text-neutral-500">
                        {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {user.isBanned ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-950/50 text-rose-400 border border-rose-900/30">
                          Banned
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#f97316]/10 text-orange-400 border border-orange-500/20">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
