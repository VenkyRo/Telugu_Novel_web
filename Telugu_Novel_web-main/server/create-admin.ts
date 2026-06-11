/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { db } from './db';
import { UserRole } from '../src/types';

// Load env variables
dotenv.config();

async function createAdmin() {
  console.log('--- Initializing Admin Creator Script ---');
  
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error('CRITICAL: Missing required environment variables:');
    console.error(`- ADMIN_NAME: ${name ? 'Loaded' : 'MISSING'}`);
    console.error(`- ADMIN_EMAIL: ${email ? 'Loaded' : 'MISSING'}`);
    console.error(`- ADMIN_PASSWORD: ${password ? 'Loaded' : 'MISSING'}`);
    process.exit(1);
  }

  const cleanEmail = email.toLowerCase().trim();

  // If MONGODB_URI is specified, wait for mongoose connection to establish
  if (process.env.MONGODB_URI) {
    console.log('Detected MONGODB_URI. Waiting for connection to establish...');
    let attempts = 0;
    while (mongoose.connection.readyState !== 1 && attempts < 80) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
    // Extra minor padding to allow db.ts then() handler to update isMongoConnected state
    await new Promise((resolve) => setTimeout(resolve, 200));
    console.log(`Connection state is: ${mongoose.connection.readyState} (1 = connected). Setup attempts: ${attempts}`);
  }

  try {
    const existing = await db.users.findOne({ email: cleanEmail });

    if (existing) {
      if (existing.role === UserRole.ADMIN) {
        console.log(`An Admin with email "${cleanEmail}" already exists inside records.`);
        console.log('Updating password based on ADMIN_PASSWORD environment variable...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await db.users.update(existing._id, { name, password: hashedPassword });
        console.log('Admin account credentials updated successfully.');
      } else {
        console.error(`ERROR: A standard user already exists with email "${cleanEmail}".`);
        console.error('Please use a different, unique email for administrative setup.');
        process.exit(1);
      }
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const admin = await db.users.create({
        name,
        email: cleanEmail,
        password: hashedPassword,
        role: UserRole.ADMIN,
        isBanned: false
      });

      console.log('SUCCESS: Admin Account created successfully!');
      console.log(`- ID: ${admin._id}`);
      console.log(`- Name: ${admin.name}`);
      console.log(`- Email: ${admin.email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('An unexpected error occurred during admin setup:', error);
    process.exit(1);
  }
}

createAdmin();
