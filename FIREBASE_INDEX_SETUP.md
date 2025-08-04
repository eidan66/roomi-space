# Firebase Index Setup Guide

## Problem
The Roomi Space application is getting a Firebase Firestore error:
```
FirebaseError: [code=failed-precondition]: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/roomi-space/firestore/indexes?create_composite=...
```

This happens because the app queries designs by `userId` and orders by `updatedAt`, which requires a composite index.

## Solution

### Option 1: Automatic Setup (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase in the project** (if not already done):
   ```bash
   firebase init firestore
   ```

4. **Deploy the indexes**:
   ```bash
   node deploy-firebase-indexes.js
   ```

### Option 2: Manual Setup

1. **Go to Firebase Console**:
   - Visit: https://console.firebase.google.com
   - Select your project: `roomi-space`

2. **Navigate to Firestore Indexes**:
   - Go to Firestore Database
   - Click on the "Indexes" tab

3. **Create Composite Index**:
   - Click "Create Index"
   - Collection ID: `designs`
   - Fields:
     - `userId` (Ascending)
     - `updatedAt` (Descending)
   - Click "Create"

4. **Wait for Index Creation**:
   - Index creation may take 1-5 minutes
   - You can monitor progress in the Firebase Console

## Verification

After setting up the index:

1. **Test the Gallery**:
   - Go to the Room Builder page
   - Click the "Gallery" button
   - The saved designs should load without errors

2. **Check Console**:
   - Open browser developer tools
   - Look for any remaining Firebase errors
   - The index error should be resolved

## Troubleshooting

### Index Still Not Working
- Wait a few more minutes for index creation to complete
- Check Firebase Console for index status
- Try refreshing the page

### Firebase CLI Issues
- Make sure you're logged in: `firebase login`
- Check project selection: `firebase projects:list`
- Set correct project: `firebase use roomi-space`

### Permission Issues
- Ensure you have admin access to the Firebase project
- Check Firestore security rules allow read/write access

## Index Configuration

The required index configuration is defined in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "designs",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "updatedAt",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

This index enables efficient querying of user designs ordered by update time. 