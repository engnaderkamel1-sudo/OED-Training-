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

export const getLocationFromTimezone = (): { city: string; country: string } => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let city = 'Unknown';
  let country = 'Unknown';

  if (timezone === 'Africa/Cairo') {
    city = 'Cairo';
    country = 'Egypt';
  } else if (timezone.startsWith('Europe/')) {
    city = 'Europe';
    country = 'Europe';
  } else if (timezone.startsWith('America/')) {
    city = 'Americas';
    country = 'Americas';
  }

  return { city, country };
};