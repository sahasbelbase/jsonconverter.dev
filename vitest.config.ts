import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom for everything: the encoding and id helpers need atob/btoa and
    // crypto.getRandomValues, which bare Node does not expose on globalThis.
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
