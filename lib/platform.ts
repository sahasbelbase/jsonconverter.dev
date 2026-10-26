/**
 * Whether the visitor is on an Apple keyboard, so a shortcut hint shows the
 * right modifier: ⌘ on macOS/iOS, Ctrl everywhere else. The old hard-coded ⌘K
 * was wrong for every Windows and Linux user.
 *
 * `navigator.platform` is deprecated but still the most reliable signal in
 * today's browsers; the modern `userAgentData.platform` is used first when the
 * browser exposes it. The check is done once at module load.
 */
const detectMac = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const uaPlatform = (navigator as any).userAgentData?.platform as string | undefined;
  const platform = uaPlatform || navigator.platform || navigator.userAgent || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
};

export const isMac = detectMac();

/** The command-key symbol on a Mac, the word "Ctrl" otherwise. */
export const MOD_KEY = isMac ? '⌘' : 'Ctrl';

/** A ready-made label for the command palette shortcut, e.g. "⌘K" or "Ctrl K". */
export const COMMAND_PALETTE_HINT = isMac ? '⌘K' : 'Ctrl K';
