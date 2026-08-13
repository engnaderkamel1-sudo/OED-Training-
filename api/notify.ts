import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID?.trim(),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim(),
        // Replace escaped newlines for Vercel env vars
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')?.trim(),
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { title, body, targetTokens } = req.body;

    if (!targetTokens || !Array.isArray(targetTokens) || targetTokens.length === 0) {
      return res.status(400).json({ message: 'No target tokens provided' });
    }

    const payload = {
      notification: {
        title: title || 'تنبيه من منصة OED',
        body: body || 'لديك إشعار جديد',
      },
    };

    // Filter out invalid or empty tokens
    const validTokens = targetTokens.filter(t => typeof t === 'string' && t.length > 10);
    
    if (validTokens.length === 0) {
      return res.status(400).json({ message: 'No valid tokens found' });
    }

    const payload = {
      notification: {
        title,
        body,
      },
      tokens: targetTokens,
    };
    const response = await admin.messaging().sendEachForMulticast(payload);
    
    if (response.failureCount > 0) {
      console.log('Failed to send to some tokens:', response.responses);
    }

    return res.status(200).json({ success: true, response });
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Unknown error',
      debug: process.env.FIREBASE_PROJECT_ID || 'MISSING_PROJECT_ID'
    });
  }
}
