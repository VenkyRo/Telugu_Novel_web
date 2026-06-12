/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { UserRole } from '../src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'novel_threads_jwt_default_secret_7d_token!123';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    isBanned: boolean;
    banReason?: string;
  };
}

// Generate JWT token
export function generateToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
}

// Middleware to protect routes & enforce dynamic DB check for banned users
export async function protect(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no session token provided.' });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    
    // Retrieve latest user from DB instead of relying only on JWT content
    const user = await db.users.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User belonging to this token no longer exists.' });
    }

    // Reject immediate request if banned
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        isBanned: true,
        message: `Your account has been banned. Reason: ${user.banReason || 'Administrative decision.'}`
      });
    }

    // Inject active user instance into request
    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isBanned: user.isBanned,
      banReason: user.banReason
    };
    
    next();
  } catch (error) {
    console.error('JWT Session Verification Error:', error);
    return res.status(401).json({ success: false, message: 'Not authorized, session token has expired or is invalid.' });
  }
}

// Middleware to restrict access to ADMIN only
export function adminOnly(req: AuthenticatedRequest, res: Response, next: NextFunction): any {
  if (req.user && req.user.role === UserRole.ADMIN) {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Access denied: Admin permissions are required.' });
  }
}

// Route Handlers
export const authController = {
  register: async (req: Request, res: Response): Promise<any> => {
    try {
      const { name, email, password, confirmPassword } = req.body;

      if (!name || !email || !password || !confirmPassword) {
        return res.status(400).json({ success: false, message: 'Please provide all registration fields.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match.' });
      }

      // Format clean email string
      const lowerEmail = email.toLowerCase().trim();

      // Check for duplicates
      const existingUser = await db.users.findOne({ email: lowerEmail });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Auto assign ADMIN role to first user, or based on email domain, or environment variables
      const items = await db.users.find();
      let role = UserRole.USER;
      
      const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@novelthreads.com').toLowerCase().trim();
      if (lowerEmail === ADMIN_EMAIL || items.length === 0) {
        role = UserRole.ADMIN;
      }

      const user = await db.users.create({
        name,
        email: lowerEmail,
        password: hashedPassword,
        role,
        isBanned: false,
      });

      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        message: 'Registration successful!',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      });
    } catch (error: any) {
      console.error('Registration Error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Server error occurred during registration.' });
    }
  },

  login: async (req: Request, res: Response): Promise<any> => {
    try {
      const { email, password } = req.body;

      console.log(`[SERVER-AUTH] Login attempt received for email: "${email}" (password length: ${password ? password.length : 0})`);

      if (!email || !password) {
        console.warn('[SERVER-AUTH] Login rejected: missing email or password.');
        return res.status(400).json({ success: false, message: 'Please enter your email and password.' });
      }

      const lowerEmail = email.toLowerCase().trim();
      console.log(`[SERVER-AUTH] Finding user in database with normalized email: "${lowerEmail}"`);

      const user = await db.users.findOne({ email: lowerEmail });
      if (!user) {
        console.warn(`[SERVER-AUTH] Login rejected: no user found with email matching "${lowerEmail}".`);
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      console.log(`[SERVER-AUTH] User found: _id="${user._id}", role="${user.role}", name="${user.name}". Proceeding to password verification.`);

      // Check password
      const isMatch = await bcrypt.compare(password, user.password || '');
      console.log(`[SERVER-AUTH] BCRYPT compare result: ${isMatch ? 'SUCCESS (MATCH)' : 'FAILURE (MISMATCH)'}`);
      
      if (!isMatch) {
        console.warn('[SERVER-AUTH] Login rejected: passwords do not match.');
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      // Check ban status
      if (user.isBanned) {
        console.warn(`[SERVER-AUTH] Login rejected: user _id="${user._id}" is banned. Reason: "${user.banReason}"`);
        return res.status(403).json({
          success: false,
          isBanned: true,
          message: `Your account has been banned. Reason: ${user.banReason || 'Administrative decision.'}`
        });
      }

      const token = generateToken(user._id);
      console.log(`[SERVER-AUTH] Login successful! Token generated for user _id="${user._id}".`);

      return res.status(200).json({
        success: true,
        message: 'Login successful!',
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      });
    } catch (error: any) {
      console.error('[SERVER-AUTH] Critical exception during login handling:', error);
      return res.status(500).json({ success: false, message: error.message || 'Server error occurred during login.' });
    }
  },

  me: async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      if (!req.user) {
        return res.status(404).json({ success: false, message: 'User profile not found.' });
      }
      return res.status(200).json({
        success: true,
        user: req.user
      });
    } catch (error: any) {
      console.error('Me Profile Error:', error);
      return res.status(500).json({ success: false, message: 'Server error retrieving current profile.' });
    }
  }
};
