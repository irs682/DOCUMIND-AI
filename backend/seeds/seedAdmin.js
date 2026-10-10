const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const ADMIN_NAME = process.env.ADMIN_NAME || 'DocuMind Administrator';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@documind.ai').toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

const DEMO_USER_NAME = 'Demo User';
const DEMO_USER_EMAIL = 'user@documind.ai';
const DEMO_USER_PASSWORD = 'password123';

const seedAdmin = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-ai';
  console.log('\n=============================================');
  console.log('🌱 DOCUMIND-AI: Database Seeder for Admin');
  console.log('=============================================');
  console.log(`Connecting to MongoDB at: ${mongoUri}...`);

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB successfully.');
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    console.error('\nPlease verify that your MongoDB service is running, or check MONGODB_URI in backend/.env.');
    process.exit(1);
  }

  try {
    // 1. Seed or Update Admin User
    console.log(`\n🔍 Checking for existing admin (${ADMIN_EMAIL})...`);
    let admin = await User.findOne({ email: ADMIN_EMAIL });

    if (admin) {
      console.log(`ℹ️ Admin user already exists (ID: ${admin._id}). Updating admin privileges...`);
      admin.name = ADMIN_NAME;
      admin.role = 'admin';
      admin.status = 'active';
      admin.isActive = true;
      admin.password = ADMIN_PASSWORD; // Will be hashed by pre-save hook
      await admin.save();
      console.log('✅ Admin user updated successfully.');
    } else {
      console.log(`➕ Creating new Admin user (${ADMIN_EMAIL})...`);
      admin = await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
        status: 'active',
        isActive: true,
      });
      console.log(`✅ Admin user created successfully (ID: ${admin._id}).`);
    }

    // 2. Also ensure standard demo user exists for role testing
    console.log(`\n🔍 Checking for standard demo user (${DEMO_USER_EMAIL})...`);
    let demoUser = await User.findOne({ email: DEMO_USER_EMAIL });

    if (demoUser) {
      demoUser.role = 'user';
      demoUser.status = 'active';
      demoUser.isActive = true;
      demoUser.password = DEMO_USER_PASSWORD;
      await demoUser.save();
      console.log(`✅ Demo user verified/updated (ID: ${demoUser._id}).`);
    } else {
      demoUser = await User.create({
        name: DEMO_USER_NAME,
        email: DEMO_USER_EMAIL,
        password: DEMO_USER_PASSWORD,
        role: 'user',
        status: 'active',
        isActive: true,
      });
      console.log(`✅ Demo user created successfully (ID: ${demoUser._id}).`);
    }

    console.log('\n=============================================');
    console.log('🎉 Admin Seed Completed Successfully!');
    console.log('=============================================');
    console.log('Admin Credentials:');
    console.log(`  • Email:    ${ADMIN_EMAIL}`);
    console.log(`  • Password: ${ADMIN_PASSWORD}`);
    console.log(`  • Role:     admin`);
    console.log('---------------------------------------------');
    console.log('Regular Demo User Credentials:');
    console.log(`  • Email:    ${DEMO_USER_EMAIL}`);
    console.log(`  • Password: ${DEMO_USER_PASSWORD}`);
    console.log(`  • Role:     user`);
    console.log('=============================================\n');

  } catch (error) {
    console.error('❌ Error during admin seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.\n');
    process.exit(0);
  }
};

seedAdmin();
