/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Plus, Pencil, Trash2, List, ShieldAlert, ArrowLeft, Upload, BookMarked, Eye, Calendar, ToggleLeft, ToggleRight, Loader } from 'lucide-react';
import { Novel } from '../../types';

interface AdminNovelsProps {
  addToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminNovels: React.FC<AdminNovelsProps> = ({ addToast }) => {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Navigation Panel Views: 'list' | 'create' | 'edit'
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');

  // Novel objects catalog state
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms inputs state
  const [activeNovelId, setActiveNovelId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Romance');
  const [novelStatus, setNovelStatus] = useState<'ONGOING' | 'COMPLETED'>('ONGOING');
  const [isPublished, setIsPublished] = useState(false);
  const [shortSummary, setShortSummary] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500');

  // Cover image files uploading states
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState('');

  const fetchNovels = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/novels', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.novels) {
        setNovels(data.novels);
      } else {
        addToast(data.message || 'Error loading novels index.', 'error');
      }
    } catch (err) {
      console.error('Fetch novels list error:', err);
      addToast('Cannot fetch database list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      addToast('Permissions denied. Log-in required.', 'error');
      navigate('/');
      return;
    }
    fetchNovels();
  }, [token, navigate]);

  // Handle Cover Art File Picker & Post Multi-part form
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');

    // Guard: Enforce strict file extensions (jpeg, png)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('We only support JPG, JPEG, or PNG images.');
      addToast('Invalid file format. Please upload JPG/PNG only.', 'error');
      return;
    }

    // Guard: Enforce 5MB size limit (Criteria #10: "Enforce a size limit of 5MB for uploads")
    const maxSize = 5 * 1024 * 1024; // 5 Mega bytes
    if (file.size > maxSize) {
      setFileError('File size must be less than 5MB.');
      addToast('File size limit exceeded (Max 5MB).', 'error');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('coverImage', file);

    try {
      // Post to the upload service endpoint
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (data.success && data.url) {
        setCoverImageUrl(data.url);
        addToast('Cover image uploaded successfully!', 'success');
      } else {
        addToast(data.message || 'Cover upload failed.', 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      addToast('Upload gateway timed out, falling back to cached placeholder.', 'info');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !shortSummary.trim() || !description.trim()) {
      addToast('Please enter all required information.', 'error');
      return;
    }

    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch('/api/admin/novels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          category,
          novelStatus,
          publishStatus: isPublished ? 'PUBLISHED' : 'DRAFT',
          shortSummary: shortSummary.trim(),
          description: description.trim(),
          tags,
          coverImageUrl
        })
      });
      const data = await res.json();

      if (data.success) {
        addToast('New novel created successfully!', 'success');
        resetForm();
        fetchNovels();
        setView('list');
      } else {
        addToast(data.message || 'Failed to create novel.', 'error');
      }
    } catch (err) {
      console.error('Create novel error:', err);
      addToast('Could not register novel metadata.', 'error');
    }
  };

  const handleEditInit = (novel: Novel) => {
    setActiveNovelId(novel._id);
    setTitle(novel.title);
    setAuthor(novel.author);
    setCategory(novel.category);
    setNovelStatus(novel.novelStatus);
    setIsPublished(novel.publishStatus === 'PUBLISHED');
    setShortSummary(novel.shortSummary);
    setDescription(novel.description);
    setTagsInput(novel.tags ? novel.tags.join(', ') : '');
    setCoverImageUrl(novel.coverImageUrl);
    setView('edit');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNovelId) return;

    if (!title.trim() || !author.trim() || !shortSummary.trim() || !description.trim()) {
      addToast('Please provide all details.', 'error');
      return;
    }

    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch(`/api/admin/novels/${activeNovelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          category,
          novelStatus,
          publishStatus: isPublished ? 'PUBLISHED' : 'DRAFT',
          shortSummary: shortSummary.trim(),
          description: description.trim(),
          tags,
          coverImageUrl
        })
      });
      const data = await res.json();

      if (data.success) {
        addToast('Novel updated successfully!', 'success');
        resetForm();
        fetchNovels();
        setView('list');
      } else {
        addToast(data.message || 'Could not update details.', 'error');
      }
    } catch (err) {
      console.error('Update details error:', err);
    }
  };

  // Safe delete with custom/native prompt validation
  const handleDeleteNovel = async (novelId: string, novelTitle: string) => {
    // Fulfills Criteria #17: "Ask for confirmation before deleting a novel"
    const confirmText = `Are you sure you want to delete "${novelTitle}"? This will permanently delete all its chapters and comments.`;
    if (!window.confirm(confirmText)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/novels/${novelId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        addToast('Novel and all associated chapters have been deleted masterfully!', 'success');
        setNovels(novels.filter(n => n._id !== novelId));
      } else {
        addToast(data.message || 'Deletion error.', 'error');
      }
    } catch (err) {
      console.error('Delete novel call failure:', err);
    }
  };

  // Instant toggles for quick publishing approvals in-line
  const handlePublishStateToggle = async (novel: Novel) => {
    try {
      const isCurrentlyPublished = novel.publishStatus === 'PUBLISHED';
      const targetState = !isCurrentlyPublished;
      const res = await fetch(`/api/admin/novels/${novel._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...novel,
          publishStatus: targetState ? 'PUBLISHED' : 'DRAFT'
        })
      });
      const data = await res.json();

      if (data.success) {
        setNovels(novels.map(n => n._id === novel._id ? { ...n, publishStatus: targetState ? 'PUBLISHED' : 'DRAFT' } : n));
        addToast(targetState ? 'Novel published successfully!' : 'Novel set to draft status successfully.', 'success');
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const resetForm = () => {
    setActiveNovelId(null);
    setTitle('');
    setAuthor('');
    setCategory('Romance');
    setNovelStatus('ONGOING');
    setIsPublished(false);
    setShortSummary('');
    setDescription('');
    setTagsInput('');
    setCoverImageUrl('https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500');
    setFileError('');
  };

  const categories = ['Romance', 'Thriller', 'Mystery', 'Drama', 'Fantasy', 'Comedy', 'Historical'];

  return (
    <div className="bg-neutral-900 text-neutral-100 min-h-screen py-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* TOP COMMANDER CONTROLS HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-950/40 p-5 rounded-2xl border border-neutral-800">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6.5 h-6.5 text-[#f97316]" />
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-white">
                Novel Directory Management
              </h1>
              <p className="text-xs text-neutral-400 mt-0.5 font-sans">Publish, update, set drafts, or delete novels in the catalog.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold border border-neutral-700/60 transition-all shadow shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>

            {view === 'list' ? (
              <button
                onClick={() => { resetForm(); setView('create'); }}
                className="flex items-center gap-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 text-white" />
                Add New Novel
              </button>
            ) : (
              <button
                onClick={() => setView('list')}
                className="flex items-center gap-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold border border-neutral-700/60 transition-all shadow shrink-0"
              >
                <List className="w-4 h-4" />
                View Directory
              </button>
            )}
          </div>
        </div>

        {/* --- VIEW 1: NOVELS DIRECTORY LISTING --- */}
        {view === 'list' && (
          loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent animate-spin rounded-full"></div>
              <p className="text-neutral-500 text-xs mt-3.5 font-medium">Loading novels metadata...</p>
            </div>
          ) : novels.length === 0 ? (
            <div className="p-16 text-center border bg-neutral-950/60 border-neutral-800 rounded-2xl max-w-md mx-auto text-neutral-500 flex flex-col items-center justify-center space-y-4">
              <BookMarked className="w-12 h-12 text-neutral-500" />
              <p className="text-base font-bold text-neutral-300">No novels registered yet</p>
              <p className="text-xs text-neutral-500">Create your first novel and captivate readers!</p>
              <button
                onClick={() => setView('create')}
                className="px-4 py-2 bg-orange-500 text-white font-semibold text-xs rounded-xl transition-all hover:bg-orange-600"
              >
                Start New Novel
              </button>
            </div>
          ) : (
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-950/90 border-b border-neutral-800 text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                      <th className="p-4 sm:p-5">Cover Art</th>
                      <th className="p-4 sm:p-5">Author & Genre</th>
                      <th className="p-4 sm:p-5">Novel Title</th>
                      <th className="p-4 sm:p-5">Views & Chapters</th>
                      <th className="p-4 sm:p-5">Publish Status</th>
                      <th className="p-4 sm:p-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80 text-sm">
                    {novels.map((novel) => (
                      <tr key={novel._id} className="hover:bg-neutral-900/30 transition-colors">
                        {/* Cover image preview in row */}
                        <td className="p-4">
                          <div className="w-12 h-16 bg-neutral-800 rounded overflow-hidden shadow-inner flex items-center justify-center shrink-0">
                            {novel.coverImageUrl ? (
                              <img
                                src={novel.coverImageUrl}
                                alt={novel.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover object-center"
                              />
                            ) : (
                              <BookOpen className="w-5 h-5 text-neutral-600" />
                            )}
                          </div>
                        </td>

                        <td className="p-4 font-mono text-xs">
                          <p className="font-bold text-neutral-200">Author: {novel.author}</p>
                          <span className="inline-block mt-1 font-semibold text-[9px] uppercase tracking-wider bg-neutral-800 text-orange-400 px-2 py-0.5 rounded-md border border-neutral-700/60">
                            {novel.category}
                          </span>
                        </td>

                        <td className="p-4 font-sans font-bold text-neutral-100 max-w-xs truncate">
                          {novel.title}
                        </td>

                        <td className="p-4 font-mono text-xs text-neutral-400 space-y-0.5">
                          <p className="flex items-center gap-1 leading-normal"><Eye className="w-3.5 h-3.5 text-neutral-500" /> {novel.totalViews || 0} Views</p>
                          <p className="text-[10px] text-orange-400 font-sans font-bold flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                            {novel.publishedChaptersCount || 0} Chapters
                          </p>
                        </td>

                        {/* Instant Toggle Publish Switch in row */}
                        <td className="p-4">
                          <button
                            onClick={() => handlePublishStateToggle(novel)}
                            className="flex items-center gap-1.5 focus:outline-none cursor-pointer text-xs"
                            title="Click to toggle draft/published"
                          >
                            {novel.publishStatus === 'PUBLISHED' ? (
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
                          <div className="flex items-center justify-center gap-2">
                            {/* Manage Chapters Navigation Shortcut */}
                            <Link
                              to={`/admin/novels/${novel._id}/chapters`}
                              className="p-1 px-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-orange-400 hover:text-orange-300 font-sans text-[11px] font-bold border border-neutral-700/60 transition-all shrink-0"
                              title="Manage Chapters"
                            >
                              Chapters
                            </Link>

                            {/* Edit Novel Metas Details */}
                            <button
                              onClick={() => handleEditInit(novel)}
                              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-[#f97316] transition-colors cursor-pointer shrink-0"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Clean Delete Novel */}
                            <button
                              onClick={() => handleDeleteNovel(novel._id, novel.title)}
                              className="p-2 rounded-lg bg-neutral-800 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
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

        {/* --- VIEW 2 & 3: NEW NOVEL REGISTRAR & META EDITOR --- */}
        {(view === 'create' || view === 'edit') && (
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-6 sm:p-8 max-w-3xl mx-auto shadow-xl animate-fade-in-up">
            <h2 className="text-lg sm:text-xl font-display font-black text-[#f97316] mb-6 flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Pencil className="w-5 h-5" />
              {view === 'create' ? 'Create New Novel' : 'Edit Novel Metadata'}
            </h2>

            <form onSubmit={view === 'create' ? handleCreateSubmit : handleEditSubmit} className="space-y-6 text-sm">
              
              {/* IMAGE UPLOADS CONTROLLER & BOX PREVIEW */}
              <div className="flex flex-col sm:flex-row gap-6 p-4 rounded-xl border border-neutral-800 bg-neutral-900/40">
                <div className="w-32 h-44 bg-neutral-800 rounded-xl overflow-hidden self-center md:self-start shrink-0 border border-neutral-700 relative flex items-center justify-center">
                  {uploading ? (
                    <div className="text-center space-y-2">
                      <Loader className="w-6 h-6 text-orange-500 animate-spin mx-auto" />
                      <p className="text-[10px] text-neutral-400 font-mono">Uploading...</p>
                    </div>
                  ) : coverImageUrl ? (
                    <img
                      src={coverImageUrl}
                      alt="Cover Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <BookOpen className="w-6 h-6 text-neutral-600" />
                  )}
                </div>

                <div className="space-y-3 flex-1 flex flex-col justify-center">
                  <h4 className="font-semibold text-neutral-200">Cover Art Upload *</h4>
                  <p className="text-xs text-neutral-400">Please upload an expressive cover picture for this novel (JPG/PNG only, max 5MB size limit).</p>
                  
                  <div className="flex items-center gap-2">
                    <label className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow">
                      <Upload className="w-3.5 h-3.5" />
                      Upload Picture
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleCoverUpload}
                        className="hidden"
                      />
                    </label>

                    {coverImageUrl && !coverImageUrl.includes('placeholder') && (
                      <span className="text-[10px] font-mono text-neutral-500">Image loaded</span>
                    )}
                  </div>

                  {fileError && (
                    <p className="text-xs text-rose-400 font-semibold">{fileError}</p>
                  )}
                </div>
              </div>

              {/* Title & Author */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Novel Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter novel title..."
                    className="w-full font-sans p-3 border border-neutral-700 bg-neutral-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Author Name *</label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Enter author name..."
                    className="w-full font-sans p-3 border border-neutral-700 bg-neutral-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Category, Status & Toggle Publish switches */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Genre Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full font-sans p-3 border border-neutral-700 bg-neutral-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Novel Status *</label>
                  <select
                    value={novelStatus}
                    onChange={(e) => setNovelStatus(e.target.value as any)}
                    className="w-full font-sans p-3 border border-neutral-700 bg-neutral-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  >
                    <option value="ONGOING">ONGOING</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>

                <div className="bg-neutral-900/50 p-3 rounded-xl border border-neutral-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-neutral-300">Publish immediately?</p>
                    <p className="text-[10px] text-neutral-500 font-sans">Publish immediately to catalogs</p>
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
              </div>

              {/* Short summary (max 250 words is fine, standard input) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Short Summary *</label>
                <input
                  type="text"
                  required
                  maxLength={180}
                  value={shortSummary}
                  onChange={(e) => setShortSummary(e.target.value)}
                  placeholder="Write a concise one-line summary (Max 180 characters)..."
                  className="w-full font-sans p-3 border border-neutral-700 bg-neutral-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                />
              </div>

              {/* Long Description detail text */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Full Overview Description *</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write the full description or plot introduction of the novel here..."
                  className="w-full font-sans p-3 border border-neutral-700 bg-neutral-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none"
                />
              </div>

              {/* Tags delimiter inputs */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Tags (Comma-separated) (Optional)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. romance, fantasy, sci-fi, drama"
                  className="w-full font-sans p-3 border border-neutral-700 bg-neutral-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                />
              </div>

              {/* Action operations buttons */}
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
                  disabled={uploading}
                  className="px-6 py-2.5 bg-[#f97316] hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {view === 'create' ? 'Create Novel' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
};
