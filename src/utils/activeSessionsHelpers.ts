/**
 * Active Sessions Helpers
 * Утилиты для работы с активными сессиями
 */

/**
 * Parse user agent and extract device information
 */
export const getDeviceInfo = (userAgent: string): string => {
  if (!userAgent) return 'Неизвестное устройство';

  // Parse user agent to get device info
  // Check for custom app User-Agent format: "AppName/Version (Platform; DeviceName; OS Version)"
  const customAppMatch = userAgent.match(/\(([^;]+);\s*([^;]+);\s*([^)]+)\)/);
  if (customAppMatch) {
    const platform = customAppMatch[1].trim(); // iPhone, iPad, or Android
    const deviceName = customAppMatch[2].trim();
    return `${platform} (${deviceName})`;
  }

  // Fallback to standard browser User-Agent parsing
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('Macintosh')) return 'Mac';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Linux')) return 'Linux';
  return 'Неизвестное устройство';
};

/**
 * Get appropriate icon name based on device type
 */
export const getDeviceIcon = (userAgent: string): string => {
  const device = getDeviceInfo(userAgent);
  if (device.includes('iPhone') || device.includes('iPad')) return 'phone-portrait-outline';
  if (device.includes('Android')) return 'phone-portrait-outline';
  if (device.includes('Mac') || device.includes('Windows') || device.includes('Linux')) return 'laptop-outline';
  return 'help-circle-outline';
};

/**
 * Check if session is current based on session ID
 */
export const isCurrentSession = (sessionId: string, currentSessionId: string | null): boolean => {
  return sessionId === currentSessionId;
};

/**
 * Count sessions other than current
 */
export const getOtherSessionsCount = (
  sessions: Array<{ session_id: string }>,
  currentSessionId: string | null
): number => {
  return sessions.filter((s) => s.session_id !== currentSessionId).length;
};

/**
 * Get plural form for Russian word "устройство"
 */
export const getDeviceCountText = (count: number): string => {
  if (count === 1) return 'устройство';
  if (count >= 2 && count <= 4) return 'устройства';
  return 'устройств';
};
