
/**
 * Checks if the current interaction is likely from a bot.
 * @param honeypotValue The value of the hidden honeypot field (should be empty).
 * @param mountTime The timestamp when the component mounted.
 * @param actionKey A unique key for rate limiting (e.g., 'convert_json').
 * @param limit Max requests allowed in the window.
 * @param windowMs Time window in milliseconds.
 */
export const checkBotAndRateLimit = (
  honeypotValue: string,
  mountTime: number,
  actionKey: string,
  limit: number = 20,
  windowMs: number = 60000
): { blocked: boolean; reason?: 'honeypot' | 'fast' | 'automation' | 'rate_limit' } => {
  
  // 1. Honeypot Check: Humans won't fill this invisible field
  if (honeypotValue) {
    console.warn("Bot detected: Honeypot filled");
    return { blocked: true, reason: 'honeypot' };
  }

  // 2. Speed Check: Interaction too fast after mount (e.g., < 300ms)
  if (Date.now() - mountTime < 300) {
    console.warn("Bot detected: Interaction too fast");
    return { blocked: true, reason: 'fast' };
  }

  // 3. Automation Flag Check (Basic WebDriver detection)
  if (typeof navigator !== 'undefined' && (navigator as any).webdriver) {
    console.warn("Bot detected: WebDriver active");
    return { blocked: true, reason: 'automation' };
  }

  // 4. Rate Limiting (Client-side via LocalStorage)
  try {
    const key = `rl_${actionKey}`;
    const now = Date.now();
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Filter out timestamps older than the window
    const active = stored.filter((t: number) => now - t < windowMs);
    
    if (active.length >= limit) {
      return { blocked: true, reason: 'rate_limit' };
    }
    
    // Add current timestamp and save
    active.push(now);
    localStorage.setItem(key, JSON.stringify(active));
  } catch (e) {
    // If localStorage is disabled or full, we fail open (allow request) to not break UX
    console.error("Rate limit check failed", e);
  }

  return { blocked: false };
};
