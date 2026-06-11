/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import mongoose, { Schema, Document } from 'mongoose';
import { User, Novel, Chapter, Bookmark, Comment, UserRole, PublishStatus, NovelStatus, CommentStatus } from '../src/types';

// Establish environment variables with graceful fallbacks
const MONGODB_URI = process.env.MONGODB_URI || '';
const DATA_DIR = path.join(process.cwd(), 'server', 'data');

// Ensure database fallback directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure database connection status is tracked
let isMongoConnected = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('Successfully connected to MongoDB Atlas Key-Service.');
      isMongoConnected = true;
    })
    .catch((err) => {
      console.error('Failed to connect to MongoDB, falling back to local file storage:', err.message);
      isMongoConnected = false;
    });
} else {
  console.log('No MONGODB_URI found. Initializing local JSON database engine in server/data/.');
}

// --- MONGOOSE MONGO SCHEMAS ---
const userSchema = new Schema<User & Document>({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.USER },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String },
  bannedAt: { type: String },
}, { timestamps: true });

const novelSchema = new Schema<Novel & Document>({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  shortSummary: { type: String, required: true },
  description: { type: String, required: true },
  coverImageUrl: { type: String, required: true },
  coverImagePublicId: { type: String },
  tags: [{ type: String }],
  novelStatus: { type: String, enum: Object.values(NovelStatus), default: NovelStatus.ONGOING },
  publishStatus: { type: String, enum: Object.values(PublishStatus), default: PublishStatus.DRAFT },
  totalViews: { type: Number, default: 0 },
}, { timestamps: true });

const chapterSchema = new Schema<Chapter & Document>({
  _id: { type: String, required: true },
  novelId: { type: String, required: true },
  chapterNumber: { type: Number, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  publishStatus: { type: String, enum: Object.values(PublishStatus), default: PublishStatus.DRAFT },
  publishedAt: { type: String },
  views: { type: Number, default: 0 },
  likedBy: [{ type: String }],
}, { timestamps: true });

// Compound Index to prevent duplicate Chapter Numbers in the same Novel
chapterSchema.index({ novelId: 1, chapterNumber: 1 }, { unique: true });

const bookmarkSchema = new Schema<Bookmark & Document>({
  _id: { type: String, required: true },
  userId: { type: String, required: true },
  novelId: { type: String, required: true },
  chapterId: { type: String, required: true },
}, { timestamps: true });

// Prevent duplicate bookmarks for the same user and chapter
bookmarkSchema.index({ userId: 1, chapterId: 1 }, { unique: true });

const commentSchema = new Schema<Comment & Document>({
  _id: { type: String, required: true },
  userId: { type: String, required: true },
  novelId: { type: String, required: true },
  chapterId: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, enum: Object.values(CommentStatus), default: CommentStatus.PENDING },
}, { timestamps: true });

const UserModel: any = mongoose.models.User || mongoose.model<any>('User', userSchema);
const NovelModel: any = mongoose.models.Novel || mongoose.model<any>('Novel', novelSchema);
const ChapterModel: any = mongoose.models.Chapter || mongoose.model<any>('Chapter', chapterSchema);
const BookmarkModel: any = mongoose.models.Bookmark || mongoose.model<any>('Bookmark', bookmarkSchema);
const CommentModel: any = mongoose.models.Comment || mongoose.model<any>('Comment', commentSchema);


// --- JSON ENGINE HELPER FUNCTIONS ---
function readJSONStore<T>(filename: string): T[] {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return [];
  }
}

function writeJSONStore<T>(filename: string, data: T[]): void {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
  }
}


