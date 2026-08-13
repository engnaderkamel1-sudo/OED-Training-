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

    const response = await admin.messaging().sendMulticast({
      tokens: validTokens,
      notification: payload.notification,
    });

    res.status(200).json({ 
      success: true, 
      successCount: response.successCount, 
      failureCount: response.failureCount 
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
