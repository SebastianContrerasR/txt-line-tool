import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The core modules are pure JavaScript: no DOM and no network required.
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
  },
});