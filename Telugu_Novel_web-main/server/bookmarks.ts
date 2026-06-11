/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response } from 'express';
import { db } from './db';
import { AuthenticatedRequest } from './auth';

export const bookmarksController = {
  // GET current logged-in reader's bookmarks
  getUserBookmarks: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Please log in to load bookmarks.' });
      }

      const bookmarks = await db.bookmarks.find({ userId });

      // Build populated bookmarks list
      const enriched = [];
      for (const b of bookmarks) {
        const novel = await db.novels.findById(b.novelId);
        const chapter = await db.chapters.findById(b.chapterId);
        
        if (novel && chapter) {
          enriched.push({
            _id: b._id,
            createdAt: b.createdAt,
            novel: {
              _id: novel._id,
              title: novel.title,
              slug: novel.slug,
              coverImageUrl: novel.coverImageUrl,
              author: novel.author
            },
            chapter: {
              _id: chapter._id,
              chapterNumber: chapter.chapterNumber,
              title: chapter.title
            }
          });
        }
      }

      return res.status(200).json({
        success: true,
        count: enriched.length,
        bookmarks: enriched
      });
    } catch (error: any) {
      console.error('Fetch User Bookmarks Error:', error);
      return res.status(500).json({ success: false, message: 'Server error loading saved bookmarks.' });
    }
  },

  // ADD bookmark for a chapter
  addBookmark: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { chapterId } = req.params;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Please log in to save bookmarks.' });
      }

      const chapter = await db.chapters.findById(chapterId);
      if (!chapter) {
        return res.status(404).json({ success: false, message: 'Target chapter not found.' });
      }

      // Check if bookmark already exists
      const existing = await db.bookmarks.findOne({ userId, chapterId });
      if (existing) {
        return res.status(200).json({ success: true, message: 'Bookmark already saved.', bookmark: existing });
      }

      const bookmark = await db.bookmarks.create({
        userId,
        novelId: chapter.novelId,
        chapterId: chapter._id
      });

      return res.status(201).json({
        success: true,
        message: 'Chapter bookmarked successfully!',
        bookmark
      });
    } catch (error: any) {
      console.error('Add Bookmark Error:', error);
      return res.status(500).json({ success: false, message: 'Server error creating bookmark record.' });
    }
  },

  // REMOVE bookmark for a chapter
  removeBookmark: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { chapterId } = req.params;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Please log in to edit bookmarks.' });
      }

      const deleted = await db.bookmarks.delete({ userId, chapterId });
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'No active bookmark found for this chapter.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Bookmark removed successfully.'
      });
    } catch (error: any) {
      console.error('Remove Bookmark Error:', error);
      return res.status(500).json({ success: false, message: 'Server error removing bookmark.' });
    }
  }
};
