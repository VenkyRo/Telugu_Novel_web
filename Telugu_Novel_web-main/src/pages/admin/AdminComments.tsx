/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Check, Trash2, ArrowLeft, Layers } from 'lucide-react';
import { Comment } from '../../types';

interface AdminCommentsProps {
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminComments: React.FC<AdminCommentsProps> = ({ addToast }) => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [comments, setComments] = useState<Comment[]>([]);
  // Queue Filters: 'PENDING' | 'APPROVED'
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED'>('PENDING');
  const [loading, setLoading] = useState(true);

  const fetchCommentsQueue = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/comments?status=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.comments) {
        setComments(data.comments);
      } else {
        addToast(data.message || 'Error loading comments review stack.', 'error');
      }
    } catch (err) {
      console.error('Fetch comments error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommentsQueue();
  }, [token, filter]);

  const handleApproveComment = async (commentId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/comments/${commentId}/approve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        addToast('Comment approved successfully!', 'success');
        // Delete from local queue view
        setComments(comments.filter(c => c._id !== commentId));
      } else {
        addToast(data.message || 'Error approving comment.', 'error');
      }
    } catch (err) {
      console.error('Approve error:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to permanently delete this comment?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        addToast('Comment deleted successfully.', 'success');
        setComments(comments.filter(c => c._id !== commentId));
      } else {
        addToast(data.message || 'Error deleting comment.', 'error');
      }
    } catch (err) {
      console.error('Delete comment error:', err);
    }
  };

  return (
    <div className="bg-neutral-900 text-neutral-100 min-h-screen py-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 animate-fade-in">
        
        {/* TOP BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-950/40 p-5 rounded-2xl border border-neutral-800">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-6.5 h-6.5 text-[#f97316] shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-black text-white">
                Comment Moderation Hub
              </h1>
              <p className="text-xs text-neutral-400 mt-0.5">Approve, moderate, or reject comments across all chapters and novels.</p>
            </div>
          </div>

          <Link
            to="/admin/dashboard"
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold border border-neutral-700/60 transition-all shadow shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* CONTROLS FILTERS */}
        <div className="flex gap-2 border-b border-neutral-850 pb-1">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-4.5 py-2.5 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer border ${
              filter === 'PENDING'
                ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10'
                : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-400 border-transparent'
            }`}
          >
            Pending Reviews Queue
          </button>
          
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-4.5 py-2.5 rounded-xl font-sans text-xs font-bold transition-all cursor-pointer border ${
              filter === 'APPROVED'
                ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10'
                : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-400 border-transparent'
            }`}
          >
            Approved Archive
          </button>
        </div>

        {/* --- COMMENTS RECORDS COMPILATION --- */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent animate-spin rounded-full"></div>
            <p className="text-neutral-500 text-xs mt-3.5 font-medium">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="p-16 text-center bg-neutral-950/60 border border-neutral-800 rounded-2xl max-w-sm mx-auto text-neutral-500 flex flex-col items-center justify-center space-y-3">
            <Layers className="w-10 h-10 text-neutral-600" />
            <p className="text-base font-bold text-neutral-300">No comments found</p>
            <p className="text-xs text-neutral-500">There are no comment records in the selected status queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {comments.map((comm) => (
              <div
                key={comm._id}
                className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-5 shadow flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Row meta */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-neutral-200">{comm.user ? comm.user.name : 'Unknown Reader'}</p>
                      <p className="text-[10px] font-mono text-neutral-500">{comm.user ? comm.user.email : 'No email logged'}</p>
                    </div>

                    <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                      {new Date(comm.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Novel Context */}
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-850 text-xs text-neutral-400 space-y-0.5">
                    <p className="font-semibold text-neutral-300">
                      Novel: {comm.novel ? comm.novel.title : 'Deleted Novel'}
                    </p>
                    <p className="text-[10px] text-[#f97316]">
                      Chapter {comm.chapter ? comm.chapter.chapterNumber : '?'} — {comm.chapter ? comm.chapter.title : 'Deleted Chapter'}
                    </p>
                  </div>

                  {/* Comment text */}
                  <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans whitespace-pre-line bg-neutral-900/10 p-3 rounded-lg border border-neutral-850/50">
                    "{comm.content}"
                  </p>
                </div>

                {/* Approve/delete buttons */}
                <div className="flex gap-2 justify-end self-stretch border-t border-neutral-800/80 pt-3 shrink-0">
                  {comm.status === 'PENDING' && (
                    <button
                      onClick={() => handleApproveComment(comm._id)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteComment(comm._id)}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600/15 hover:bg-rose-600 text-rose-400 hover:text-white font-semibold text-xs border border-transparent transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
