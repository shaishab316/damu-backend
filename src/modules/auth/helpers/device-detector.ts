/**
 * Detect device type from User-Agent string
 */
export function detectDeviceType(userAgent?: string): string {
  if (!userAgent) return 'WEB';

  const ua = userAgent.toLowerCase();

  // Desktop OS
  if (ua.includes('windows')) return 'WINDOWS';
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'MACOS';
  if (ua.includes('linux') && !ua.includes('android')) return 'LINUX';

  // Mobile/Tablet
  if (ua.includes('ipad') || ua.includes('tablet')) return 'TABLET';
  if (
    ua.includes('mobile') ||
    ua.includes('iphone') ||
    ua.includes('android') ||
    ua.includes('webos')
  )
    return 'MOBILE';

  // Default to WEB if desktop
  if (
    ua.includes('mozilla') ||
    ua.includes('chrome') ||
    ua.includes('safari') ||
    ua.includes('firefox')
  )
    return 'WEB';

  return 'WEB';
}

/**
 * Extract device name from User-Agent or use provided name
 */
export function extractDeviceName(userAgent?: string): string {
  if (!userAgent) return 'Unknown Device';

  const ua = userAgent;

  // Try to extract device model
  const patterns = [
    /\(([^)]*iPhone[^)]*)\)/,
    /\(([^)]*iPad[^)]*)\)/,
    /\(([^)]*Android[^)]*)\)/,
  ];

  for (const pattern of patterns) {
    const match = ua.match(pattern);
    if (match) {
      return match[1].split(';')[0].trim();
    }
  }

  // Try browser name
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';

  return 'Unknown Device';
}
