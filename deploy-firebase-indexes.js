#!/usr/bin/env node

/**
 * Firebase Firestore Indexes Deployment Script
 * 
 * This script deploys the required indexes for the Roomi Space application.
 * Run this script after setting up Firebase CLI and authenticating.
 * 
 * Usage:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Login: firebase login
 * 3. Initialize project: firebase init firestore
 * 4. Run this script: node deploy-firebase-indexes.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Firebase Firestore indexes...');

try {
  // Check if firebase CLI is installed
  try {
    execSync('firebase --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Firebase CLI not found. Please install it first:');
    console.error('   npm install -g firebase-tools');
    process.exit(1);
  }

  // Check if firestore.indexes.json exists
  const indexPath = path.join(__dirname, 'firestore.indexes.json');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ firestore.indexes.json not found');
    process.exit(1);
  }

  // Deploy indexes
  console.log('📦 Deploying indexes...');
  execSync('firebase deploy --only firestore:indexes', { 
    stdio: 'inherit',
    cwd: __dirname 
  });

  console.log('✅ Firebase indexes deployed successfully!');
  console.log('📝 Note: Index creation may take a few minutes to complete.');
  console.log('   You can monitor progress in the Firebase Console.');

} catch (error) {
  console.error('❌ Failed to deploy Firebase indexes:', error.message);
  console.log('\n📋 Manual setup instructions:');
  console.log('1. Go to Firebase Console: https://console.firebase.google.com');
  console.log('2. Select your project: roomi-space');
  console.log('3. Go to Firestore Database > Indexes');
  console.log('4. Click "Create Index"');
  console.log('5. Collection ID: designs');
  console.log('6. Fields: userId (Ascending), updatedAt (Descending)');
  console.log('7. Click "Create"');
  
  process.exit(1);
} 