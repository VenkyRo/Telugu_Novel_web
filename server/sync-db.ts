/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { db } from './db';

dotenv.config();

async function syncDatabase() {
  console.log('--- Initializing Database Synchronization (Telugu -> English) ---');

  if (!process.env.MONGODB_URI) {
    console.log('No MONGODB_URI detected in environment. Local JSON storage is already translated. Nothing to sync!');
    process.exit(0);
  }

  console.log('Detected MONGODB_URI. Establishing database connection...');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
  } catch (err: any) {
    console.error('Explicit connection attempt failed:', err.message || err);
  }

  let attempts = 0;
  while (mongoose.connection.readyState !== 1 && attempts < 80) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    attempts++;
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
  console.log(`MongoDB state: ${mongoose.connection.readyState} (1 = connected).`);

  if (mongoose.connection.readyState !== 1) {
    console.error('CRITICAL: Failed to connect to MongoDB Atlas for synchronization.');
    process.exit(1);
  }

  try {
    const DATA_DIR = path.join(process.cwd(), 'server', 'data');
    const novelsFile = path.join(DATA_DIR, 'novels.json');
    const chaptersFile = path.join(DATA_DIR, 'chapters.json');

    if (!fs.existsSync(novelsFile) || !fs.existsSync(chaptersFile)) {
      console.error('CRITICAL: Seed source JSON files are missing in server/data/.');
      process.exit(1);
    }

    const novelsList = JSON.parse(fs.readFileSync(novelsFile, 'utf-8'));
    const chaptersList = JSON.parse(fs.readFileSync(chaptersFile, 'utf-8'));

    const usersFile = path.join(DATA_DIR, 'users.json');
    const bookmarksFile = path.join(DATA_DIR, 'bookmarks.json');
    const commentsFile = path.join(DATA_DIR, 'comments.json');

    const usersList = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf-8')) : [];
    const bookmarksList = fs.existsSync(bookmarksFile) ? JSON.parse(fs.readFileSync(bookmarksFile, 'utf-8')) : [];
    const commentsList = fs.existsSync(commentsFile) ? JSON.parse(fs.readFileSync(commentsFile, 'utf-8')) : [];

    console.log(`Found ${novelsList.length} English novels, ${chaptersList.length} chapters, ${usersList.length} users, ${bookmarksList.length} bookmarks, and ${commentsList.length} comments to sync.`);

    // Access raw mongo collections to permit dropping and custom _id mapping
    const dbInstance = mongoose.connection.db;
    if (!dbInstance) {
      throw new Error('Database instance is undefined on connected mongoose client.');
    }

    // 1. Synchronize Users
    console.log('Dropping existing "users" collection from MongoDB...');
    try {
      await dbInstance.collection('users').drop();
      console.log('Successfully cleared old users.');
    } catch (e: any) {
      console.log('Users collection empty or not found, proceed directly...');
    }

    if (usersList.length > 0) {
      const usersToInsert = usersList.map((u: any) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        isBanned: u.isBanned || false,
        banReason: u.banReason,
        bannedAt: u.bannedAt,
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
        updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date()
      }));
      await dbInstance.collection('users').insertMany(usersToInsert);
      console.log(`Successfully imported ${usersToInsert.length} users to MongoDB!`);
    }

    // 2. Synchronize Novels
    console.log('Dropping existing "novels" collection from MongoDB...');
    try {
      await dbInstance.collection('novels').drop();
      console.log('Successfully cleared old novels.');
    } catch (e: any) {
      console.log('Novels collection empty or not found, proceed directly...');
    }

    // Insert new translated novels list
    if (novelsList.length > 0) {
      const novelsToInsert = novelsList.map((n: any) => ({
        _id: n._id,
        title: n.title,
        slug: n.slug,
        author: n.author,
        category: n.category,
        shortSummary: n.shortSummary,
        description: n.description,
        coverImageUrl: n.coverImageUrl,
        coverImagePublicId: n.coverImagePublicId,
        tags: n.tags,
        novelStatus: n.novelStatus,
        publishStatus: n.publishStatus,
        totalViews: n.totalViews || 0,
        createdAt: new Date(n.createdAt),
        updatedAt: new Date(n.updatedAt)
      }));
      await dbInstance.collection('novels').insertMany(novelsToInsert);
      console.log(`Successfully imported ${novelsToInsert.length} English novels to MongoDB!`);
    }

    // 2. Synchronize Chapters
    console.log('Dropping existing "chapters" collection from MongoDB...');
    try {
      await dbInstance.collection('chapters').drop();
      console.log('Successfully cleared old chapters.');
    } catch (e: any) {
      console.log('Chapters collection empty or not found, proceed directly...');
    }

    // Insert new translated chapters list
    if (chaptersList.length > 0) {
      const chaptersToInsert = chaptersList.map((c: any) => ({
        _id: c._id,
        novelId: c.novelId,
        chapterNumber: c.chapterNumber,
        title: c.title,
        content: c.content,
        publishStatus: c.publishStatus,
        publishedAt: c.publishedAt ? new Date(c.publishedAt) : undefined,
        views: c.views || 0,
        likedBy: c.likedBy || [],
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt)
      }));
      await dbInstance.collection('chapters').insertMany(chaptersToInsert);
      console.log(`Successfully imported ${chaptersToInsert.length} English chapters to MongoDB!`);
    }

    // 4. Synchronize Bookmarks
    console.log('Dropping existing "bookmarks" collection from MongoDB...');
    try {
      await dbInstance.collection('bookmarks').drop();
      console.log('Successfully cleared old bookmarks.');
    } catch (e: any) {
      console.log('Bookmarks collection empty or not found, proceed directly...');
    }

    if (bookmarksList.length > 0) {
      const bookmarksToInsert = bookmarksList.map((b: any) => ({
        _id: b._id,
        userId: b.userId,
        novelId: b.novelId,
        chapterId: b.chapterId,
        createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
        updatedAt: b.updatedAt ? new Date(b.updatedAt) : new Date()
      }));
      await dbInstance.collection('bookmarks').insertMany(bookmarksToInsert);
      console.log(`Successfully imported ${bookmarksToInsert.length} bookmarks to MongoDB!`);
    }

    // 5. Synchronize Comments
    console.log('Dropping existing "comments" collection from MongoDB...');
    try {
      await dbInstance.collection('comments').drop();
      console.log('Successfully cleared old comments.');
    } catch (e: any) {
      console.log('Comments collection empty or not found, proceed directly...');
    }

    if (commentsList.length > 0) {
      const commentsToInsert = commentsList.map((c: any) => ({
        _id: c._id,
        userId: c.userId,
        novelId: c.novelId,
        chapterId: c.chapterId,
        content: c.content,
        status: c.status,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date()
      }));
      await dbInstance.collection('comments').insertMany(commentsToInsert);
      console.log(`Successfully imported ${commentsToInsert.length} comments to MongoDB!`);
    }

    console.log('--- DATABASE SYNC COMPLETED SUCCESSFULLY ---');
    process.exit(0);
  } catch (error) {
    console.error('An unexpected error occurred during database sync:', error);
    process.exit(1);
  }
}

syncDatabase();
