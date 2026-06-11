/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { db } from './db';
import { Chapter, PublishStatus, UserRole } from '../src/types';
import { AuthenticatedRequest } from './auth';

// Simple in-memory safeguard tracking request views to prevent rapid artificial increment (1 minute lock)
const viewTracker = new Map<string, number>();

export const chaptersController = {
  // GET Single Chapter Details
  getPublicChapter: async (req: Request, res: Response): Promise<any> => {
    try {
      const { chapterId } = req.params;
      const chapter = await db.chapters.findById(chapterId);

      if (!chapter) {
        return res.status(404).json({ success: false, message: 'Chapter not found.' });
      }

      // Check access permission. If draft, check if admin
      if (chapter.publishStatus !== PublishStatus.PUBLISHED) {
        return res.status(403).json({ success: false, message: 'This chapter is currently saved as a draft.' });
      }

      const clientIP = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
      const trackingKey = `${clientIP}_${chapterId}`;
      const now = Date.now();
      const lastViewTime = viewTracker.get(trackingKey) || 0;

      // Safe Increment Views: only if 1 min passed since last view from this IP
      if (now - lastViewTime > 60000) {
        await db.chapters.incrementViews(chapterId);
        viewTracker.set(trackingKey, now);
        chapter.views += 1; // update local representation for the active response
      }

      // Load novel details to show titles
      const novel = await db.novels.findById(chapter.novelId);
      
      return res.status(200).json({
        success: true,
        chapter,
        novelTitle: novel ? novel.title : 'Telugu Novel',
        novelSlug: novel ? novel.slug : ''
      });
    } catch (error: any) {
      console.error('Fetch Chapter Detail Error:', error);
      return res.status(500).json({ success: false, message: 'Server error loading chapter text.' });
    }
  },

  // GET Chapter Navigation (ordered list of published chapters only!)
  getChapterNavigation: async (req: Request, res: Response): Promise<any> => {
    try {
      const { chapterId } = req.params;
      const chapter = await db.chapters.findById(chapterId);

      if (!chapter) {
        return res.status(404).json({ success: false, message: 'Chapter not found.' });
      }

      // Retrieve all PUBLISHED chapters of this novel, ordered by chapterNumber
      let publishedChapters = await db.chapters.find({
        novelId: chapter.novelId,
        publishStatus: PublishStatus.PUBLISHED
      });
      publishedChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

      const currentIndex = publishedChapters.findIndex(c => c._id === chapterId);

      const previousChapter = currentIndex > 0 ? publishedChapters[currentIndex - 1] : null;
      const nextChapter = currentIndex < publishedChapters.length - 1 ? publishedChapters[currentIndex + 1] : null;

      return res.status(200).json({
        success: true,
        previousChapterId: previousChapter ? previousChapter._id : null,
        previousChapterTitle: previousChapter ? `Chapter ${previousChapter.chapterNumber}: ${previousChapter.title}` : null,
        nextChapterId: nextChapter ? nextChapter._id : null,
        nextChapterTitle: nextChapter ? `Chapter ${nextChapter.chapterNumber}: ${nextChapter.title}` : null,
        totalChaptersCount: publishedChapters.length,
        currentSequenceIndex: currentIndex + 1
      });
    } catch (error: any) {
      console.error('Chapter Navigation Query Error:', error);
      return res.status(500).json({ success: false, message: 'Server error parsing navigation links.' });
    }
  },

  // READER INTERACTIONS: LIKING & UNLIKING
  likeChapter: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { chapterId } = req.params;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Please log in to like chapters.' });
      }

      const chapter = await db.chapters.findById(chapterId);
      if (!chapter) {
        return res.status(404).json({ success: false, message: 'Chapter not found.' });
      }

      const updated = await db.chapters.toggleLike(chapterId, userId, 'like');
      const likesCount = updated && updated.likedBy ? updated.likedBy.length : 0;

      return res.status(200).json({
        success: true,
        message: 'Chapter liked successfully.',
        likesCount,
        likedBy: updated?.likedBy || []
      });
    } catch (error: any) {
      console.error('Like Chapter Error:', error);
      return res.status(500).json({ success: false, message: 'Server error saving like action.' });
    }
  },

  unlikeChapter: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { chapterId } = req.params;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Please log in to manage preferences.' });
      }

      const chapter = await db.chapters.findById(chapterId);
      if (!chapter) {
        return res.status(404).json({ success: false, message: 'Chapter not found.' });
      }

      const updated = await db.chapters.toggleLike(chapterId, userId, 'unlike');
      const likesCount = updated && updated.likedBy ? updated.likedBy.length : 0;

      return res.status(200).json({
        success: true,
        message: 'Chapter like removed.',
        likesCount,
        likedBy: updated?.likedBy || []
      });
    } catch (error: any) {
      console.error('Unlike Chapter Error:', error);
      return res.status(500).json({ success: false, message: 'Server error processing your instruction.' });
    }
  },

  // ADMIN OPERATIONS
  adminGetNovelChapters: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { novelId } = req.params;
      const novel = await db.novels.findById(novelId);
      if (!novel) {
        return res.status(404).json({ success: false, message: 'Novel record not found.' });
      }

      const chapters = await db.chapters.find({ novelId });
      chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

      return res.status(200).json({
        success: true,
        novelTitle: novel.title,
        chaptersCount: chapters.length,
        chapters
      });
    } catch (error: any) {
      console.error('Admin Fetch Chapters Error:', error);
      return res.status(500).json({ success: false, message: 'Server error loading chapters log.' });
    }
  },

  adminCreateChapter: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { novelId } = req.params;
      const { chapterNumber, title, content, publishStatus } = req.body;

      if (!chapterNumber || !title || !content) {
        return res.status(400).json({ success: false, message: 'Please supply a chapter number, title, and body text.' });
      }

      const num = Number(chapterNumber);
      if (isNaN(num) || num <= 0) {
        return res.status(400).json({ success: false, message: 'Chapter index must be a positive integer.' });
      }

      const novel = await db.novels.findById(novelId);
      if (!novel) {
        return res.status(404).json({ success: false, message: 'Novel record not found.' });
      }

      try {
        const chapter = await db.chapters.create({
          novelId,
          chapterNumber: num,
          title,
          content,
          publishStatus: publishStatus || PublishStatus.DRAFT,
          views: 0,
          likedBy: []
        });

        return res.status(201).json({ success: true, message: `Chapter ${num} uploaded successfully!`, chapter });
      } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message || 'Duplicate compound chapter detected.' });
      }
    } catch (error: any) {
      console.error('Admin Create Chapter Error:', error);
      return res.status(500).json({ success: false, message: 'Server error saving chapter file.' });
    }
  },

  adminUpdateChapter: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { chapterId } = req.params;
      const { chapterNumber, title, content, publishStatus } = req.body;

      const chapter = await db.chapters.findById(chapterId);
      if (!chapter) {
        return res.status(404).json({ success: false, message: 'Chapter record not found.' });
      }

      const updateData: Partial<Chapter> = {};
      if (chapterNumber !== undefined) {
        const num = Number(chapterNumber);
        if (isNaN(num) || num <= 0) {
          return res.status(400).json({ success: false, message: 'Chapter number must be a valid positive index.' });
        }
        updateData.chapterNumber = num;
      }
      if (title) updateData.title = title;
      if (content) updateData.content = content;
      if (publishStatus) updateData.publishStatus = publishStatus as PublishStatus;

      try {
        const updated = await db.chapters.update(chapterId, updateData);
        return res.status(200).json({ success: true, message: 'Chapter modified and saved successfully!', chapter: updated });
      } catch (err: any) {
        return res.status(400).json({ success: false, message: err.message || 'Chapter index already taken in this novel!' });
      }
    } catch (error: any) {
      console.error('Admin Edit Chapter Error:', error);
      return res.status(500).json({ success: false, message: 'Server error applying modifications.' });
    }
  },

  adminTogglePublishChapter: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { chapterId } = req.params;
      const { publishStatus } = req.body;

      if (!publishStatus || !Object.values(PublishStatus).includes(publishStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid publishStatus.' });
      }

      const updated = await db.chapters.update(chapterId, { publishStatus });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Chapter not found.' });
      }

      return res.status(200).json({ success: true, message: `Chapter publish status modified to ${publishStatus}.`, chapter: updated });
    } catch (error: any) {
      console.error('Publish Toggle Chapter Error:', error);
      return res.status(500).json({ success: false, message: 'Server error setting publish level.' });
    }
  },

  adminDeleteChapter: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { chapterId } = req.params;

      const deleted = await db.chapters.delete(chapterId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Chapter reference not found.' });
      }

      // Cleanup associated bookmarks & comments
      // We do not have a separate deleteMany for comment/bookmark but we can query them or let db file handle them
      return res.status(200).json({ success: true, message: 'Chapter removed successfully.' });
    } catch (error: any) {
      console.error('Admin Delete Chapter Error:', error);
      return res.status(500).json({ success: false, message: 'Server error executing removal task.' });
    }
  }
};
