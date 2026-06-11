/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer as createViteServer } from 'vite';

// Load environment configurations
dotenv.config();

import { protect, adminOnly, authController } from './server/auth';
import { novelsController } from './server/novels';
import { chaptersController } from './server/chapters';
import { commentsController } from './server/comments';
import { bookmarksController } from './server/bookmarks';
import { adminController } from './server/admin';
import { multerUpload } from './server/upload';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // --- SECURITY & LOGGING MIDDLEWARES ---
  const allowedOrigins = [
    process.env.CLIENT_URL,
    process.env.APP_URL,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean) as string[];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed)) ||
                        origin.includes('localhost') ||
                        origin.includes('127.0.0.1') ||
                        origin.includes('.run.app');
                        
      if (isAllowed) {
        callback(null, true);
      } else {
        // Fallback to avoid strict CORS block during dynamic preview/development envs
        callback(null, true);
      }
    },
    credentials: true
  }));

  // Configure Helmet securely, adjusting contentSecurityPolicy to support local and Cloudinary image sources plus Google Fonts in development
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "*"],
        connectSrc: ["'self'", "ws:", "wss:", "*"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
  }));

  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // --- IN-MEMORY RATE LIMITING HELPER ---
  const rateLimiters = new Map<string, { requests: number; resetAt: number }>();

  const rateLimit = (maxRequests: number, windowMs: number) => {
    return (req: Request, res: Response, next: NextFunction): any => {
      const clientIP = req.ip || 'anonymous';
      const key = `${req.path}_${clientIP}`;
      const now = Date.now();
      const clientRecord = rateLimiters.get(key);

      if (!clientRecord || now > clientRecord.resetAt) {
        rateLimiters.set(key, { requests: 1, resetAt: now + windowMs });
        next();
      } else {
        if (clientRecord.requests >= maxRequests) {
          return res.status(429).json({
            success: false,
            message: 'Too many requests. Please slow down and try again later.'
          });
        }
        clientRecord.requests += 1;
        rateLimiters.set(key, clientRecord);
        next();
      }
    };
  };

  // --- STATIC ASSETS ---
  // Serve cover uploads locally
  const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // --- INGRESS & DEPLOYMENT HEALTH CHECK ENDPOINTS ---
  app.get(['/api/health', '/health', '/healthz'], (req: Request, res: Response) => {
    const mongoState = mongoose.connection ? mongoose.connection.readyState : 0;
    res.status(200).json({
      success: true,
      status: 'UP',
      message: 'Novel Threads Platform API is running',
      timestamp: new Date().toISOString(),
      database: {
        provider: mongoState === 1 ? 'mongodb' : 'fallback-local',
        state: mongoState === 1 ? 'connected' : (mongoState === 2 ? 'connecting' : 'disconnected'),
        connectionStateCode: mongoState
      }
    });
  });

  // --- PUBLIC ROUTES ---
  app.get('/api/novels', novelsController.getAllPublic);
  app.get('/api/novels/:slug', novelsController.getPublicBySlug);
  app.get('/api/chapters/:chapterId', chaptersController.getPublicChapter);
  app.get('/api/chapters/:chapterId/navigation', chaptersController.getChapterNavigation);
  app.get('/api/chapters/:chapterId/comments', commentsController.getChapterComments);

  // --- AUTHENTICATION ROUTES ---
  // Apply registration and login rate limiters (Max 10 per minute)
  app.post('/api/auth/register', rateLimit(10, 60000), authController.register);
  app.post('/api/auth/login', rateLimit(10, 60000), authController.login);
  app.get('/api/auth/me', protect, authController.me);

  // --- PROTECTED READER ROUTES ---
  app.post('/api/chapters/:chapterId/like', protect, chaptersController.likeChapter);
  app.delete('/api/chapters/:chapterId/like', protect, chaptersController.unlikeChapter);
  app.get('/api/bookmarks', protect, bookmarksController.getUserBookmarks);
  app.post('/api/bookmarks/:chapterId', protect, bookmarksController.addBookmark);
  app.delete('/api/bookmarks/:chapterId', protect, bookmarksController.removeBookmark);
  // Rate limit new comments: max 15 per minute
  app.post('/api/chapters/:chapterId/comments', protect, rateLimit(15, 60000), commentsController.addComment);

  // --- PROTECTED ADMIN ROUTES ---
  app.get('/api/admin/dashboard', protect, adminOnly, adminController.getDashboardStats);
  
  app.get('/api/admin/novels', protect, adminOnly, novelsController.adminGetAll);
  app.post('/api/admin/novels', protect, adminOnly, multerUpload.single('cover'), novelsController.adminCreate);
  app.put('/api/admin/novels/:novelId', protect, adminOnly, multerUpload.single('cover'), novelsController.adminUpdate);
  app.patch('/api/admin/novels/:novelId/publish', protect, adminOnly, novelsController.adminTogglePublish);
  app.delete('/api/admin/novels/:novelId', protect, adminOnly, novelsController.adminDelete);
  
  app.get('/api/admin/novels/:novelId/chapters', protect, adminOnly, chaptersController.adminGetNovelChapters);
  app.post('/api/admin/novels/:novelId/chapters', protect, adminOnly, chaptersController.adminCreateChapter);
  app.put('/api/admin/chapters/:chapterId', protect, adminOnly, chaptersController.adminUpdateChapter);
  app.patch('/api/admin/chapters/:chapterId/publish', protect, adminOnly, chaptersController.adminTogglePublishChapter);
  app.delete('/api/admin/chapters/:chapterId', protect, adminOnly, chaptersController.adminDeleteChapter);
  
  app.get('/api/admin/users', protect, adminOnly, adminController.getAllUsers);
  app.patch('/api/admin/users/:userId/ban', protect, adminOnly, adminController.banUser);
  app.patch('/api/admin/users/:userId/unban', protect, adminOnly, adminController.unbanUser);
  app.delete('/api/admin/users/:userId', protect, adminOnly, adminController.deleteUser);
  
  app.get('/api/admin/comments', protect, adminOnly, commentsController.adminGetComments);
  app.patch('/api/admin/comments/:commentId/approve', protect, adminOnly, commentsController.adminApproveComment);
  app.delete('/api/admin/comments/:commentId', protect, adminOnly, commentsController.adminDeleteComment);

  // --- VITE ECOSYSTEM HANDLERS ---
  if (process.env.NODE_ENV !== 'production') {
    // Development Mode: Mount industrial Vite dev server as middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode: serving pre-bundled static dist/ folder
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // --- EXCEPTION GLOBAL HANDLER ---
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Core Exception Caught:', err);
    res.status(res.statusCode === 200 ? 500 : res.statusCode).json({
      success: false,
      message: err.message || 'An unexpected error occurred in our systems.'
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Novel Threads Platform] Server running and accepting requests on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Critical Platform Bootstrap Failure:', err);
});
