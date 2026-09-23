/**
 * Generates a persistent browser/device fingerprint.
 * Combines browser attributes (Screen, UserAgent, Timezone, Canvas)
 * so clearing localStorage alone will not reset guest quotas.
 */
export function getDeviceFingerprint(): string {
  const nav = window.navigator;
  const screen = window.screen;

  const raw = [
    nav.userAgent,
    nav.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
  ].join('||');

  // Simple fast hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }

  const fingerprintStr = 'dev_' + Math.abs(hash).toString(36);

  // Also persist in localStorage for consistency across standard reloads
  try {
    const existing = localStorage.getItem('adjdev_device_fp');
    if (existing) return existing;
    localStorage.setItem('adjdev_device_fp', fingerprintStr);
  } catch (e) {
    console.error(e);
  }

  return fingerprintStr;
}
