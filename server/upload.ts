/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// Configure directory for local fallback uploads
const PUBLIC_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(PUBLIC_UPLOAD_DIR)) {
  fs.mkdirSync(PUBLIC_UPLOAD_DIR, { recursive: true });
}

// Verify Cloudinary setup
let isCloudinaryConfigured = false;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (CLOUD_NAME && API_KEY && API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET
  });
  isCloudinaryConfigured = true;
  console.log('Cloudinary successfully configured for secure covers storage.');
} else {
  console.log('Cloudinary keys missing. Falling back to local static uploads relative to /public/uploads/.');
}

// Multer setup: Store in Memory first to handle either Local Disk or Cloudinary upload dynamically
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type! Only JPEG, JPG, PNG & WEBP image formats are supported.'), false);
  }
};

// Enforce max 5MB image upload
export const multerUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

/**
 * Handle Cover Image Upload
 * Returns { url: string, publicId?: string }
 */
export async function uploadCoverImage(file: Express.Multer.File): Promise<{ url: string; publicId?: string }> {
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'novel_threads_covers',
          resource_type: 'image',
          allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload stream error:', error);
            reject(new Error('Failed to upload image to Cloudinary: ' + error.message));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id
            });
          } else {
            reject(new Error('Unknown upload state in Cloudinary stream.'));
          }
        }
      );
      // Write buffer to stream
      uploadStream.end(file.buffer);
    });
  } else {
    // Falls back to direct local file writing in the development preview
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `cover_${Math.random().toString(36).substring(2, 11)}_${Date.now()}${ext}`;
    const targetPath = path.join(PUBLIC_UPLOAD_DIR, filename);

    fs.writeFileSync(targetPath, file.buffer);
    
    // Express serves /uploads/* from /public/uploads/ - mapped in server.ts
    const url = `/uploads/${filename}`;
    return {
      url,
      publicId: `local_${filename}`
    };
  }
}

/**
 * Handle Cover Image Deletion if replaced or novel deleted
 */
export async function deleteCoverImage(publicId: string): Promise<boolean> {
  if (!publicId) return false;
  
  if (isCloudinaryConfigured && !publicId.startsWith('local_')) {
    try {
      const res = await cloudinary.uploader.destroy(publicId);
      return res.result === 'ok';
    } catch (err) {
      console.error('Cloudinary Cover deletion error:', err);
      return false;
    }
  } else if (publicId.startsWith('local_')) {
    const filename = publicId.replace('local_', '');
    const targetPath = path.join(PUBLIC_UPLOAD_DIR, filename);
    try {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
        return true;
      }
    } catch (err) {
      console.error('Local cover removal error:', err);
    }
  }
  return false;
}
