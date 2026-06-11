/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response } from 'express';
import { db } from './db';
import { AuthenticatedRequest } from './auth';
import { UserRole, PublishStatus, CommentStatus } from '../src/types';

export const adminController = {
  // GET Admin dashboard figures
  getDashboardStats: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      // 1. Novels Counting
      const novels = await db.novels.find();
      const totalNovels = novels.length;
      const publishedNovels = novels.filter(n => n.publishStatus === PublishStatus.PUBLISHED).length;
      const draftNovels = totalNovels - publishedNovels;

      // 2. Chapters Counting & Aggregate Metas
      const chapters = await db.chapters.find();
      const totalChapters = chapters.length;
      const publishedChapters = chapters.filter(c => c.publishStatus === PublishStatus.PUBLISHED).length;
      const draftChapters = totalChapters - publishedChapters;

      let totalChapterViews = chapters.reduce((sum, c) => sum + (c.views || 0), 0);
      let totalLikes = chapters.reduce((sum, c) => sum + (c.likedBy ? c.likedBy.length : 0), 0);

      // 3. User stats
      const users = await db.users.find();
      const totalRegisteredUsers = users.filter(u => u.role === UserRole.USER).length;
      const totalBannedUsers = users.filter(u => u.isBanned).length;

      // 4. Comment stats
      const comments = await db.comments.find();
      const pendingComments = comments.filter(c => c.status === CommentStatus.PENDING).length;
      const approvedComments = comments.filter(c => c.status === CommentStatus.APPROVED).length;

      // 5. Bookmarks count
      const bookmarks = await db.bookmarks.find();
      const totalBookmarks = bookmarks.length;

      // Recent lists
      // Sort copies by created dates
      const recentNovels = [...novels]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      const recentChapters = [...chapters]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(c => {
          const matchedNovel = novels.find(n => n._id === c.novelId);
          return {
            ...c,
            novelTitle: matchedNovel ? matchedNovel.title : 'Deleted Novel'
          };
        });

      const recentComments = [...comments]
        .filter(c => c.status === CommentStatus.PENDING)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(c => {
          const matchedUser = users.find(u => u._id === c.userId);
          const matchedNovel = novels.find(n => n._id === c.novelId);
          const matchedChapter = chapters.find(ch => ch._id === c.chapterId);
          return {
            ...c,
            userName: matchedUser ? matchedUser.name : 'Unknown Reader',
            novelTitle: matchedNovel ? matchedNovel.title : 'Deleted Novel',
            chapterNumber: matchedChapter ? matchedChapter.chapterNumber : 0
          };
        });

      const recentUsers = [...users]
        .filter(u => u.role === UserRole.USER)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(({ _id, name, email, createdAt, isBanned }) => ({ _id, name, email, createdAt, isBanned }));

      return res.status(200).json({
        success: true,
        stats: {
          totalNovels,
          publishedNovels,
          draftNovels,
          totalChapters,
          publishedChapters,
          draftChapters,
          totalRegisteredUsers,
          totalBannedUsers,
          pendingComments,
          approvedComments,
          totalChapterViews,
          totalLikes,
          totalBookmarks
        },
        recentNovels,
        recentChapters,
        recentComments,
        recentUsers
      });
    } catch (error: any) {
      console.error('Fetch Admin Dashboard Stats Error:', error);
      return res.status(500).json({ success: false, message: 'Server error loading administration statistics.' });
    }
  },

  // LIST all reader accounts
  getAllUsers: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { search, filter } = req.query;
      let users = await db.users.find();

      // Only display standard readers to avoid admin accidental deletes
      users = users.filter(u => u.role === UserRole.USER);

      if (search) {
        const term = String(search).toLowerCase();
        users = users.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
      }

      if (filter) {
        if (filter === 'banned') {
          users = users.filter(u => u.isBanned);
        } else if (filter === 'active') {
          users = users.filter(u => !u.isBanned);
        }
      }

      // Sort newest registration first
      users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Strip passwords
      const stripped = users.map(({ _id, name, email, isBanned, banReason, bannedAt, createdAt }) => ({
        _id, name, email, isBanned, banReason, bannedAt, createdAt
      }));

      return res.status(200).json({ success: true, count: stripped.length, users: stripped });
    } catch (error: any) {
      console.error('Admin Load Readers List Error:', error);
      return res.status(500).json({ success: false, message: 'Server error parsing user indexes.' });
    }
  },

  // BAN reader
  banUser: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { userId } = req.params;
      const { banReason } = req.body;

      if (!banReason || !banReason.trim()) {
        return res.status(400).json({ success: false, message: 'Please supply a justification/reason for banning this user.' });
      }

      const user = await db.users.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Target user record not found.' });
      }

      if (user.role === UserRole.ADMIN) {
        return res.status(403).json({ success: false, message: 'For safety, administrators cannot be banned.' });
      }

      const updated = await db.users.update(userId, {
        isBanned: true,
        banReason: banReason.trim(),
        bannedAt: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'The user account has been successfully banned. Subsequent API requests will immediately stand blocked.',
        user: {
          _id: updated?._id,
          name: updated?.name,
          email: updated?.email,
          isBanned: updated?.isBanned,
          banReason: updated?.banReason
        }
      });
    } catch (error: any) {
      console.error('Ban User Action Error:', error);
      return res.status(500).json({ success: false, message: 'Server error processing ban directive.' });
    }
  },

  // UNBAN reader
  unbanUser: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { userId } = req.params;

      const user = await db.users.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User record not found.' });
      }

      const updated = await db.users.update(userId, {
        isBanned: false,
        banReason: undefined,
        bannedAt: undefined
      });

      return res.status(200).json({
        success: true,
        message: 'The reader account has been reinstated successfully.',
        user: {
          _id: updated?._id,
          name: updated?.name,
          email: updated?.email,
          isBanned: updated?.isBanned
        }
      });
    } catch (error: any) {
      console.error('Unban Action Error:', error);
      return res.status(500).json({ success: false, message: 'Server error processing unban request.' });
    }
  },

  // DELETE reader
  deleteUser: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { userId } = req.params;

      const user = await db.users.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User account not found.' });
      }

      if (user.role === UserRole.ADMIN) {
        return res.status(403).json({ success: false, message: 'Administrative accounts cannot be deleted directly.' });
      }

      // Safe clean: delete reader comments and saved bookmarks on user account termination
      await db.comments.deleteManyByUserId(userId).catch(console.error);
      await db.bookmarks.deleteManyByUserId(userId).catch(console.error);

      // Delete user
      await db.users.delete(userId);

      return res.status(200).json({
        success: true,
        message: 'The user account together with all written bookmarks and comments has been removed permanently.'
      });
    } catch (error: any) {
      console.error('Delete User Action Error:', error);
      return res.status(500).json({ success: false, message: 'Server error deleting reader record.' });
    }
  }
};
