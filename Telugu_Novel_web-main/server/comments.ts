/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { db } from './db';
import { CommentStatus, UserRole } from '../src/types';
import { AuthenticatedRequest } from './auth';

export const commentsController = {
  // PUBLIC: Get Approved Comments for a Chapter
  getChapterComments: async (req: Request, res: Response): Promise<any> => {
    try {
      const { chapterId } = req.params;
      const comments = await db.comments.find({
        chapterId,
        status: CommentStatus.APPROVED
      });

      return res.status(200).json({
        success: true,
        count: comments.length,
        comments
      });
    } catch (error: any) {
      console.error('Fetch Chapter Comments Error:', error);
      return res.status(500).json({ success: false, message: 'Server error loading comments.' });
    }
  },

  // READER: Submit comment (defaults to PENDING)
  addComment: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { chapterId } = req.params;
      const { content } = req.body;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Please log in to submit comments.' });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, message: 'Comment content cannot be empty.' });
      }

      const chapter = await db.chapters.findById(chapterId);
      if (!chapter) {
        return res.status(404).json({ success: false, message: 'Target chapter not found.' });
      }

      // Create new PENDING comment
      const comment = await db.comments.create({
        userId,
        novelId: chapter.novelId,
        chapterId: chapter._id,
        content: content.trim(),
        status: CommentStatus.PENDING
      });

      return res.status(201).json({
        success: true,
        message: 'Your comment has been submitted and is pending administrator review.',
        comment
      });
    } catch (error: any) {
      console.error('Submit Comment Error:', error);
      return res.status(500).json({ success: false, message: 'Server error logging comment.' });
    }
  },

  // ADMIN: Retrieve comments (filters can be provided, e.g. status)
  adminGetComments: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { status } = req.query;
      let filter: any = {};
      if (status && Object.values(CommentStatus).includes(status as CommentStatus)) {
        filter.status = status;
      }

      const comments = await db.comments.find(filter);

      return res.status(200).json({
        success: true,
        count: comments.length,
        comments
      });
    } catch (error: any) {
      console.error('Admin Fetch Comments Error:', error);
      return res.status(500).json({ success: false, message: 'Server error retrieving comments log.' });
    }
  },

  // ADMIN: Approve Pending Comment
  adminApproveComment: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { commentId } = req.params;
      const comment = await db.comments.findById(commentId);

      if (!comment) {
        return res.status(404).json({ success: false, message: 'Comment records not found.' });
      }

      const updated = await db.comments.updateStatus(commentId, CommentStatus.APPROVED);

      return res.status(200).json({
        success: true,
        message: 'Comment has been successfully approved for public view.',
        comment: updated
      });
    } catch (error: any) {
      console.error('Admin Approve Comment Error:', error);
      return res.status(500).json({ success: false, message: 'Server error updating comment approval.' });
    }
  },

  // ADMIN: Reject/Delete Comment
  adminDeleteComment: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const { commentId } = req.params;
      const deleted = await db.comments.delete(commentId);

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Comment reference already missing.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Comment was removed from indexing.'
      });
    } catch (error: any) {
      console.error('Admin Delete Comment Error:', error);
      return res.status(500).json({ success: false, message: 'Server error removing comment record.' });
    }
  }
};
