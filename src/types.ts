/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum NovelStatus {
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED'
}

export enum PublishStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED'
}

export enum CommentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface User {
  _id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  isBanned: boolean;
  banReason?: string;
  bannedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Novel {
  _id: string;
  title: string;
  slug: string; // Unique URL-friendly slug
  author: string;
  category: string;
  shortSummary: string;
  description: string;
  coverImageUrl: string;
  coverImagePublicId?: string;
  tags: string[]; // split by comma
  novelStatus: NovelStatus;
  publishStatus: PublishStatus;
  totalViews: number;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  _id: string;
  novelId: string; // References Novel._id
  chapterNumber: number;
  title: string;
  content: string; // Full unlimited-length story content in Telugu
  publishStatus: PublishStatus;
  publishedAt?: string;
  views: number;
  likedBy: string[]; // user IDs who liked it
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  _id: string;
  userId: string;
  novelId: string;
  chapterId: string;
  createdAt: string;
}

export interface Comment {
  _id: string;
  userId: string;
  novelId: string;
  chapterId: string;
  content: string;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  novel?: {
    _id: string;
    title: string;
  };
  chapter?: {
    _id: string;
    title: string;
    chapterNumber: number;
  };
}

export interface AnalyticsSummary {
  totalNovels: number;
  publishedNovels: number;
  draftNovels: number;
  totalChapters: number;
  publishedChapters: number;
  draftChapters: number;
  totalRegisteredUsers: number;
  totalBannedUsers: number;
  pendingComments: number;
  approvedComments: number;
  totalChapterViews: number;
  totalLikes: number;
  totalBookmarks: number;
}