// --- HYBRID EXPORT DECLARATIONS ---
export const db = {
  users: {
    find: async (query: any = {}): Promise<User[]> => {
      if (isMongoConnected) {
        return (await UserModel.find(query).lean()) as unknown as User[];
      }
      let items = readJSONStore<User>('users.json');
      return items.filter(u => {
        for (const k in query) {
          if (query[k] !== undefined && u[k as keyof User] !== query[k]) return false;
        }
        return true;
      });
    },

    findOne: async (query: any): Promise<User | null> => {
      if (isMongoConnected) {
        const doc = await UserModel.findOne(query).lean();
        return doc ? (doc as unknown as User) : null;
      }
      const items = readJSONStore<User>('users.json');
      const found = items.find(u => {
        for (const k in query) {
          if (u[k as keyof User] !== query[k]) return false;
        }
        return true;
      });
      return found || null;
    },

    findById: async (id: string): Promise<User | null> => {
      if (isMongoConnected) {
        const doc = await UserModel.findById(id).lean();
        return doc ? (doc as unknown as User) : null;
      }
      const items = readJSONStore<User>('users.json');
      return items.find(u => u._id === id) || null;
    },

    create: async (data: Partial<User>): Promise<User> => {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const doc = await UserModel.create({
          _id: data._id || 'u_' + Math.random().toString(36).substring(2, 11),
          ...data
        });
        return doc.toObject() as unknown as User;
      }
      const items = readJSONStore<User>('users.json');
      const newUser: User = {
        _id: 'u_' + Math.random().toString(36).substring(2, 11),
        name: data.name || '',
        email: data.email || '',
        password: data.password || '',
        role: data.role || UserRole.USER,
        isBanned: data.isBanned || false,
        banReason: data.banReason,
        bannedAt: data.bannedAt,
        createdAt: now,
        updatedAt: now,
      };
      items.push(newUser);
      writeJSONStore('users.json', items);
      return newUser;
    },

    update: async (id: string, data: Partial<User>): Promise<User | null> => {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const doc = await UserModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
        return doc ? (doc as unknown as User) : null;
      }
      const items = readJSONStore<User>('users.json');
      const idx = items.findIndex(u => u._id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...data, updatedAt: now };
      writeJSONStore('users.json', items);
      return items[idx];
    },

    delete: async (id: string): Promise<boolean> => {
      if (isMongoConnected) {
        const res = await UserModel.deleteOne({ _id: id });
        return res.deletedCount > 0;
      }
      const items = readJSONStore<User>('users.json');
      const filtered = items.filter(u => u._id !== id);
      const deleted = filtered.length < items.length;
      writeJSONStore('users.json', filtered);
      return deleted;
    }
  },

  novels: {
    find: async (query: any = {}): Promise<Novel[]> => {
      if (isMongoConnected) {
        return (await NovelModel.find(query).lean()) as unknown as Novel[];
      }
      let items = readJSONStore<Novel>('novels.json');
      return items.filter(n => {
        for (const k in query) {
          if (query[k] !== undefined && n[k as keyof Novel] !== query[k]) return false;
        }
        return true;
      });
    },

    findOne: async (query: any): Promise<Novel | null> => {
      if (isMongoConnected) {
        const doc = await NovelModel.findOne(query).lean();
        return doc ? (doc as unknown as Novel) : null;
      }
      const items = readJSONStore<Novel>('novels.json');
      const found = items.find(n => {
        for (const k in query) {
          if (n[k as keyof Novel] !== query[k]) return false;
        }
        return true;
      });
      return found || null;
    },

    findById: async (id: string): Promise<Novel | null> => {
      if (isMongoConnected) {
        const doc = await NovelModel.findById(id).lean();
        return doc ? (doc as unknown as Novel) : null;
      }
      const items = readJSONStore<Novel>('novels.json');
      return items.find(n => n._id === id) || null;
    },

    create: async (data: Partial<Novel>): Promise<Novel> => {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const doc = await NovelModel.create({
          _id: data._id || 'n_' + Math.random().toString(36).substring(2, 11),
          ...data
        });
        return doc.toObject() as unknown as Novel;
      }
      const items = readJSONStore<Novel>('novels.json');
      const newNovel: Novel = {
        _id: 'n_' + Math.random().toString(36).substring(2, 11),
        title: data.title || '',
        slug: data.slug || '',
        author: data.author || '',
        category: data.category || '',
        shortSummary: data.shortSummary || '',
        description: data.description || '',
        coverImageUrl: data.coverImageUrl || '',
        coverImagePublicId: data.coverImagePublicId,
        tags: data.tags || [],
        novelStatus: data.novelStatus || NovelStatus.ONGOING,
        publishStatus: data.publishStatus || PublishStatus.DRAFT,
        totalViews: data.totalViews || 0,
        createdAt: now,
        updatedAt: now,
      };
      items.push(newNovel);
      writeJSONStore('novels.json', items);
      return newNovel;
    },

    update: async (id: string, data: Partial<Novel>): Promise<Novel | null> => {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const doc = await NovelModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
        return doc ? (doc as unknown as Novel) : null;
      }
      const items = readJSONStore<Novel>('novels.json');
      const idx = items.findIndex(n => n._id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...data, updatedAt: now };
      writeJSONStore('novels.json', items);
      return items[idx];
    },

    delete: async (id: string): Promise<boolean> => {
      if (isMongoConnected) {
        const res = await NovelModel.deleteOne({ _id: id });
        return res.deletedCount > 0;
      }
      const items = readJSONStore<Novel>('novels.json');
      const filtered = items.filter(n => n._id !== id);
      const deleted = filtered.length < items.length;
      writeJSONStore('novels.json', filtered);
      return deleted;
    },

    incrementViews: async (id: string): Promise<Novel | null> => {
      if (isMongoConnected) {
        const doc = await NovelModel.findByIdAndUpdate(id, { $inc: { totalViews: 1 } }, { new: true }).lean();
        return doc ? (doc as unknown as Novel) : null;
      }
      const items = readJSONStore<Novel>('novels.json');
      const idx = items.findIndex(n => n._id === id);
      if (idx === -1) return null;
      items[idx].totalViews = (items[idx].totalViews || 0) + 1;
      writeJSONStore('novels.json', items);
      return items[idx];
    }
  },

  chapters: {
    find: async (query: any = {}): Promise<Chapter[]> => {
      if (isMongoConnected) {
        return (await ChapterModel.find(query).lean()) as unknown as Chapter[];
      }
      let items = readJSONStore<Chapter>('chapters.json');
      return items.filter(c => {
        for (const k in query) {
          if (query[k] !== undefined && c[k as keyof Chapter] !== query[k]) return false;
        }
        return true;
      });
    },

    findOne: async (query: any): Promise<Chapter | null> => {
      if (isMongoConnected) {
        const doc = await ChapterModel.findOne(query).lean();
        return doc ? (doc as unknown as Chapter) : null;
      }
      const items = readJSONStore<Chapter>('chapters.json');
      const found = items.find(c => {
        for (const k in query) {
          if (c[k as keyof Chapter] !== query[k]) return false;
        }
        return true;
      });
      return found || null;
    },

    findById: async (id: string): Promise<Chapter | null> => {
      if (isMongoConnected) {
        const doc = await ChapterModel.findById(id).lean();
        return doc ? (doc as unknown as Chapter) : null;
      }
      const items = readJSONStore<Chapter>('chapters.json');
      return items.find(c => c._id === id) || null;
    },

    create: async (data: Partial<Chapter>): Promise<Chapter> => {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const doc = await ChapterModel.create({
          _id: data._id || 'c_' + Math.random().toString(36).substring(2, 11),
          ...data
        });
        return doc.toObject() as unknown as Chapter;
      }
      const items = readJSONStore<Chapter>('chapters.json');
      
      // Enforce Compound unique constraint: novelId + chapterNumber
      const dup = items.find(c => c.novelId === data.novelId && c.chapterNumber === data.chapterNumber);
      if (dup) {
        throw new Error(`Chapter number ${data.chapterNumber} already exists in this novel!`);
      }

      const newChapter: Chapter = {
        _id: 'c_' + Math.random().toString(36).substring(2, 11),
        novelId: data.novelId || '',
        chapterNumber: Number(data.chapterNumber) || 0,
        title: data.title || '',
        content: data.content || '',
        publishStatus: data.publishStatus || PublishStatus.DRAFT,
        publishedAt: data.publishStatus === PublishStatus.PUBLISHED ? now : undefined,
        views: data.views || 0,
        likedBy: data.likedBy || [],
        createdAt: now,
        updatedAt: now,
      };
      items.push(newChapter);
      writeJSONStore('chapters.json', items);
      return newChapter;
    },

    update: async (id: string, data: Partial<Chapter>): Promise<Chapter | null> => {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const doc = await ChapterModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
        return doc ? (doc as unknown as Chapter) : null;
      }
      const items = readJSONStore<Chapter>('chapters.json');
      const idx = items.findIndex(c => c._id === id);
      if (idx === -1) return null;

      // Compound Unique Check
      if (data.chapterNumber !== undefined && data.chapterNumber !== items[idx].chapterNumber) {
        const targetNovel = data.novelId || items[idx].novelId;
        const dup = items.find(c => c._id !== id && c.novelId === targetNovel && c.chapterNumber === data.chapterNumber);
        if (dup) {
          throw new Error(`Chapter number ${data.chapterNumber} already exists in this novel!`);
        }
      }

      const updateData: any = { ...data };
      if (data.publishStatus === PublishStatus.PUBLISHED && items[idx].publishStatus !== PublishStatus.PUBLISHED) {
        updateData.publishedAt = now;
      }

      items[idx] = { ...items[idx], ...updateData, updatedAt: now };
      writeJSONStore('chapters.json', items);
      return items[idx];
    },

    delete: async (id: string): Promise<boolean> => {
      if (isMongoConnected) {
        const res = await ChapterModel.deleteOne({ _id: id });
        return res.deletedCount > 0;
      }
      const items = readJSONStore<Chapter>('chapters.json');
      const filtered = items.filter(c => c._id !== id);
      const deleted = filtered.length < items.length;
      writeJSONStore('chapters.json', filtered);
      return deleted;
    },

    deleteManyByNovelId: async (novelId: string): Promise<number> => {
      if (isMongoConnected) {
        const res = await ChapterModel.deleteMany({ novelId });
        return res.deletedCount || 0;
      }
      const items = readJSONStore<Chapter>('chapters.json');
      const filtered = items.filter(c => c.novelId !== novelId);
      const deletedCount = items.length - filtered.length;
      writeJSONStore('chapters.json', filtered);
      return deletedCount;
    },

    incrementViews: async (id: string): Promise<Chapter | null> => {
      if (isMongoConnected) {
        const doc = await ChapterModel.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true }).lean();
        return doc ? (doc as unknown as Chapter) : null;
      }
      const items = readJSONStore<Chapter>('chapters.json');
      const idx = items.findIndex(c => c._id === id);
      if (idx === -1) return null;
      items[idx].views = (items[idx].views || 0) + 1;
      writeJSONStore('chapters.json', items);
      return items[idx];
    },

    toggleLike: async (id: string, userId: string, action: 'like' | 'unlike'): Promise<Chapter | null> => {
      if (isMongoConnected) {
        const update = action === 'like' 
          ? { $addToSet: { likedBy: userId } } 
          : { $pull: { likedBy: userId } };
        const doc = await ChapterModel.findByIdAndUpdate(id, update, { new: true }).lean();
        return doc ? (doc as unknown as Chapter) : null;
      }
      const items = readJSONStore<Chapter>('chapters.json');
      const idx = items.findIndex(c => c._id === id);
      if (idx === -1) return null;
      let liked = items[idx].likedBy || [];
      if (action === 'like') {
        if (!liked.includes(userId)) liked.push(userId);
      } else {
        liked = liked.filter(uid => uid !== userId);
      }
      items[idx].likedBy = liked;
      writeJSONStore('chapters.json', items);
      return items[idx];
    }
  },

  bookmarks: {
    find: async (query: any = {}): Promise<Bookmark[]> => {
      if (isMongoConnected) {
        return (await BookmarkModel.find(query).lean()) as unknown as Bookmark[];
      }
      let items = readJSONStore<Bookmark>('bookmarks.json');
      return items.filter(b => {
        for (const k in query) {
          if (query[k] !== undefined && b[k as keyof Bookmark] !== query[k]) return false;
        }
        return true;
      });
    },

    findOne: async (query: any): Promise<Bookmark | null> => {
      if (isMongoConnected) {
        const doc = await BookmarkModel.findOne(query).lean();
        return doc ? (doc as unknown as Bookmark) : null;
      }
      const items = readJSONStore<Bookmark>('bookmarks.json');
      const found = items.find(b => {
        for (const k in query) {
          if (b[k as keyof Bookmark] !== query[k]) return false;
        }
        return true;
      });
      return found || null;
    },

    create: async (data: Partial<Bookmark>): Promise<Bookmark> => {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const doc = await BookmarkModel.create({
          _id: data._id || 'b_' + Math.random().toString(36).substring(2, 11),
          ...data
        });
        return doc.toObject() as unknown as Bookmark;
      }
      const items = readJSONStore<Bookmark>('bookmarks.json');
      
      // Enforce duplicate restriction
      const dup = items.find(b => b.userId === data.userId && b.chapterId === data.chapterId);
      if (dup) return dup;

      const newBookmark: Bookmark = {
        _id: 'b_' + Math.random().toString(36).substring(2, 11),
        userId: data.userId || '',
        novelId: data.novelId || '',
        chapterId: data.chapterId || '',
        createdAt: now,
      };
      items.push(newBookmark);
      writeJSONStore('bookmarks.json', items);
      return newBookmark;
    },

    delete: async (query: { userId: string; chapterId: string }): Promise<boolean> => {
      if (isMongoConnected) {
        const res = await BookmarkModel.deleteOne(query);
        return res.deletedCount > 0;
      }
      const items = readJSONStore<Bookmark>('bookmarks.json');
      const filtered = items.filter(b => !(b.userId === query.userId && b.chapterId === query.chapterId));
      const deleted = filtered.length < items.length;
      writeJSONStore('bookmarks.json', filtered);
      return deleted;
    },

    deleteManyByNovelId: async (novelId: string): Promise<number> => {
      if (isMongoConnected) {
        const res = await BookmarkModel.deleteMany({ novelId });
        return res.deletedCount || 0;
      }
      const items = readJSONStore<Bookmark>('bookmarks.json');
      const filtered = items.filter(b => b.novelId !== novelId);
      const deletedCount = items.length - filtered.length;
      writeJSONStore('bookmarks.json', filtered);
      return deletedCount;
    },

    deleteManyByUserId: async (userId: string): Promise<number> => {
      if (isMongoConnected) {
        const res = await BookmarkModel.deleteMany({ userId });
        return res.deletedCount || 0;
      }
      const items = readJSONStore<Bookmark>('bookmarks.json');
      const filtered = items.filter(b => b.userId !== userId);
      const deletedCount = items.length - filtered.length;
      writeJSONStore('bookmarks.json', filtered);
      return deletedCount;
    }
  },

  comments: {
    find: async (query: any = {}): Promise<Comment[]> => {
      if (isMongoConnected) {
        const docs = await CommentModel.find(query).sort({ createdAt: -1 }).lean();
        const comments = docs as unknown as Comment[];
        
        // Manual schema population modeling Mongoose `.populate()`
        const populated = [];
        for (const c of comments) {
          const userDoc = await UserModel.findById(c.userId).lean();
          const novelDoc = await NovelModel.findById(c.novelId).lean();
          const chapDoc = await ChapterModel.findById(c.chapterId).lean();
          populated.push({
            ...c,
            user: userDoc ? { _id: userDoc._id.toString(), name: userDoc.name, email: userDoc.email } : undefined,
            novel: novelDoc ? { _id: novelDoc._id.toString(), title: novelDoc.title } : undefined,
            chapter: chapDoc ? { _id: chapDoc._id.toString(), title: chapDoc.title, chapterNumber: chapDoc.chapterNumber } : undefined
          });
        }
        return populated;
      }

      // JSON Storage Population code
      let items = readJSONStore<Comment>('comments.json');
      const filtered = items.filter(c => {
        for (const k in query) {
          if (query[k] !== undefined && c[k as keyof Comment] !== query[k]) return false;
        }
        return true;
      });

      const users = readJSONStore<User>('users.json');
      const novels = readJSONStore<Novel>('novels.json');
      const chapters = readJSONStore<Chapter>('chapters.json');

      const result = filtered.map(c => {
        const user = users.find(u => u._id === c.userId);
        const novel = novels.find(n => n._id === c.novelId);
        const chapter = chapters.find(ch => ch._id === c.chapterId);
        return {
          ...c,
          user: user ? { _id: user._id, name: user.name, email: user.email } : undefined,
          novel: novel ? { _id: novel._id, title: novel.title } : undefined,
          chapter: chapter ? { _id: chapter._id, title: chapter.title, chapterNumber: chapter.chapterNumber } : undefined,
        };
      });

      // Sort newest comments first
      return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    findById: async (id: string): Promise<Comment | null> => {
      if (isMongoConnected) {
        const doc = await CommentModel.findById(id).lean();
        return doc ? (doc as unknown as Comment) : null;
      }
      const items = readJSONStore<Comment>('comments.json');
      return items.find(c => c._id === id) || null;
    },

    create: async (data: Partial<Comment>): Promise<Comment> => {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const doc = await CommentModel.create({
          _id: data._id || 'com_' + Math.random().toString(36).substring(2, 11),
          ...data
        });
        return doc.toObject() as unknown as Comment;
      }
      const items = readJSONStore<Comment>('comments.json');
      const newComment: Comment = {
        _id: 'com_' + Math.random().toString(36).substring(2, 11),
        userId: data.userId || '',
        novelId: data.novelId || '',
        chapterId: data.chapterId || '',
        content: data.content || '',
        status: data.status || CommentStatus.PENDING,
        createdAt: now,
        updatedAt: now,
      };
      items.push(newComment);
      writeJSONStore('comments.json', items);
      return newComment;
    },

    updateStatus: async (id: string, status: CommentStatus): Promise<Comment | null> => {
      const now = new Date().toISOString();
      if (isMongoConnected) {
        const doc = await CommentModel.findByIdAndUpdate(id, { $set: { status, updatedAt: now } }, { new: true }).lean();
        return doc ? (doc as unknown as Comment) : null;
      }
      const items = readJSONStore<Comment>('comments.json');
      const idx = items.findIndex(c => c._id === id);
      if (idx === -1) return null;
      items[idx].status = status;
      items[idx].updatedAt = now;
      writeJSONStore('comments.json', items);
      return items[idx];
    },

    delete: async (id: string): Promise<boolean> => {
      if (isMongoConnected) {
        const res = await CommentModel.deleteOne({ _id: id });
        return res.deletedCount > 0;
      }
      const items = readJSONStore<Comment>('comments.json');
      const filtered = items.filter(c => c._id !== id);
      const deleted = filtered.length < items.length;
      writeJSONStore('comments.json', filtered);
      return deleted;
    },

    deleteManyByNovelId: async (novelId: string): Promise<number> => {
      if (isMongoConnected) {
        const res = await CommentModel.deleteMany({ novelId });
        return res.deletedCount || 0;
      }
      const items = readJSONStore<Comment>('comments.json');
      const filtered = items.filter(c => c.novelId !== novelId);
      const deletedCount = items.length - filtered.length;
      writeJSONStore('comments.json', filtered);
      return deletedCount;
    },

    deleteManyByUserId: async (userId: string): Promise<number> => {
      if (isMongoConnected) {
        const res = await CommentModel.deleteMany({ userId });
        return res.deletedCount || 0;
      }
      const items = readJSONStore<Comment>('comments.json');
      const filtered = items.filter(c => c.userId !== userId);
      const deletedCount = items.length - filtered.length;
      writeJSONStore('comments.json', filtered);
      return deletedCount;
    }
  }
};
