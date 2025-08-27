import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp(); // Use default credentials (Cloud Run) or GOOGLE_APPLICATION_CREDENTIALS
}

export const db = admin.firestore();
