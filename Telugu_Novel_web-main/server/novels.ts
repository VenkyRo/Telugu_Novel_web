/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { db } from './db';
import { Novel, UserRole, PublishStatus, NovelStatus } from '../src/types';
import { AuthenticatedRequest } from './auth';
import { uploadCoverImage, deleteCoverImage } from './upload';

// Generate safe unique slug from title
async function generateUniqueSlug(title: string): Promise<string> {
  // Simple slugify keeping Telugu chars or English chars
  let baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\u0c00-\u0c7f-\s]/g, '') // Keep English/Telugu/spaces
    .replace(/\s+/g, '-')
    .substring(0, 100);

  if (!baseSlug) {
    baseSlug = 'novel-' + Math.random().toString(36).substring(2, 7);
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db.novels.findOne({ slug });
    if (!existing) {
      break;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

export const novelsController = {
  // PUBLIC ROUTES
  getAllPublic: async (req: Request, res: Response): Promise<any> => {
    try {
      const { search, category, sort } = req.query;

      // Filter: only PUBLISHED novels
      let query: any = { publishStatus: PublishStatus.PUBLISHED };

      let novels = await db.novels.find(query);

      // Apply Search Filter, matching details or authors
      if (search) {
        const term = String(search).toLowerCase();
        novels = novels.filter(n => 
          n.title.toLowerCase().includes(term) || 
          n.author.toLowerCase().includes(term) ||
          n.shortSummary.toLowerCase().includes(term) ||
          n.tags.some(t => t.toLowerCase().includes(term))
        );
      }

      // Apply Category Filter
      if (category) {
        const cat = String(category).toLowerCase();
        novels = novels.filter(n => n.category.toLowerCase() === cat);
      }

      // Sort novels dynamically
      if (sort) {
        switch (sort) {
          case 'latest':
            novels.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            break;
          case 'popular':
          case 'views':
            novels.sort((a, b) => b.totalViews - a.totalViews);
            break;
          case 'liked':
            // Likes are counted in chapters, we sort by views if single sort requested or by view count
            novels.sort((a, b) => b.totalViews - a.totalViews);
            break;
          case 'alphabetical':
            novels.sort((a, b) => a.title.localeCompare(b.title));
            break;
          default:
            novels.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
      } else {
        // Default relative order: updated newest first
        novels.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      }

      // Map novel with chapter counts
      const enrichedNovels = await Promise.all(novels.map(async (n) => {
        const chapters = await db.chapters.find({ novelId: n._id, publishStatus: PublishStatus.PUBLISHED });
        return {
          ...n,
          publishedChaptersCount: chapters.length
        };
      }));

      return res.status(200).json({ success: true, count: enrichedNovels.length, novels: enrichedNovels });
    } catch (error: any) {
      console.error('Fetch Public Novels Error:', error);
      return res.status(500).json({ success: false, message: 'Server error loading novels.' });
    }
  },

  getPublicBySlug: async (req: Request, res: Response): Promise<any> => {
    try {
      const { slug } = req.params;
      const novel = await db.novels.findOne({ slug });

      if (!novel) {
        return res.status(404).json({ success: false, message: 'Novel not found.' });
      }

      // Hide draft novel details from public
      if (novel.publishStatus !== PublishStatus.PUBLISHED) {
        return res.status(403).json({ success: false, message: 'This story draft is currently undergoing editing.' });
      }

      // Increment Views
      await db.novels.incrementViews(novel._id);

      // Get Published chapters for this novel
      const publishedChapters = await db.chapters.find({ novelId: novel._id, publishStatus: PublishStatus.PUBLISHED });
      publishedChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

      // Return details
      return res.status(200).json({
        success: true,
        novel,
        chapters: publishedChapters.map(({ _id, chapterNumber, title, publishedAt, views, likedBy }) => ({
          _id,
          chapterNumber,
          title,
          publishedAt,
          views,
          likesCount: likedBy ? likedBy.length : 0
        }))
      });
    } catch (error: any) {
      console.error('Fetch Novel Details Error:', error);
      return res.status(500).json({ success: false, message: 'Server error loading novel details.' });
    }
  },

  // ADMIN OPERATIONS
  adminGetAll: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const novels = await db.novels.find();
      enrichNovelsWithCounts(novels, res);
    } catch (error: any) {
      console.error('Admin Fetch Novels Error:', error);
      return res.status(500).json({ success: false, message: 'Server error loading administration catalog.' });
    }
  },

  adminCreate: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { title, author, category, shortSummary, description, tags, novelStatus, publishStatus } = req.body;

      if (!title || !author || !category || !shortSummary || !description) {
        return res.status(400).json({ success: false, message: 'Please cover all mandatory novel metadata fields.' });
      }

      if (shortSummary.length > 1500) {
        return res.status(400).json({ success: false, message: 'Short summary must be under 1,500 characters.' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'A book cover image file is required.' });
      }

      // Upload Cover
      const uploadRes = await uploadCoverImage(req.file);

      // Generate clean unique Slug
      const slug = await generateUniqueSlug(title);

      // Parse tags
      const splitTags = tags ? String(tags).split(',').map(t => t.trim()).filter(Boolean) : [];

      const novel = await db.novels.create({
        title,
        slug,
        author,
        category,
        shortSummary,
        description,
        coverImageUrl: uploadRes.url,
        coverImagePublicId: uploadRes.publicId,
        tags: splitTags,
        novelStatus: novelStatus || NovelStatus.ONGOING,
        publishStatus: publishStatus || PublishStatus.DRAFT,
        totalViews: 0
      });

      return res.status(201).json({ success: true, message: 'Novel registered successfully!', novel });
    } catch (error: any) {
      console.error('Admin Register Novel Error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Server error creating novel registration.' });
    }
  },

  adminUpdate: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { novelId } = req.params;
      const { title, author, category, shortSummary, description, tags, novelStatus, publishStatus } = req.body;

      const novel = await db.novels.findById(novelId);
      if (!novel) {
        return res.status(404).json({ success: false, message: 'Target novel record not found.' });
      }

      const updateData: Partial<Novel> = {};

      if (title && title !== novel.title) {
        updateData.title = title;
        updateData.slug = await generateUniqueSlug(title);
      }
      if (author) updateData.author = author;
      if (category) updateData.category = category;
      if (shortSummary) {
        if (shortSummary.length > 1500) {
          return res.status(400).json({ success: false, message: 'Short summary cannot exceed 1,500 characters.' });
        }
        updateData.shortSummary = shortSummary;
      }
      if (description) updateData.description = description;
      if (tags !== undefined) {
        updateData.tags = String(tags).split(',').map(t => t.trim()).filter(Boolean);
      }
      if (novelStatus) updateData.novelStatus = novelStatus as NovelStatus;
      if (publishStatus) updateData.publishStatus = publishStatus as PublishStatus;

      // Handle Cover replacement
      if (req.file) {
        // Upload new image
        const uploadRes = await uploadCoverImage(req.file);
        updateData.coverImageUrl = uploadRes.url;
        updateData.coverImagePublicId = uploadRes.publicId;

        // Delete previous image asynchronously
        if (novel.coverImagePublicId) {
          deleteCoverImage(novel.coverImagePublicId).catch(console.error);
        }
      }

      const updatedNovel = await db.novels.update(novelId, updateData);

      return res.status(200).json({ success: true, message: 'Novel profile updated successfully!', novel: updatedNovel });
    } catch (error: any) {
      console.error('Admin Edit Novel Error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Server error saving novel edits.' });
    }
  },

  adminTogglePublish: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { novelId } = req.params;
      const { publishStatus } = req.body;

      if (!publishStatus || !Object.values(PublishStatus).includes(publishStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid publish status input.' });
      }

      const novel = await db.novels.findById(novelId);
      if (!novel) {
        return res.status(404).json({ success: false, message: 'Novel record not found.' });
      }

      const updated = await db.novels.update(novelId, { publishStatus });
      return res.status(200).json({
        success: true,
        message: `Novel publish mode changed successfully to ${publishStatus}.`,
        novel: updated
      });
    } catch (error: any) {
      console.error('Toggle Publish Error:', error);
      return res.status(500).json({ success: false, message: 'Server error modifying publish flag.' });
    }
  },

  adminDelete: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { novelId } = req.params;

      const novel = await db.novels.findById(novelId);
      if (!novel) {
        return res.status(404).json({ success: false, message: 'Target novel record to delete not found.' });
      }

      // Remove related cover image
      if (novel.coverImagePublicId) {
        await deleteCoverImage(novel.coverImagePublicId).catch(console.error);
      }

      // Delete associated Chapters
      await db.chapters.deleteManyByNovelId(novelId);

      // Clean related Comments & Bookmarks
      await db.comments.deleteManyByNovelId(novelId);
      await db.bookmarks.deleteManyByNovelId(novelId);

      // Delete the novel
      await db.novels.delete(novelId);

      return res.status(200).json({
        success: true,
        message: 'Novel together with all chapters, reader and bookmarks entries has been safely deleted.'
      });
    } catch (error: any) {
      console.error('Admin Delete Novel Error:', error);
      return res.status(500).json({ success: false, message: 'Server error executing novel deletion.' });
    }
  }
};

async function enrichNovelsWithCounts(novels: Novel[], res: Response) {
  const result = await Promise.all(novels.map(async (n) => {
    const chapters = await db.chapters.find({ novelId: n._id });
    const pub = chapters.filter(c => c.publishStatus === PublishStatus.PUBLISHED).length;
    return {
      ...n,
      chaptersCount: chapters.length,
      publishedChaptersCount: pub
    };
  }));

  // Sort by created date newest first
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.status(200).json({ success: true, count: result.length, novels: result });
}
