/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlignLeft, Plus, Pencil, Trash2, ArrowLeft, ToggleLeft, ToggleRight, Eye } from 'lucide-react';
import { Chapter } from '../../types';

interface AdminChaptersProps {
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminChapters: React.FC<AdminChaptersProps> = ({ addToast }) => {
  const { novelId } = useParams<{ novelId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  // Panels view routing: 'list' | 'create' | 'edit'
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');

  // Novel & Chapter Collections states
  const [novelTitle, setNovelTitle] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  // Form entries inputs states
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const fetchNovelChapters = async () => {
    if (!token || !novelId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/novels/${novelId}/chapters`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setChapters(data.chapters || []);
        setNovelTitle(data.novelTitle);

        // Autofill default incrementing chapter number for next creations
        if (data.chapters && data.chapters.length > 0) {
          const maxNum = Math.max(...data.chapters.map((c: any) => c.chapterNumber), 0);
          setChapterNumber(maxNum + 1);
        } else {
          setChapterNumber(1);
        }
      } else {
        addToast(data.message || 'Error loading chapters metadata.', 'error');
        navigate('/admin/novels');
      }
    } catch (err) {
      console.error('Fetch chapters admin error:', err);
      addToast('Cannot load chapters list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNovelChapters();
  }, [novelId, token]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      addToast('Please enter the chapter title and story content.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/novels/${novelId}/chapters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          chapterNumber,
          content: content.trim(),
          publishStatus: isPublished ? 'PUBLISHED' : 'DRAFT'
        })
      });
      const data = await res.json();

      if (data.success) {
        addToast('New chapter published successfully!', 'success');
        resetForm();
        fetchNovelChapters();
        setView('list');
      } else {
        addToast(data.message || 'Failed to publish chapter.', 'error');
      }
    } catch (err) {
      console.error('Create chapter error:', err);
    }
  };

  const handleEditInit = (chap: Chapter) => {
    setActiveChapterId(chap._id);
    setTitle(chap.title);
    setChapterNumber(chap.chapterNumber);
    setContent(chap.content);
    setIsPublished(chap.publishStatus === 'PUBLISHED');
    setView('edit');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChapterId) return;

    if (!title.trim() || !content.trim()) {
      addToast('All fields are required.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/chapters/${activeChapterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          chapterNumber,
          content: content.trim(),
          publishStatus: isPublished ? 'PUBLISHED' : 'DRAFT'
        })
      });
      const data = await res.json();

      if (data.success) {
        addToast('Chapter updated successfully!', 'success');
        resetForm();
        fetchNovelChapters();
        setView('list');
      } else {
        addToast(data.message || 'Error updating chapter.', 'error');
      }
    } catch (err) {
      console.error('Update chapters call failed:', err);
    }
  };

  const handleDeleteChapter = async (chapId: string, chapTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${chapTitle}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/chapters/${chapId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        addToast('Chapter deleted successfully!', 'success');
        setChapters(chapters.filter(c => c._id !== chapId));
      } else {
        addToast(data.message || 'Delete error.', 'error');
      }
    } catch (err) {
      console.error('Delete chapter error:', err);
    }
  };

  const handlePublishToggle = async (chap: Chapter) => {
    try {
      const isCurrentlyPublished = chap.publishStatus === 'PUBLISHED';
      const targetState = !isCurrentlyPublished;
      const res = await fetch(`/api/admin/chapters/${chap._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...chap,
          publishStatus: targetState ? 'PUBLISHED' : 'DRAFT'
        })
      });
      const data = await res.json();

      if (data.success) {
        setChapters(chapters.map(c => c._id === chap._id ? { ...c, publishStatus: targetState ? 'PUBLISHED' : 'DRAFT' } : c));
        addToast(targetState ? 'Chapter published successfully!' : 'Chapter saved as draft successfully.', 'success');
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const resetForm = () => {
    setActiveChapterId(null);
    setTitle('');
    setContent('');
    setIsPublished(true);
    // Recalculate default count
    const maxNum = Math.max(...chapters.map(c => c.chapterNumber), 0);
    setChapterNumber(maxNum + 1);
  };

  return (
    <div className="bg-neutral-900 text-neutral-100 min-h-screen py-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* CHAPTER BOARD BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-950/40 p-5 rounded-2xl border border-neutral-800">
          <div className="flex items-center gap-2.5">
            <AlignLeft className="w-6.5 h-6.5 text-[#f97316] shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-black text-white line-clamp-1">
                {novelTitle} — Chapters Management
              </h1>
              <p className="text-xs text-neutral-400 mt-0.5 font-sans">Total chapters: {chapters.length}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              to="/admin/novels"
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold border border-neutral-700/60 transition-all shadow shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Novels List
            </Link>

            {view === 'list' ? (
              <button
                onClick={() => { resetForm(); setView('create'); }}
                className="flex items-center gap-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                Compile New Chapter
              </button>
            ) : (
              <button
                onClick={() => setView('list')}
                className="flex items-center gap-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold border border-neutral-700/60 transition-all shadow shrink-0"
              >
                <AlignLeft className="w-4 h-4" />
                Chapter List
              </button>
            )}
          </div>
        </div>

        {/* --- VIEW 1: CHAPTERS DIRECTORY GRID/TABLE --- */}
        {view === 'list' && (
          loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent animate-spin rounded-full"></div>
              <p className="text-neutral-500 text-xs mt-3.5 font-medium">Loading chapters...</p>
            </div>
          ) : chapters.length === 0 ? (
            <div className="p-16 text-center bg-neutral-950/60 border border-neutral-800 rounded-2xl max-w-sm mx-auto text-neutral-500 flex flex-col items-center justify-center space-y-4">
              <AlignLeft className="w-12 h-12 text-neutral-500" />
              <p className="text-base font-bold text-neutral-300">No chapters found</p>
              <p className="text-xs text-neutral-500 text-center leading-relaxed font-sans">There are no published chapters in this novel yet. Write your first chapter now!</p>
              <button
                onClick={() => setView('create')}
                className="px-4 py-2 bg-orange-500 text-white font-semibold text-xs rounded-xl transition-all hover:bg-orange-600"
              >
                Write First Chapter
              </button>
            </div>
          ) : (
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-950/90 border-b border-neutral-800 text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                      <th className="p-4 sm:p-5">Chapter Number</th>
                      <th className="p-4 sm:p-5">Chapter Title</th>
                      <th className="p-4 sm:p-5">Views</th>
                      <th className="p-4 sm:p-5">Publish Status</th>
                      <th className="p-4 sm:p-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80 text-sm">
                    {chapters
                      .sort((a, b) => a.chapterNumber - b.chapterNumber)
                      .map((chap) => (
                        <tr key={chap._id} className="hover:bg-neutral-900/30 transition-colors">
                          <td className="p-4 font-mono font-bold text-neutral-400">
                            Chapter {chap.chapterNumber}
                          </td>

                          <td className="p-4 font-sans font-bold text-neutral-100 max-w-sm truncate" title={chap.title}>
                            {chap.title}
                          </td>

                          <td className="p-4 font-mono text-xs text-neutral-400">
                            <span className="flex items-center gap-1"><Eye className="w-4 h-4 text-neutral-500" /> {chap.views || 0} Views</span>
                          </td>

                          {/* Instant Draft Toggle */}
                          <td className="p-4">
                            <button
                              onClick={() => handlePublishToggle(chap)}
                              className="flex items-center gap-1.5 focus:outline-none cursor-pointer text-xs"
                              title="Click to toggle draft/published"
                            >
                              {chap.publishStatus === 'PUBLISHED' ? (
                                <>
                                  <ToggleRight className="w-7 h-7 text-emerald-500 shrink-0" />
                                  <span className="font-mono text-[9px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-950/50 border border-emerald-900/30 px-1.5 py-0.5 rounded">Published</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-7 h-7 text-neutral-500 shrink-0" />
                                  <span className="font-mono text-[9px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-800 border border-neutral-700/60 px-1.5 py-0.5 rounded">Draft</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="p-4 text-center shrink-0">
                            <div className="flex items-center justify-center gap-3">
                              {/* Read Chapter preview */}
                              {chap.publishStatus === 'PUBLISHED' && (
                                <Link
                                  to={`/read/${chap._id}`}
                                  className="text-xs text-orange-400 hover:underline shrink-0"
                                  title="View Preview"
                                >
                                  Preview
                                </Link>
                              )}

                              {/* Edit details trigger */}
                              <button
                                onClick={() => handleEditInit(chap)}
                                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-orange-400 cursor-pointer shrink-0"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Action */}
                              <button
                                onClick={() => handleDeleteChapter(chap._id, chap.title)}
                                className="p-2 rounded-lg bg-neutral-800 hover:bg-rose-500/15 text-neutral-400 hover:text-rose-400 cursor-pointer shrink-0"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* --- VIEW 2 & 3: NEW CHAPTER FORM / CHAPTER TEXT EDITOR --- */}
        {(view === 'create' || view === 'edit') && (
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto shadow-xl animate-fade-in-up">
            <h2 className="text-lg sm:text-xl font-display font-black text-[#f97316] mb-6 flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Plus className="w-5 h-5 shrink-0" />
              {view === 'create' ? 'Create Chapter' : 'Edit Chapter'}
            </h2>

            <form onSubmit={view === 'create' ? handleCreateSubmit : handleEditSubmit} className="space-y-6 text-sm">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Chapter Number */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Chapter Number *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(parseInt(e.target.value) || 1)}
                    className="w-full font-mono p-3 border border-neutral-700 bg-neutral-900 rounded-xl focus:outline-none text-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                </div>

                {/* Chapter Title */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Chapter Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Chapter Title..."
                    className="w-full font-sans p-3 border border-neutral-700 bg-neutral-900 rounded-xl focus:outline-none text-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Publish switcher options */}
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-neutral-200 font-sans">Publish immediately? (Publish Status)</h4>
                  <p className="text-xs text-neutral-400">If published, this chapter will be immediately viewable by readers. If saved as draft, it will only be visible to administrators.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublished(!isPublished)}
                  className="focus:outline-none cursor-pointer"
                >
                  {isPublished ? (
                    <ToggleRight className="w-8 h-8 text-emerald-500 shrink-0" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-neutral-600 shrink-0" />
                  )}
                </button>
              </div>

              {/* BIG story text editor area */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Chapter Content (Rich Story Text) *
                </label>
                <p className="text-[11px] text-neutral-400 mb-2 leading-relaxed">
                  Paragraph formatting, line breaks, and whitespace are faithfully preserved. Press Enter for new paragraphs.
                </p>
                <textarea
                  required
                  rows={15}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write or paste your story chapter content here..."
                  className="w-full font-sans p-4 border border-neutral-700 bg-neutral-900 rounded-2xl focus:outline-none text-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-y leading-relaxed font-normal text-base text-neutral-100"
                />
              </div>

              {/* Form submit/cancel hooks */}
              <div className="flex gap-3 justify-end pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => { resetForm(); setView('list'); }}
                  className="px-4 py-2.5 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold border border-neutral-700/60 transition-colors cursor-pointer shrink-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#f97316] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                  {view === 'create' ? 'Publish Chapter' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
};
