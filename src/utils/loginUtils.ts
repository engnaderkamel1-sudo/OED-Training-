// src/utils/loginUtils.ts

export const getLoginMeta = (): { device: string; browser: string } => {
  const ua = navigator.userAgent;
  const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'Mobile' : 'Desktop';
  const browser = ua.includes('Chrome') && !ua.includes('Edg') ? 'Chrome'
    : ua.includes('Edg') ? 'Edge'
    : ua.includes('Firefox') ? 'Firefox'
    : ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari'
    : 'Other';
  return { device, browser };
};

// --- الدالة الجديدة اللي بتجيب المكان من الـ IP ---
export const getLocationFromIP = async (ip: string) => {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    return {
      city: data.city || 'Unknown',
      country: data.country_name || 'Unknown'
    };
  } catch (error) {
    return { city: 'Unknown', country: 'Unknown' };
  }
};